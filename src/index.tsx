import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Welding pass calculation API
app.post('/api/calculate-pass', async (c) => {
  try {
    const body = await c.req.json()
    const { insideAngle, outsideAngle, rootGap, thickness, weldingSpeed, dcCurrent, acCurrent, useInConfig } = body

    // Validate inputs
    if (!insideAngle || !outsideAngle || !rootGap || !thickness) {
      return c.json({ error: 'Please provide all required input values.' }, 400)
    }

    // Set default values
    const t = parseFloat(thickness) || 40
    const ws = parseFloat(weldingSpeed) || 90
    const ia = parseFloat(insideAngle)
    const oa = parseFloat(outsideAngle)
    const rg = parseFloat(rootGap)
    const dc = parseFloat(dcCurrent) || 1000
    const ac = parseFloat(acCurrent) || 900
    const useIn = useInConfig === true

    // Area calculation formulas extracted from Excel sheets
    // Each configuration (Inside Angle - Outside Angle - Root Face) has specific formulas
    const areaFormulas: Record<string, { inside: (t: number) => number; outside: (t: number) => number }> = {
      '60-60-6': {
        inside: (t) => (0.1443 * Math.pow(t, 2)) - (0.5783 * t) + 18.29,
        outside: (t) => (0.1443 * Math.pow(t, 2)) - (0.5783 * t) + 18.29
      },
      '60-60-8': {
        inside: (t) => (0.1443 * Math.pow(t, 2)) - (1.1556 * t) + 20.021,
        outside: (t) => (0.1443 * Math.pow(t, 2)) - (1.1556 * t) + 20.021
      },
      '60-65-5': {
        inside: (t) => (0.1593 * Math.pow(t, 2)) - (0.3175 * t) + 17.611,
        outside: (t) => (0.1443 * Math.pow(t, 2)) - (0.2901 * t) + 17.862
      },
      '60-65-6': {
        inside: (t) => (0.1593 * Math.pow(t, 2)) - (0.6392 * t) + 18.121,
        outside: (t) => (0.1443 * Math.pow(t, 2)) - (0.5783 * t) + 18.29
      },
      '60-70-3': {
        inside: (t) => (0.175 * Math.pow(t, 2)) - (0.3512 * t) + 17.355,
        outside: (t) => (0.1443 * Math.pow(t, 2)) - (0.288 * t) + 17.847
      },
      '60-70-4': {
        inside: (t) => (0.1751 * Math.pow(t, 2)) - (0.0001 * t) + 17.193,
        outside: (t) => (0.1443 * Math.pow(t, 2)) - (0.0009 * t) + 17.699
      },
      '60-70-5': {
        inside: (t) => (0.1751 * Math.pow(t, 2)) - (0.35 * t) + 17.374,
        outside: (t) => (0.1443 * Math.pow(t, 2)) - (0.2905 * t) + 17.866
      },
      '70-70-3': {
        inside: (t) => (0.175 * Math.pow(t, 2)) - (0.3512 * t) + 17.355,
        outside: (t) => (0.175 * Math.pow(t, 2)) - (0.3512 * t) + 17.355
      },
      '80-80-6': {
        inside: (t) => (0.2098 * Math.pow(t, 2)) - (0.8391 * t) + 17.483,
        outside: (t) => (0.2098 * Math.pow(t, 2)) - (0.8391 * t) + 17.483
      },
      '80-80-7': {
        inside: (t) => (0.2098 * Math.pow(t, 2)) - (1.2586 * t) + 18.532,
        outside: (t) => (0.2098 * Math.pow(t, 2)) - (1.2586 * t) + 18.532
      },
      '80-80-8': {
        inside: (t) => (0.2098 * Math.pow(t, 2)) - (1.6782 * t) + 20,
        outside: (t) => (0.2098 * Math.pow(t, 2)) - (1.6782 * t) + 20
      },
      '80-80-10': {
        inside: (t) => (0.2098 * Math.pow(t, 2)) - (2.5173 * t) + 24.195,
        outside: (t) => (0.2098 * Math.pow(t, 2)) - (2.5173 * t) + 24.195
      },
      '90-90-8': {
        inside: (t) => (0.25 * Math.pow(t, 2)) - (1.9994 * t) + 20.014,
        outside: (t) => (0.25 * Math.pow(t, 2)) - (1.9994 * t) + 20.014
      },
      '90-90-10': {
        inside: (t) => (0.2465 * Math.pow(t, 2)) - (2.5422 * t) + 12.418,
        outside: (t) => (0.2465 * Math.pow(t, 2)) - (2.5422 * t) + 12.418
      },
      // "(In)" series: Inside Area has Seal Area (15mm²) subtracted
      '60-70-3-in': {
        inside: (t) => (0.175 * Math.pow(t, 2)) - (0.3512 * t) + 17.355 - 15,
        outside: (t) => (0.1443 * Math.pow(t, 2)) - (0.288 * t) + 17.847
      },
      '60-70-4-in': {
        inside: (t) => (0.1751 * Math.pow(t, 2)) - (0.0001 * t) + 17.193 - 15,
        outside: (t) => (0.1443 * Math.pow(t, 2)) - (0.0009 * t) + 17.699
      },
      '70-70-3-in': {
        inside: (t) => (0.175 * Math.pow(t, 2)) - (0.3512 * t) + 17.355 - 15,
        outside: (t) => (0.175 * Math.pow(t, 2)) - (0.3512 * t) + 17.355
      }
    }

    // Find the best matching configuration
    const baseConfigKey = `${Math.round(ia)}-${Math.round(oa)}-${Math.round(rg)}`
    const configKey = useIn ? `${baseConfigKey}-in` : baseConfigKey
    let insideArea, outsideArea, matchedConfig = configKey

    if (areaFormulas[configKey]) {
      // Exact match found
      insideArea = areaFormulas[configKey].inside(t)
      outsideArea = areaFormulas[configKey].outside(t)
    } else {
      // Find nearest configuration
      let minDistance = Infinity
      let nearestKey = '80-80-8' // default

      for (const key of Object.keys(areaFormulas)) {
        // Skip (In) configurations if not requested, and vice versa
        const isInKey = key.endsWith('-in')
        if (isInKey !== useIn) continue

        const parts = key.split('-')
        const keyIa = parseInt(parts[0])
        const keyOa = parseInt(parts[1])
        const keyRg = parseInt(parts[2])
        
        const distance = Math.sqrt(
          Math.pow(ia - keyIa, 2) +
          Math.pow(oa - keyOa, 2) +
          Math.pow(rg - keyRg, 2)
        )
        
        if (distance < minDistance) {
          minDistance = distance
          nearestKey = key
        }
      }

      matchedConfig = `${nearestKey} (nearest to ${configKey})`
      insideArea = areaFormulas[nearestKey].inside(t)
      outsideArea = areaFormulas[nearestKey].outside(t)
    }

    // Wire melting rate calculations
    // DC melting rate formula from Lincoln Electric
    // Formula: MR = 0.000001 * I² + 0.0131 * I - 0.998
    const dcMeltingRate = (0.000001 * Math.pow(dc, 2)) + (0.0131 * dc) - 0.998

    // AC melting rate formula
    // Formula: MR = 0.000008 * I² + 0.0103 * I - 0.4557
    const acMeltingRate = (0.000008 * Math.pow(ac, 2)) + (0.0103 * ac) - 0.4557

    // Welding speed conversion: 1 cpm = 600 mm/h
    const weldingSpeedMmH = ws * 600

    // Wire melting rate per mm (g/mm)
    // MR (kg/h) * 1000 (g/kg) / speed (mm/h)
    const dcWmrPerMm = (dcMeltingRate * 1000) / weldingSpeedMmH
    const acWmrPerMm = (acMeltingRate * 1000) / weldingSpeedMmH

    // Specific gravity (g/mm³)
    const specificGravity = 0.00785 // g/mm³ (steel: 7.85 g/cm³)

    // Area per pass
    const dcAreaPerPass = dcWmrPerMm / specificGravity
    const acAreaPerPass = acWmrPerMm / specificGravity
    const tandemmAreaPerPass = (dcAreaPerPass + acAreaPerPass) * 1.15 // 15% tandem effect

    // Calculate required passes
    const insideRequiredPass = insideArea / tandemmAreaPerPass
    const outsideRequiredPass = outsideArea / tandemmAreaPerPass

    // Round up to get actual pass count
    const insidePassCount = Math.ceil(insideRequiredPass)
    const outsidePassCount = Math.ceil(outsideRequiredPass)
    const totalPassCount = insidePassCount + outsidePassCount

    const result = {
      input: {
        insideAngle: ia,
        outsideAngle: oa,
        rootGap: rg,
        thickness: t,
        weldingSpeed: ws,
        dcCurrent: dc,
        acCurrent: ac
      },
      calculated: {
        configuration: matchedConfig,
        insideArea: Math.round(insideArea * 100) / 100,
        outsideArea: Math.round(outsideArea * 100) / 100,
        dcMeltingRate: Math.round(dcMeltingRate * 100) / 100,
        acMeltingRate: Math.round(acMeltingRate * 100) / 100,
        areaPerPass: Math.round(tandemmAreaPerPass * 100) / 100,
        insideRequiredPass: Math.round(insideRequiredPass * 100) / 100,
        outsideRequiredPass: Math.round(outsideRequiredPass * 100) / 100,
        insidePassCount,
        outsidePassCount,
        totalPassCount
      }
    }

    return c.json(result)
  } catch (error) {
    return c.json({ error: 'An error occurred during calculation.' }, 500)
  }
})

