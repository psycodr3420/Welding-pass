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
    const { insideAngle, outsideAngle, rootGap, thickness, weldingSpeed, dcCurrent, acCurrent } = body

    // Validate inputs
    if (!insideAngle || !outsideAngle || !rootGap || !thickness) {
      return c.json({ error: '모든 필수 입력값을 제공해주세요.' }, 400)
    }

    // Set default values
    const t = parseFloat(thickness) || 40
    const ws = parseFloat(weldingSpeed) || 90
    const ia = parseFloat(insideAngle)
    const oa = parseFloat(outsideAngle)
    const rg = parseFloat(rootGap)
    const dc = parseFloat(dcCurrent) || 1000
    const ac = parseFloat(acCurrent) || 900

    // Calculate Inside and Outside areas using the formula from Excel
    // Area formula: y = 0.2098x² - 1.6782x + 20 (where x is thickness)
    const calculateArea = (thickness: number, angle: number, gap: number) => {
      // Base area calculation
      const baseArea = (0.2098 * Math.pow(thickness, 2)) - (1.6782 * thickness) + 20
      
      // Adjust based on groove angle and root gap
      // The area increases with larger angles and root gaps
      const angleFactor = angle / 70 // Normalize to 70 degrees as base
      const gapFactor = gap / 5 // Normalize to 5mm as base
      
      return baseArea * angleFactor * gapFactor
    }

    const insideArea = calculateArea(t, ia, rg)
    const outsideArea = calculateArea(t, oa, rg)

    // Wire melting rate calculations
    // DC melting rate formula from Lincoln Electric
    // Formula: MR = 0.000001 * I² + 0.0131 * I - 0.998
    const dcMeltingRate = (0.000001 * Math.pow(dc, 2)) + (0.0131 * dc) - 0.998

    // AC melting rate formula
    // Formula: MR = 0.000008 * I² + 0.0103 * I - 0.4557
    const acMeltingRate = (0.000008 * Math.pow(ac, 2)) + (0.0103 * ac) - 0.4557

    // Welding speed in mm/h
    const weldingSpeedMmH = ws * 600

    // Wire melting rate per mm
    const dcWmrPerMm = dcMeltingRate / weldingSpeedMmH * 1000
    const acWmrPerMm = acMeltingRate / weldingSpeedMmH * 1000

    // Specific gravity
    const specificGravity = 7.85 / 1000 // g/mm³

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
    return c.json({ error: '계산 중 오류가 발생했습니다.' }, 500)
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
        <title>용접 Pass 계산기</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen p-4">
        <div class="max-w-6xl mx-auto py-8">
            <!-- Header -->
            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h1 class="text-4xl font-bold text-indigo-800 mb-2 flex items-center gap-3">
                    <i class="fas fa-industry"></i>
                    용접 Pass 계산기
                </h1>
                <p class="text-gray-600">Lincoln Electric Powerwave 기반 용접 pass 수 자동 계산</p>
            </div>

            <div class="grid md:grid-cols-2 gap-6">
                <!-- Input Section -->
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-edit text-indigo-600"></i>
                        입력 파라미터
                    </h2>
                    
                    <form id="weldingForm" class="space-y-4">
                        <!-- Groove Angles -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    <i class="fas fa-angle-left text-indigo-500"></i>
                                    Inside Angle (°)
                                </label>
                                <input type="number" id="insideAngle" value="80" 
                                    class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                    required min="0" max="90" step="1">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    <i class="fas fa-angle-right text-indigo-500"></i>
                                    Outside Angle (°)
                                </label>
                                <input type="number" id="outsideAngle" value="80" 
                                    class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                    required min="0" max="90" step="1">
                            </div>
                        </div>

                        <!-- Root Gap -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-arrows-alt-h text-indigo-500"></i>
                                Root Gap (mm)
                            </label>
                            <input type="number" id="rootGap" value="8" 
                                class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                required min="0" step="0.1">
                        </div>

                        <!-- Thickness -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-ruler-vertical text-indigo-500"></i>
                                두께 (mm)
                            </label>
                            <input type="number" id="thickness" value="40" 
                                class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                required min="1" step="0.1">
                        </div>

                        <!-- Welding Speed -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-tachometer-alt text-indigo-500"></i>
                                용접 속도 (cpm)
                            </label>
                            <input type="number" id="weldingSpeed" value="90" 
                                class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                required min="1" step="1">
                        </div>

                        <!-- Welding Currents -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    <i class="fas fa-bolt text-yellow-500"></i>
                                    DC 전류 (A)
                                </label>
                                <input type="number" id="dcCurrent" value="1000" 
                                    class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                    required min="500" max="1200" step="1">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    <i class="fas fa-plug text-yellow-500"></i>
                                    AC 전류 (A)
                                </label>
                                <input type="number" id="acCurrent" value="900" 
                                    class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                                    required min="500" max="1200" step="1">
                            </div>
                        </div>

                        <!-- Calculate Button -->
                        <button type="submit" 
                            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg">
                            <i class="fas fa-calculator"></i>
                            Pass 계산하기
                        </button>
                    </form>
                </div>

                <!-- Results Section -->
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-chart-line text-green-600"></i>
                        계산 결과
                    </h2>
                    
                    <div id="results" class="space-y-4">
                        <div class="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                            <i class="fas fa-info-circle text-3xl mb-2"></i>
                            <p>파라미터를 입력하고 계산하기 버튼을 클릭하세요.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Preset Configurations -->
            <div class="bg-white rounded-xl shadow-lg p-6 mt-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-bookmark text-purple-600"></i>
                    프리셋 설정
                </h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button onclick="applyPreset(80, 80, 8, 40)" 
                        class="bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold py-2 px-4 rounded-lg transition">
                        80-80-8
                    </button>
                    <button onclick="applyPreset(80, 80, 10, 50)" 
                        class="bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold py-2 px-4 rounded-lg transition">
                        80-80-10
                    </button>
                    <button onclick="applyPreset(60, 70, 5, 50)" 
                        class="bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold py-2 px-4 rounded-lg transition">
                        60-70-5
                    </button>
                    <button onclick="applyPreset(60, 70, 4, 31.4)" 
                        class="bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold py-2 px-4 rounded-lg transition">
                        60-70-4
                    </button>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            // Apply preset configuration
            function applyPreset(inside, outside, gap, thickness) {
                document.getElementById('insideAngle').value = inside;
                document.getElementById('outsideAngle').value = outside;
                document.getElementById('rootGap').value = gap;
                document.getElementById('thickness').value = thickness;
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
                    acCurrent: parseFloat(document.getElementById('acCurrent').value)
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
                            계산 중 오류가 발생했습니다.
                        </div>
                    \`;
                }
            });

            function displayResults(result) {
                const calc = result.calculated;
                
                const html = \`
                    <!-- Main Pass Results -->
                    <div class="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                        <div class="text-center mb-4">
                            <div class="text-5xl font-bold mb-2">\${calc.totalPassCount}</div>
                            <div class="text-lg">총 Pass 수</div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 text-center">
                            <div class="bg-white/20 rounded-lg p-3">
                                <div class="text-2xl font-bold">\${calc.insidePassCount}</div>
                                <div class="text-sm">Inside Pass</div>
                            </div>
                            <div class="bg-white/20 rounded-lg p-3">
                                <div class="text-2xl font-bold">\${calc.outsidePassCount}</div>
                                <div class="text-sm">Outside Pass</div>
                            </div>
                        </div>
                    </div>

                    <!-- Detailed Results -->
                    <div class="space-y-3">
                        <div class="bg-blue-50 rounded-lg p-4">
                            <h3 class="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                <i class="fas fa-expand-alt"></i> 용접 면적
                            </h3>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div>Inside: <span class="font-bold">\${calc.insideArea} mm²</span></div>
                                <div>Outside: <span class="font-bold">\${calc.outsideArea} mm²</span></div>
                            </div>
                        </div>

                        <div class="bg-gray-50 rounded-lg p-4">
                            <h3 class="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <i class="fas fa-info-circle"></i> 기술 정보
                            </h3>
                            <div class="space-y-1 text-sm">
                                <div>DC 전류: <span class="font-bold">\${result.input.dcCurrent} A</span> → 용융속도: <span class="font-bold">\${calc.dcMeltingRate} kg/h</span></div>
                                <div>AC 전류: <span class="font-bold">\${result.input.acCurrent} A</span> → 용융속도: <span class="font-bold">\${calc.acMeltingRate} kg/h</span></div>
                                <div>Pass당 면적: <span class="font-bold">\${calc.areaPerPass} mm²</span></div>
                            </div>
                        </div>

                        <div class="bg-yellow-50 rounded-lg p-4">
                            <h3 class="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                                <i class="fas fa-calculator"></i> 계산된 Pass 값
                            </h3>
                            <div class="space-y-1 text-sm">
                                <div>Inside: <span class="font-bold">\${calc.insideRequiredPass}</span> → \${calc.insidePassCount} pass</div>
                                <div>Outside: <span class="font-bold">\${calc.outsideRequiredPass}</span> → \${calc.outsidePassCount} pass</div>
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
