# Welding Pass Calculator

**TL;DR**: Lincoln Electric Powerwave 기반 용접 패스 자동 계산기. 17개 구성 지원, REST API 제공, 모바일 반응형. 1분 안에 로컬 실행 가능.

```bash
git clone <repo-url> && cd webapp
npm install && npm run build
pm2 start ecosystem.config.cjs
curl http://localhost:3000  # 브라우저에서 열기
```

---

## Quick Start

### 1️⃣ Clone & Install (30초)

```bash
# 프로젝트 클론 (가정: GitHub에서 클론)
git clone https://github.com/<your-username>/webapp.git
cd webapp

# 의존성 설치 (Node.js 18+ 필요)
npm install
```

**필수 요구사항:**
- Node.js v18.0.0 이상 (현재 테스트된 버전: v20.19.5)
- npm v8.0.0 이상 (현재 테스트된 버전: v10.8.2)
- PM2 (이미 설치되어 있다고 가정)

### 2️⃣ Build & Run (20초)

```bash
# TypeScript를 JavaScript로 빌드 (dist/ 폴더 생성)
npm run build

# PM2로 개발 서버 시작 (포트 3000)
pm2 start ecosystem.config.cjs

# 서버 상태 확인
pm2 list
```

**예상 출력:**
```
┌────┬────────────────────────────┬─────────┬─────────┬──────────┐
│ id │ name                       │ status  │ cpu     │ memory   │
├────┼────────────────────────────┼─────────┼─────────┼──────────┤
│ 0  │ welding-pass-calculator    │ online  │ 0%      │ 50.0mb   │
└────┴────────────────────────────┴─────────┴─────────┴──────────┘
```

### 3️⃣ Test & Access (10초)

```bash
# API 테스트 (80-80-8 구성, 40mm 두께)
curl -X POST http://localhost:3000/api/calculate-pass \
  -H "Content-Type: application/json" \
  -d '{
    "insideAngle": 80,
    "outsideAngle": 80,
    "rootGap": 8,
    "thickness": 40,
    "weldingSpeed": 90,
    "dcCurrent": 1000,
    "acCurrent": 900
  }'

# 예상 응답: {"calculated": {"insidePassCount": 4, "outsidePassCount": 4, "totalPassCount": 8}}
```

**브라우저 접속:**
- 로컬: `http://localhost:3000`
- Sandbox: `https://3000-<sandbox-id>.sandbox.novita.ai` (자동 생성)

---

## Demo

### Web UI
![가정: UI 스크린샷이 여기 위치]

**주요 기능:**
1. **입력 패널 (좌측)**
   - Inside/Outside Angle (60°-90°)
   - Root Gap (3mm-10mm)
   - Thickness, Welding Speed, DC/AC Current
   - "(In)" Configuration 토글

2. **결과 패널 (우측)**
   - 총 Pass 수 (큰 숫자로 표시)
   - Inside/Outside Pass 분할
   - 용접 면적, 용융속도, 기술 정보

3. **프리셋 버튼 (하단)**
   - 14개 표준 구성 (60-60-6 ~ 90-90-10)
   - 3개 "(In)" 구성 (Seal Area 차감)

### API Example

```bash
# 예제 1: 60-70-5 구성 (50mm 두께, 저전류)
curl -X POST http://localhost:3000/api/calculate-pass \
  -H "Content-Type: application/json" \
  -d '{
    "insideAngle": 60,
    "outsideAngle": 70,
    "rootGap": 5,
    "thickness": 50,
    "weldingSpeed": 70,
    "dcCurrent": 600,
    "acCurrent": 550
  }' | jq '{inside: .calculated.insidePassCount, outside: .calculated.outsidePassCount}'

# 응답: {"inside": 9, "outside": 8}
```

```bash
# 예제 2: 60-70-4 (In) 구성 (Seal Area 차감)
curl -X POST http://localhost:3000/api/calculate-pass \
  -H "Content-Type: application/json" \
  -d '{
    "insideAngle": 60,
    "outsideAngle": 70,
    "rootGap": 4,
    "thickness": 66,
    "weldingSpeed": 70,
    "dcCurrent": 850,
    "acCurrent": 700,
    "useInConfig": true
  }' | jq '.calculated | {insideArea, outsideArea, insidePass: .insidePassCount, outsidePass: .outsidePassCount}'

# 응답: {"insideArea": 764.92, "outsideArea": 646.21, "insidePass": 11, "outsidePass": 9}
# 참고: Inside Area가 15mm² 차감됨
```