// Main page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welding Pass Calculator</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen p-2 sm:p-4">
        <div class="max-w-6xl mx-auto py-4 sm:py-8">
            <!-- Header -->
            <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-800 mb-2 flex items-center gap-2 sm:gap-3">
                    <i class="fas fa-industry text-xl sm:text-3xl"></i>
                    <span class="leading-tight">Welding Pass Calculator</span>
                </h1>
                <p class="text-sm sm:text-base text-gray-600">Automatic welding pass calculation based on Lincoln Electric Powerwave</p>
            </div>

            <div class="grid lg:grid-cols-2 gap-4 sm:gap-6">
                <!-- Input Section -->
                <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                    <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                        <i class="fas fa-edit text-indigo-600"></i>
                        Input Parameters
                    </h2>
                    
                    <form id="weldingForm" class="space-y-3 sm:space-y-4">
                        <!-- Groove Angles -->
                        <div class="grid grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label class="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                    <i class="fas fa-angle-left text-indigo-500"></i>
                                    Inside (°)
                                </label>
                                <input type="number" id="insideAngle" value="80" 
                                    class="w-full px-3 py-3 sm:px-4 sm:py-2 text-base border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                    required min="0" max="90" step="1">
                            </div>
                            <div>
                                <label class="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                    <i class="fas fa-angle-right text-indigo-500"></i>
                                    Outside (°)
                                </label>
                                <input type="number" id="outsideAngle" value="80" 
                                    class="w-full px-3 py-3 sm:px-4 sm:py-2 text-base border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                    required min="0" max="90" step="1">
                            </div>
                        </div>

                        <!-- Root Face -->
                        <div>
                            <label class="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                <i class="fas fa-arrows-alt-h text-indigo-500"></i>
                                Root Face (mm)
                            </label>
                            <input type="number" id="rootGap" value="8" 
                                class="w-full px-3 py-3 sm:px-4 sm:py-2 text-base border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                required min="0" step="0.1">
                        </div>

                        <!-- (In) Configuration Toggle -->
                        <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 sm:p-4">
                            <label class="flex items-start gap-2 sm:gap-3 cursor-pointer">
                                <input type="checkbox" id="useInConfig" 
                                    class="w-5 h-5 mt-0.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 flex-shrink-0">
                                <div>
                                    <div class="text-sm sm:text-base font-semibold text-gray-800">
                                        <i class="fas fa-layer-group text-blue-600"></i>
                                        Use "(In)" Configuration
                                    </div>
                                    <div class="text-xs sm:text-sm text-gray-600">
                                        Subtracts Seal Area (15mm²)
                                    </div>
                                </div>
                            </label>
                        </div>

                        <!-- Thickness -->
                        <div>
                            <label class="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                <i class="fas fa-ruler-vertical text-indigo-500"></i>
                                Thickness (mm)
                            </label>
                            <input type="number" id="thickness" value="40" 
                                class="w-full px-3 py-3 sm:px-4 sm:py-2 text-base border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                required min="1" step="0.1">
                        </div>

                        <!-- Welding Speed -->
                        <div>
                            <label class="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                <i class="fas fa-tachometer-alt text-indigo-500"></i>
                                Welding Speed (cpm)
                            </label>
                            <input type="number" id="weldingSpeed" value="90" 
                                class="w-full px-3 py-3 sm:px-4 sm:py-2 text-base border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                required min="1" step="1">
                        </div>

                        <!-- Welding Currents -->
                        <div class="grid grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label class="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                    <i class="fas fa-bolt text-yellow-500"></i>
                                    DC (A)
                                </label>
                                <input type="number" id="dcCurrent" value="1000" 
                                    class="w-full px-3 py-3 sm:px-4 sm:py-2 text-base border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                    required min="500" max="1200" step="1">
                            </div>
                            <div>
                                <label class="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                                    <i class="fas fa-plug text-yellow-500"></i>
                                    AC (A)
                                </label>
                                <input type="number" id="acCurrent" value="900" 
                                    class="w-full px-3 py-3 sm:px-4 sm:py-2 text-base border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                    required min="500" max="1200" step="1">
                            </div>
                        </div>

                        <!-- Calculate Button -->
                        <button type="submit" 
                            class="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-4 sm:py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg text-base sm:text-lg">
                            <i class="fas fa-calculator"></i>
                            Calculate Pass
                        </button>
                    </form>
                </div>

                <!-- Results Section -->
                <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                    <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                        <i class="fas fa-chart-line text-green-600"></i>
                        Calculation Results
                    </h2>
                    
                    <div id="results" class="space-y-3 sm:space-y-4">
                        <div class="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                            <i class="fas fa-info-circle text-2xl sm:text-3xl mb-2"></i>
                            <p class="text-sm sm:text-base">Enter parameters and click Calculate Pass button.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Preset Configurations -->
            <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6 mt-4 sm:mt-6">
                <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                    <i class="fas fa-bookmark text-purple-600"></i>
                    Preset Configurations
                </h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
                    <button onclick="applyPreset(60, 60, 6, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        60-60-6
                    </button>
                    <button onclick="applyPreset(60, 60, 8, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        60-60-8
                    </button>
                    <button onclick="applyPreset(60, 65, 5, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        60-65-5
                    </button>
                    <button onclick="applyPreset(60, 65, 6, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        60-65-6
                    </button>
                    <button onclick="applyPreset(60, 70, 3, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        60-70-3
                    </button>
                    <button onclick="applyPreset(60, 70, 4, 31.4)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        60-70-4
                    </button>
                    <button onclick="applyPreset(60, 70, 5, 50)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        60-70-5
                    </button>
                    <button onclick="applyPreset(70, 70, 3, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        70-70-3
                    </button>
                    <button onclick="applyPreset(80, 80, 6, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        80-80-6
                    </button>
                    <button onclick="applyPreset(80, 80, 7, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        80-80-7
                    </button>
                    <button onclick="applyPreset(80, 80, 8, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        80-80-8
                    </button>
                    <button onclick="applyPreset(80, 80, 10, 50)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        80-80-10
                    </button>
                    <button onclick="applyPreset(90, 90, 8, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        90-90-8
                    </button>
                    <button onclick="applyPreset(90, 90, 10, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        90-90-10
                    </button>
                </div>
                
                <!-- (In) Series Presets -->
                <h3 class="text-base sm:text-lg font-bold text-gray-700 mt-3 sm:mt-4 mb-2 flex items-center gap-2">
                    <i class="fas fa-layer-group text-blue-600"></i>
                    <span>"(In)" Series</span>
                </h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    <button onclick="applyPreset(60, 70, 3, 40, true)" 
                        class="bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        60-70-3 (In)
                    </button>
                    <button onclick="applyPreset(60, 70, 4, 66, true)" 
                        class="bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        60-70-4 (In)
                    </button>
                    <button onclick="applyPreset(70, 70, 3, 40, true)" 
                        class="bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-800 font-semibold py-3 sm:py-2 px-3 sm:px-4 rounded-lg transition text-sm sm:text-base">
                        70-70-3 (In)
                    </button>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            // Apply preset configuration
            function applyPreset(inside, outside, gap, thickness, useIn = false) {
                document.getElementById('insideAngle').value = inside;
                document.getElementById('outsideAngle').value = outside;
                document.getElementById('rootGap').value = gap;
                document.getElementById('thickness').value = thickness;
                document.getElementById('useInConfig').checked = useIn;
            }

            // Form submission
            document.getElementById('weldingForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const data = {
                    insideAngle: parseFloat(document.getElementById('insideAngle').value),
                    outsideAngle: parseFloat(document.getElementById('outsideAngle').value),
                    rootGap: parseFloat(document.getElementById('rootGap').value),
                    thickness: parseFloat(document.getElementById('thickness').value),
                    weldingSpeed: parseFloat(document.getElementById('weldingSpeed').value),
                    dcCurrent: parseFloat(document.getElementById('dcCurrent').value),
                    acCurrent: parseFloat(document.getElementById('acCurrent').value),
                    useInConfig: document.getElementById('useInConfig').checked
                };

                try {
                    const response = await axios.post('/api/calculate-pass', data);
                    const result = response.data;

                    displayResults(result);
                } catch (error) {
                    console.error('Error:', error);
                    document.getElementById('results').innerHTML = \`
                        <div class="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-red-800">
                            <i class="fas fa-exclamation-triangle"></i>
                            An error occurred during calculation.
                        </div>
                    \`;
                }
            });

            function displayResults(result) {
                const calc = result.calculated;
                
                const html = \`
                    <!-- Main Pass Results -->
                    <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 sm:p-6 text-white">
                        <div class="text-center mb-3 sm:mb-4">
                            <div class="text-4xl sm:text-5xl font-bold mb-2">\${calc.totalPassCount}</div>
                            <div class="text-base sm:text-lg">Total Passes</div>
                        </div>
                        <div class="grid grid-cols-2 gap-3 sm:gap-4 text-center">
                            <div class="bg-white/20 rounded-lg p-3">
                                <div class="text-xl sm:text-2xl font-bold">\${calc.insidePassCount}</div>
                                <div class="text-xs sm:text-sm">Inside Pass</div>
                            </div>
                            <div class="bg-white/20 rounded-lg p-3">
                                <div class="text-xl sm:text-2xl font-bold">\${calc.outsidePassCount}</div>
                                <div class="text-xs sm:text-sm">Outside Pass</div>
                            </div>
                        </div>
                    </div>

                    <!-- Detailed Results -->
                    <div class="space-y-2 sm:space-y-3">
                        <div class="bg-indigo-50 rounded-lg p-3 sm:p-4">
                            <h3 class="text-sm sm:text-base font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                                <i class="fas fa-cog"></i> Configuration
                            </h3>
                            <div class="text-xs sm:text-sm">
                                <div class="break-words">Used: <span class="font-bold text-indigo-700">\${calc.configuration}</span></div>
                            </div>
                        </div>

                        <div class="bg-blue-50 rounded-lg p-3 sm:p-4">
                            <h3 class="text-sm sm:text-base font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                <i class="fas fa-expand-alt"></i> Welding Area
                            </h3>
                            <div class="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                                <div>Inside: <span class="font-bold">\${calc.insideArea} mm²</span></div>
                                <div>Outside: <span class="font-bold">\${calc.outsideArea} mm²</span></div>
                            </div>
                        </div>

                        <div class="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <h3 class="text-sm sm:text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <i class="fas fa-info-circle"></i> Technical Info
                            </h3>
                            <div class="space-y-1 text-xs sm:text-sm">
                                <div><span class="font-medium">DC:</span> <span class="font-bold">\${result.input.dcCurrent}A</span> → <span class="font-bold">\${calc.dcMeltingRate} kg/h</span></div>
                                <div><span class="font-medium">AC:</span> <span class="font-bold">\${result.input.acCurrent}A</span> → <span class="font-bold">\${calc.acMeltingRate} kg/h</span></div>
                                <div><span class="font-medium">Area/Pass:</span> <span class="font-bold">\${calc.areaPerPass} mm²</span></div>
                            </div>
                        </div>

                        <div class="bg-yellow-50 rounded-lg p-3 sm:p-4">
                            <h3 class="text-sm sm:text-base font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                                <i class="fas fa-calculator"></i> Pass Values
                            </h3>
                            <div class="space-y-1 text-xs sm:text-sm">
                                <div><span class="font-medium">Inside:</span> <span class="font-bold">\${calc.insideRequiredPass}</span> → <span class="text-base font-bold text-yellow-800">\${calc.insidePassCount} pass</span></div>
                                <div><span class="font-medium">Outside:</span> <span class="font-bold">\${calc.outsideRequiredPass}</span> → <span class="text-base font-bold text-yellow-800">\${calc.outsidePassCount} pass</span></div>
                            </div>
                        </div>
                    </div>
                \`;

                document.getElementById('results').innerHTML = html;
            }
        </script>
    </body>
    </html>
  `)
})

export default app