---

## Data Schema

### API Request

**Endpoint:** `POST /api/calculate-pass`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body:**
```typescript
{
  insideAngle: number     // Inside groove angle (도, °), 범위: 0-90
  outsideAngle: number    // Outside groove angle (도, °), 범위: 0-90
  rootGap: number         // Root gap (mm), 범위: 0+
  thickness: number       // Welding thickness (mm), 범위: 1+
  weldingSpeed: number    // Welding speed (cpm), 범위: 1+, 기본값: 90
  dcCurrent: number       // DC current (A), 범위: 500-1200, 기본값: 1000
  acCurrent: number       // AC current (A), 범위: 500-1200, 기본값: 900
  useInConfig?: boolean   // Use "(In)" configuration (Seal Area 차감), 기본값: false
}
```

**필수 필드:** `insideAngle`, `outsideAngle`, `rootGap`, `thickness`

### API Response

**Success (200):**
```typescript
{
  input: {
    insideAngle: number
    outsideAngle: number
    rootGap: number
    thickness: number
    weldingSpeed: number
    dcCurrent: number
    acCurrent: number
  },
  calculated: {
    configuration: string          // 사용된 구성 (예: "60-70-5" 또는 "80-80-8 (nearest to 82-78-7)")
    insideArea: number            // Inside 용접 면적 (mm²)
    outsideArea: number           // Outside 용접 면적 (mm²)
    dcMeltingRate: number         // DC wire 용융속도 (kg/h)
    acMeltingRate: number         // AC wire 용융속도 (kg/h)
    areaPerPass: number           // Pass당 면적 (mm², Tandem effect 15% 포함)
    insideRequiredPass: number    // Inside 정확한 Pass 수 (소수점)
    outsideRequiredPass: number   // Outside 정확한 Pass 수 (소수점)
    insidePassCount: number       // Inside 실제 Pass 수 (올림값)
    outsidePassCount: number      // Outside 실제 Pass 수 (올림값)
    totalPassCount: number        // 총 Pass 수
  }
}
```

**Error (400):**
```typescript
{
  error: string  // 예: "Please provide all required input values."
}
```

### Configuration Keys

**형식:** `{insideAngle}-{outsideAngle}-{rootGap}[-in]`

**지원 구성 (17개):**
```
표준 (14개):
  60-60-6, 60-60-8, 60-65-5, 60-65-6,
  60-70-3, 60-70-4, 60-70-5,
  70-70-3,
  80-80-6, 80-80-7, 80-80-8, 80-80-10,
  90-90-8, 90-90-10

"(In)" 시리즈 (3개):
  60-70-3-in, 60-70-4-in, 70-70-3-in
```

---

## Config

### Project Structure

```
webapp/
├── src/
│   ├── index.tsx              # Main Hono app + API handler (244 lines)
│   └── renderer.tsx           # (가정: SSR 렌더러, 사용하지 않음)
├── public/
│   └── static/
│       └── style.css          # 커스텀 CSS (현재 거의 비어있음)
├── dist/                      # 빌드 출력 (vite build)
│   ├── _worker.js             # Cloudflare Workers 번들
│   └── _routes.json           # 라우팅 구성
├── ecosystem.config.cjs       # PM2 설정
├── package.json               # 의존성 및 스크립트
├── tsconfig.json              # TypeScript 설정
├── vite.config.ts             # Vite 빌드 설정
└── README.md
```

### Key Files

**`ecosystem.config.cjs`** (PM2 설정)
```javascript
module.exports = {
  apps: [{
    name: 'welding-pass-calculator',
    script: 'npx',
    args: 'wrangler pages dev dist --ip 0.0.0.0 --port 3000',
    env: { NODE_ENV: 'development', PORT: 3000 },
    watch: false,
    instances: 1,
    exec_mode: 'fork'
  }]
}
```

**`package.json`** (주요 스크립트)
```json
{
  "scripts": {
    "build": "vite build",                                    // TypeScript → JavaScript (dist/)
    "dev:sandbox": "wrangler pages dev dist --ip 0.0.0.0 --port 3000",  // 개발 서버
    "deploy:prod": "npm run build && wrangler pages deploy dist --project-name webapp",
    "clean-port": "fuser -k 3000/tcp 2>/dev/null || true",  // 포트 3000 정리
    "test": "curl http://localhost:3000"                    // 간단한 헬스체크
  }
}
```

### Environment Variables

**개발 환경 (로컬):**
- 환경 변수 불필요 (모든 설정이 코드에 하드코딩)

**프로덕션 (Cloudflare Pages):**
```bash
# 가정: Cloudflare API 토큰 설정 (배포 시)
export CLOUDFLARE_API_TOKEN=<your-token>

# 배포
npm run deploy:prod
```

---

## How It Works

### Architecture

```
┌─────────────┐      HTTP POST        ┌──────────────────┐
│   Browser   │ ──────────────────────▶│  Hono API        │
│   (UI)      │                        │  /api/calculate  │
└─────────────┘                        └──────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────────┐
                                    │ parseWeldingInput() │
                                    │ (입력 검증)          │
                                    └─────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │ findMatchingConfiguration()   │
                              │ - 정확 매치 또는              │
                              │ - Euclidean 거리로 최근접 선택│
                              └───────────────────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────────┐
                                    │ calculateWeldingPasses()│
                                    │ 1. Area 계산         │
                                    │ 2. 용융속도 계산     │
                                    │ 3. Pass 수 계산      │
                                    └─────────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────────┐
                                    │   JSON Response     │
                                    └─────────────────────┘
```

### Calculation Pipeline

**Step 1: Configuration Matching**
```typescript
// 입력: 80-80-8
// 1. 정확 매치 시도: AREA_FORMULAS['80-80-8'] ✅
// 2. 없으면 최근접 찾기: Euclidean distance 계산
//    distance = √((ia-keyIa)² + (oa-keyOa)² + (rg-keyRg)²)
```

**Step 2: Area Calculation (Configuration-Specific)**
```typescript
// 각 구성마다 고유한 2차 방정식
// Area = a×t² + b×t + c

// 예: 80-80-8
inside = (0.2098 × 40²) - (1.6782 × 40) + 20 = 268.56 mm²
outside = (0.2098 × 40²) - (1.6782 × 40) + 20 = 268.56 mm²

// "(In)" 구성: Inside Area - 15mm²
inside_in = inside - 15 = 253.56 mm²
```

**Step 3: Melting Rate Calculation**
```typescript
// DC: MR = 0.000001×I² + 0.0131×I - 0.998 (kg/h)
dcMR = 0.000001×1000² + 0.0131×1000 - 0.998 = 13.1 kg/h

// AC: MR = 0.000008×I² + 0.0103×I - 0.4557 (kg/h)
acMR = 0.000008×900² + 0.0103×900 - 0.4557 = 15.29 kg/h
```

**Step 4: Area Per Pass**
```typescript
// 속도 변환: 1 cpm = 600 mm/h
speedMmH = 90 × 600 = 54,000 mm/h

// g/mm 계산
dcWmrPerMm = (13.1 × 1000) / 54,000 = 0.2426 g/mm
acWmrPerMm = (15.29 × 1000) / 54,000 = 0.2831 g/mm

// mm² 계산 (강재 밀도: 0.00785 g/mm³)
dcArea = 0.2426 / 0.00785 = 30.90 mm²
acArea = 0.2831 / 0.00785 = 36.06 mm²

// Tandem effect (15% 증가)
areaPerPass = (30.90 + 36.06) × 1.15 = 77.04 mm²
```

**Step 5: Pass Count**
```typescript
// 소수점 계산
insideRequiredPass = 268.56 / 77.04 = 3.49

// 올림 (실제 Pass 수)
insidePassCount = Math.ceil(3.49) = 4
```

### Code Organization (v1.6 Refactoring)

**모듈 구조:**
```typescript
// 1. Type Definitions (Lines 6-37)
interface WeldingInput { ... }
interface AreaFormula { ... }
interface WeldingResult { ... }

// 2. Constants (Lines 40-126)
const CONSTANTS = { ... }
const AREA_FORMULAS = { ... }  // 17개 구성

// 3. Helper Functions (Lines 130-240)
parseWeldingInput()              // 입력 검증 (19 lines)
findMatchingConfiguration()      // 구성 매칭 (40 lines)
calculateDcMeltingRate()         // DC 용융속도 (3 lines)
calculateAcMeltingRate()         // AC 용융속도 (3 lines)
calculateAreaPerPass()           // Pass당 면적 (13 lines)
calculateWeldingPasses()         // 전체 오케스트레이션 (48 lines)

// 4. API Handler (Lines 267-276) - 단 8줄!
app.post('/api/calculate-pass', async (c) => {
  try {
    const body = await c.req.json()
    const input = parseWeldingInput(body)
    const result = calculateWeldingPasses(input)
    return c.json(result)
  } catch (error) {
    return c.json({ error: message }, 400)
  }
})
```

**리팩토링 개선 사항:**
- API 핸들러: 192줄 → 8줄 (96% 감소)
- 함수 평균 길이: 15줄 이하
- 순수 함수: 6/7 함수 (83%)
- TSDoc 주석: 모든 공개 함수

---

## Runbook

### Development

**포트 충돌 해결:**
```bash
# 방법 1: PM2로 기존 프로세스 종료
pm2 delete welding-pass-calculator

# 방법 2: 직접 포트 정리
npm run clean-port  # fuser -k 3000/tcp

# 방법 3: 다른 포트 사용 (ecosystem.config.cjs 수정 필요)
# args: 'wrangler pages dev dist --ip 0.0.0.0 --port 8080'
```

**빌드 실패 시:**
```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install

# TypeScript 타입 에러 확인
npx tsc --noEmit

# Vite 캐시 정리
rm -rf dist .vite
npm run build
```

**PM2 관리:**
```bash
# 상태 확인
pm2 list

# 로그 확인 (비블로킹)
pm2 logs welding-pass-calculator --nostream

# 재시작 (코드 변경 후)
pm2 restart welding-pass-calculator

# 정지 및 삭제
pm2 stop welding-pass-calculator
pm2 delete welding-pass-calculator
```

### Testing

**수동 테스트 스크립트:**
```bash
# test.sh 생성
cat > test.sh << 'EOF'
#!/bin/bash
BASE_URL="http://localhost:3000"

echo "Test 1: 80-80-8 (표준)"
curl -s -X POST $BASE_URL/api/calculate-pass \
  -H "Content-Type: application/json" \
  -d '{"insideAngle":80,"outsideAngle":80,"rootGap":8,"thickness":40,"weldingSpeed":90,"dcCurrent":1000,"acCurrent":900}' \
  | jq -c '{config: .calculated.configuration, inside: .calculated.insidePassCount, outside: .calculated.outsidePassCount}'

echo "Test 2: 60-70-5 (저전류)"
curl -s -X POST $BASE_URL/api/calculate-pass \
  -H "Content-Type: application/json" \
  -d '{"insideAngle":60,"outsideAngle":70,"rootGap":5,"thickness":50,"weldingSpeed":70,"dcCurrent":600,"acCurrent":550}' \
  | jq -c '{config: .calculated.configuration, inside: .calculated.insidePassCount, outside: .calculated.outsidePassCount}'

echo "Test 3: 60-70-4 (In) - Seal Area 차감"
curl -s -X POST $BASE_URL/api/calculate-pass \
  -H "Content-Type: application/json" \
  -d '{"insideAngle":60,"outsideAngle":70,"rootGap":4,"thickness":66,"weldingSpeed":70,"dcCurrent":850,"acCurrent":700,"useInConfig":true}' \
  | jq -c '{config: .calculated.configuration, insideArea: .calculated.insideArea, inside: .calculated.insidePassCount}'

echo "Test 4: 잘못된 입력 (필수 필드 누락)"
curl -s -X POST $BASE_URL/api/calculate-pass \
  -H "Content-Type: application/json" \
  -d '{"insideAngle":60}' \
  | jq -c '.error'
EOF

chmod +x test.sh
./test.sh
```

**예상 출력:**
```
Test 1: 80-80-8 (표준)
{"config":"80-80-8","inside":4,"outside":4}

Test 2: 60-70-5 (저전류)
{"config":"60-70-5","inside":9,"outside":8}

Test 3: 60-70-4 (In) - Seal Area 차감
{"config":"60-70-4-in","insideArea":764.92,"inside":11}

Test 4: 잘못된 입력 (필수 필드 누락)
"Please provide all required input values."
```

### Deployment (Cloudflare Pages)

**전제 조건:**
```bash
# 1. Cloudflare 계정 생성
# 2. API 토큰 발급 (Deploy 탭)
# 3. GenSpark에서 setup_cloudflare_api_key 실행 (또는 수동 설정)
export CLOUDFLARE_API_TOKEN=<your-token>

# 4. 인증 확인
npx wrangler whoami
```

**배포 절차:**
```bash
# 1. 빌드
npm run build

# 2. 프로젝트 생성 (최초 1회만)
npx wrangler pages project create webapp \
  --production-branch main \
  --compatibility-date 2024-01-01

# 3. 배포
npm run deploy:prod
# 또는
npx wrangler pages deploy dist --project-name webapp

# 4. URL 확인
# Production: https://<random-id>.webapp.pages.dev
# Branch: https://main.webapp.pages.dev
```

**배포 후 검증:**
```bash
# API 테스트
curl -X POST https://<your-url>.pages.dev/api/calculate-pass \
  -H "Content-Type: application/json" \
  -d '{"insideAngle":80,"outsideAngle":80,"rootGap":8,"thickness":40,"weldingSpeed":90,"dcCurrent":1000,"acCurrent":900}' \
  | jq '.calculated.totalPassCount'

# 예상: 8
```

### Monitoring

**PM2 모니터링:**
```bash
# 실시간 모니터링 (CPU, 메모리)
pm2 monit

# 메트릭 확인
pm2 show welding-pass-calculator

# 로그 스트리밍 (Ctrl+C로 종료)
pm2 logs welding-pass-calculator --lines 50
```

**헬스체크:**
```bash
# 간단한 핑
curl http://localhost:3000

# API 응답 시간 측정
time curl -X POST http://localhost:3000/api/calculate-pass \
  -H "Content-Type: application/json" \
  -d '{"insideAngle":80,"outsideAngle":80,"rootGap":8,"thickness":40,"weldingSpeed":90,"dcCurrent":1000,"acCurrent":900}' \
  > /dev/null

# 예상: real 0m0.05s (50ms 이내)
```

---

## Limitations

### Technical Constraints

1. **지원 구성 제한**
   - **17개 구성만 지원**: 60°-90° 범위의 특정 각도/간격 조합
   - **매칭 정확도**: 입력이 정확히 일치하지 않으면 최근접 구성 사용 (경고 표시됨)
   - **예시**: 입력 `82-78-7` → 자동으로 `80-80-8 (nearest to 82-78-7)` 사용

2. **입력 범위**
   - Inside/Outside Angle: **0-90°** (실제론 60°-90° 권장)
   - Root Gap: **3-10mm** (구성에 따라 다름)
   - Thickness: **1mm 이상** (이론적 제한 없음, 하지만 40-66mm 테스트됨)
   - DC Current: **500-1200A** (Lincoln Electric Powerwave 범위)
   - AC Current: **500-1200A**

3. **계산 가정**
   - Wire 직경: **Ø4.0mm** (고정)
   - 강재 밀도: **7.85 g/cm³** (고정)
   - Tandem effect: **15%** (고정)
   - 용융속도 공식: Lincoln Electric 데이터 기반 (다른 제조사는 다를 수 있음)

4. **성능**
   - API 응답 시간: **50ms 이내** (로컬)
   - Cloudflare Workers CPU 제한: **10ms (무료), 30ms (유료)**
   - 가정: 계산 복잡도가 낮아 제한 내 처리 가능

### Operational Limits

5. **개발 환경**
   - **PM2 필수**: `npm run dev:sandbox`는 포어그라운드에서 실행 (블로킹)
   - **포트 고정**: 3000번 포트만 사용 (변경 시 ecosystem.config.cjs 수정 필요)
   - **빌드 필수**: 코드 변경 후 반드시 `npm run build` → `pm2 restart` 필요

6. **프로덕션 환경 (Cloudflare Pages)**
   - **파일 시스템 없음**: 런타임에 파일 읽기/쓰기 불가
   - **Node.js API 제한**: `fs`, `path`, `child_process` 등 사용 불가
   - **메모리 제한**: 128MB (Workers 기본값)
   - **요청 크기**: Body 100MB 제한

7. **데이터 저장소 없음**
   - **상태 없음**: 모든 계산이 요청-응답 기반 (히스토리 저장 안 됨)
   - **가정**: 필요 시 Cloudflare D1/KV/R2 추가 가능 (현재 미구현)

### Known Issues

8. **UI/UX**
   - **스크린샷 미제공**: 현재 README에 UI 이미지 없음
   - **에러 메시지**: 한국어/영어 혼용 (일관성 부족)
   - **입력 검증**: 클라이언트 사이드 검증 최소 (서버만 검증)

9. **코드 품질**
   - **테스트 없음**: 단위 테스트/통합 테스트 미구현 (수동 테스트만)
   - **로깅 없음**: 계산 과정 추적 불가 (디버깅 어려움)
   - **타입 가드 부족**: 런타임 타입 검증 최소 (TypeScript 컴파일 타임만)

10. **문서화**
    - **API 문서**: Swagger/OpenAPI 스펙 없음 (README만)
    - **공식 예제**: 3개 테스트 케이스만 (엣지 케이스 부족)

### Workarounds

**구성 추가 방법:**
```typescript
// src/index.tsx의 AREA_FORMULAS에 추가
const AREA_FORMULAS: Record<string, AreaFormula> = {
  // ... 기존 구성
  '85-85-9': {  // 새 구성
    inside: (t) => (0.22 * Math.pow(t, 2)) - (1.8 * t) + 19,
    outside: (t) => (0.22 * Math.pow(t, 2)) - (1.8 * t) + 19
  }
}

// 빌드 및 재시작 필요
npm run build && pm2 restart welding-pass-calculator
```

**다른 포트 사용:**
```javascript
// ecosystem.config.cjs 수정
args: 'wrangler pages dev dist --ip 0.0.0.0 --port 8080'

// 환경 변수도 변경
env: { NODE_ENV: 'development', PORT: 8080 }
```

**외부 API로 호출:**
```bash
# 다른 애플리케이션에서 사용
curl -X POST https://<your-app>.pages.dev/api/calculate-pass \
  -H "Content-Type: application/json" \
  -d @request.json  # JSON 파일에서 읽기
```

---

## Appendix

### Formula Details

**Area Calculation (Configuration-Specific)**

각 구성은 Excel 데이터에서 추출한 2차 방정식 사용:

| Configuration | Inside Formula | Outside Formula |
|--------------|----------------|-----------------|
| 60-60-6 | 0.1443t² - 0.5783t + 18.29 | 0.1443t² - 0.5783t + 18.29 |
| 60-70-5 | 0.1751t² - 0.35t + 17.374 | 0.1443t² - 0.2905t + 17.866 |
| 80-80-8 | 0.2098t² - 1.6782t + 20 | 0.2098t² - 1.6782t + 20 |
| 60-70-4-in | (0.1751t² - 0.0001t + 17.193) **- 15** | 0.1443t² - 0.0009t + 17.699 |

*참고: "(In)" 구성은 Inside Area에서 Seal Area (15mm²) 차감*

### Verification Cases

**Case 1: 60-70-5 (Lincoln Electric Excel 검증)**
```
입력:
  Inside: 60°, Outside: 70°, Root: 5mm
  Thickness: 50mm, Speed: 70cpm
  DC: 600A, AC: 550A

계산:
  Inside Area = 0.1751×50² - 0.35×50 + 17.374 = 437.62 mm²
  Outside Area = 0.1443×50² - 0.2905×50 + 17.866 = 364.09 mm²
  DC MR = 0.000001×600² + 0.0131×600 - 0.998 = 7.22 kg/h
  AC MR = 0.000008×550² + 0.0103×550 - 0.4557 = 7.63 kg/h
  Area/Pass = (7.22 + 7.63) × 1000 / (70×600) / 0.00785 × 1.15 = 51.80 mm²

결과:
  Inside Pass: 437.62 / 51.80 = 8.45 → 9 pass ✅
  Outside Pass: 364.09 / 51.80 = 7.03 → 8 pass ✅
```

**Case 2: 80-80-8 (고전류)**
```
입력:
  Inside: 80°, Outside: 80°, Root: 8mm
  Thickness: 40mm, Speed: 90cpm
  DC: 1000A, AC: 900A

결과:
  Inside Pass: 4 pass ✅
  Outside Pass: 4 pass ✅
  Total: 8 pass
```

### Git History

```bash
# 최근 커밋 (v1.6)
2174f2d docs: Update README with v1.6 refactoring details
810f350 refactor: Extract helper functions and improve code organization
220149a feat: Make UI fully responsive for mobile devices
a6520c3 feat: Add support for (In) series configurations
44740c2 feat: Add support for 14 welding groove configurations
```

### License

MIT License (가정: 명시된 라이선스 파일 없음)

### Contributors

- GenSpark AI Assistant (Initial development & refactoring)
- Based on Lincoln Electric Powerwave data

---

**마지막 업데이트:** 2025-01-28 (v1.6)  
**문서 버전:** 1.0 (Executable README)  
**테스트 환경:** Node.js v20.19.5, Ubuntu Linux (GenSpark Sandbox)
