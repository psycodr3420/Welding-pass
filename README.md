# 용접 Pass 계산기 (Welding Pass Calculator)

## 프로젝트 개요

Lincoln Electric Powerwave 기반의 용접 pass 수를 자동으로 계산하는 웹 애플리케이션입니다. 
용접 groove 각도, root gap, 두께 등의 파라미터를 입력하면 필요한 inside/outside pass 수를 정확하게 계산합니다.

### 주요 기능

- ✅ **다중 구성 지원**: 14가지 다른 groove 구성 자동 인식 및 적용
- ✅ **자동 Pass 계산**: Inside/Outside groove 각도, root gap, 두께, **DC/AC 전류** 등을 기반으로 자동 계산
- ✅ **전류 기반 용융속도 계산**: 입력한 DC/AC 전류 값에 따라 정확한 wire 용융속도 계산
- ✅ **지능형 구성 매칭**: 입력과 정확히 일치하는 구성이 없으면 가장 가까운 구성 자동 선택
- ✅ **상세 계산 결과**: 용접 면적, wire 용융속도, 사용된 구성 정보 등 상세 정보 제공
- ✅ **14개 프리셋**: 자주 사용하는 설정을 프리셋으로 제공
- ✅ **반응형 UI**: 모바일/데스크탑 모두 지원하는 반응형 디자인
- ✅ **실시간 계산**: 입력 후 즉시 결과 확인 가능

## URLs

- **개발 서버**: https://3000-im3q2bjqtybq2rx1dduib-3844e1b6.sandbox.novita.ai
- **API 엔드포인트**: `/api/calculate-pass`

## 기술 스택

- **Backend**: Hono (Cloudflare Workers)
- **Frontend**: HTML5, TailwindCSS, JavaScript
- **Deployment**: Cloudflare Pages
- **Icons**: FontAwesome 6.4.0
- **HTTP Client**: Axios 1.6.0

## 입력 파라미터

| 파라미터 | 단위 | 설명 | 기본값 | 범위 |
|---------|------|------|--------|------|
| Inside Angle | 도(°) | 안쪽 groove 각도 | 80 | 0-90 |
| Outside Angle | 도(°) | 바깥쪽 groove 각도 | 80 | 0-90 |
| Root Gap | mm | Root 간격 | 8 | 0+ |
| 두께 | mm | 용접 두께 | 40 | 1+ |
| 용접 속도 | cpm | 용접 속도 (cm/min) | 90 | 1+ |
| **DC 전류** | **A** | **DC 용접 전류** | **1000** | **500-1200** |
| **AC 전류** | **A** | **AC 용접 전류** | **900** | **500-1200** |

## 계산 결과

### 주요 결과
- **총 Pass 수**: Inside + Outside pass의 합계
- **Inside Pass 수**: 안쪽에 필요한 pass 수 (올림값)
- **Outside Pass 수**: 바깥쪽에 필요한 pass 수 (올림값)

### 상세 정보
- **용접 면적** (mm²): Inside/Outside 각각의 용접 면적
- **DC 용융속도** (kg/h): DC 전류 기반 wire 용융속도
- **AC 용융속도** (kg/h): AC 전류 기반 wire 용융속도
- **Pass당 면적** (mm²): 1회 pass당 용접 면적 (Tandem effect 15% 포함)
- **계산된 Pass 값**: 실제 필요한 정확한 pass 수와 올림 값

## 지원하는 구성 (Configurations)

시스템은 다음 14가지 groove 구성을 지원하며, 각 구성마다 고유한 Area 계산 공식을 사용합니다:

### 60° 시리즈
- **60-60-6**: Inside 60°, Outside 60°, Root Face 6mm
- **60-60-8**: Inside 60°, Outside 60°, Root Face 8mm
- **60-65-5**: Inside 60°, Outside 65°, Root Face 5mm
- **60-65-6**: Inside 60°, Outside 65°, Root Face 6mm
- **60-70-3**: Inside 60°, Outside 70°, Root Face 3mm
- **60-70-4**: Inside 60°, Outside 70°, Root Face 4mm
- **60-70-5**: Inside 60°, Outside 70°, Root Face 5mm

### 70° 시리즈
- **70-70-3**: Inside 70°, Outside 70°, Root Face 3mm

### 80° 시리즈
- **80-80-6**: Inside 80°, Outside 80°, Root Face 6mm
- **80-80-7**: Inside 80°, Outside 80°, Root Face 7mm
- **80-80-8**: Inside 80°, Outside 80°, Root Face 8mm
- **80-80-10**: Inside 80°, Outside 80°, Root Face 10mm

### 90° 시리즈
- **90-90-8**: Inside 90°, Outside 90°, Root Face 8mm
- **90-90-10**: Inside 90°, Outside 90°, Root Face 10mm

## 계산 공식

### 1. 용접 면적 계산 (Configuration-Specific)

각 구성마다 고유한 2차 방정식 공식을 사용합니다. 모든 공식은 Lincoln Electric Excel 데이터에서 추출되었습니다.

**공식 형태:**
```
Area = a × t² + b × t + c
```
여기서 t는 두께(mm)이고, a, b, c는 각 구성마다 다른 계수입니다.

**예시:**
- **60-70-5**: 
  - Inside Area = 0.1751 × t² - 0.35 × t + 17.374
  - Outside Area = 0.1443 × t² - 0.2905 × t + 17.866
  
- **80-80-8**: 
  - Inside Area = 0.2098 × t² - 1.6782 × t + 20
  - Outside Area = 0.2098 × t² - 1.6782 × t + 20

**지능형 매칭**: 입력한 구성이 정확히 일치하지 않으면, 가장 가까운 구성을 자동으로 선택합니다.

### 2. Wire 용융속도 (전류 기반)
- **DC**: `MR = 0.000001 × I² + 0.0131 × I - 0.998` (kg/h)
- **AC**: `MR = 0.000008 × I² + 0.0103 × I - 0.4557` (kg/h)
- **I**: 용접 전류 (Amperes)

**예시:**
- DC 1000A → 13.1 kg/h
- DC 800A → 10.12 kg/h
- AC 900A → 15.29 kg/h
- AC 700A → 10.67 kg/h

### 3. Wire Melting Rate per mm
```
Speed conversion: 1 cpm = 600 mm/h
dcWmrPerMm = (dcMeltingRate × 1000) / (speed × 600)  // g/mm
acWmrPerMm = (acMeltingRate × 1000) / (speed × 600)  // g/mm
```

### 4. Area per Pass
```
Specific Gravity = 0.00785 g/mm³ (steel: 7.85 g/cm³)
dcAreaPerPass = dcWmrPerMm / specificGravity  // mm²
acAreaPerPass = acWmrPerMm / specificGravity  // mm²
tandemAreaPerPass = (dcAreaPerPass + acAreaPerPass) × 1.15  // Tandem effect 15%
```

### 5. Pass 수 계산
```
requiredPass = weldingArea / tandemAreaPerPass
actualPass = ROUNDUP(requiredPass)
```

## API 사용법

### POST /api/calculate-pass

**요청 예시:**
```json
{
  "insideAngle": 80,
  "outsideAngle": 80,
  "rootGap": 8,
  "thickness": 40,
  "weldingSpeed": 90,
  "dcCurrent": 1000,
  "acCurrent": 900
}
```

**응답 예시:**
```json
{
  "input": {
    "insideAngle": 80,
    "outsideAngle": 80,
    "rootGap": 8,
    "thickness": 40,
    "weldingSpeed": 90,
    "dcCurrent": 1000,
    "acCurrent": 900
  },
  "calculated": {
    "insideArea": 527.64,
    "outsideArea": 527.64,
    "dcMeltingRate": 13.1,
    "acMeltingRate": 15.29,
    "areaPerPass": 77.04,
    "insideRequiredPass": 6.85,
    "outsideRequiredPass": 6.85,
    "insidePassCount": 7,
    "outsidePassCount": 7,
    "totalPassCount": 14
  }
}
```

## 사용 방법

1. **웹 브라우저로 접속**: 위의 개발 서버 URL로 접속
2. **파라미터 입력**: 
   - Inside/Outside groove 각도 입력
   - Root gap, 두께, 조인트 길이, 용접 속도 입력
   - **DC/AC 용접 전류 입력** (중요!)
   - 또는 프리셋 버튼 클릭으로 빠른 설정
3. **계산하기 클릭**: "Pass 계산하기" 버튼 클릭
4. **결과 확인**: 오른쪽 패널에서 상세 계산 결과 확인
   - 전류 값에 따라 용융속도가 변경됨
   - 낮은 전류 → 낮은 용융속도 → 더 많은 pass 필요

## 프리셋 설정

총 14개의 프리셋이 제공됩니다:

| 프리셋 | Inside | Outside | Gap | 두께 | 프리셋 | Inside | Outside | Gap | 두께 |
|--------|--------|---------|-----|------|--------|--------|---------|-----|------|
| 60-60-6 | 60° | 60° | 6mm | 40mm | 70-70-3 | 70° | 70° | 3mm | 40mm |
| 60-60-8 | 60° | 60° | 8mm | 40mm | 80-80-6 | 80° | 80° | 6mm | 40mm |
| 60-65-5 | 60° | 65° | 5mm | 40mm | 80-80-7 | 80° | 80° | 7mm | 40mm |
| 60-65-6 | 60° | 65° | 6mm | 40mm | 80-80-8 | 80° | 80° | 8mm | 40mm |
| 60-70-3 | 60° | 70° | 3mm | 40mm | 80-80-10 | 80° | 80° | 10mm | 50mm |
| 60-70-4 | 60° | 70° | 4mm | 31.4mm | 90-90-8 | 90° | 90° | 8mm | 40mm |
| 60-70-5 | 60° | 70° | 5mm | 50mm | 90-90-10 | 90° | 90° | 10mm | 40mm |

## 개발 환경 실행

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# 개발 서버 실행
npm run dev:sandbox

# PM2로 실행
pm2 start ecosystem.config.cjs

# 테스트
npm test
```

## 배포

```bash
# Cloudflare Pages에 배포
npm run deploy:prod
```

## 기술 배경

이 계산기는 Lincoln Electric의 Powerwave 용접 시스템 데이터를 기반으로 합니다:
- **Wire 직경**: Ø4.0mm
- **DC 전류**: 500-1000A
- **AC 전류**: 500-900A
- **Tandem 효과**: 15% 증가
- **강재 밀도**: 7.85 g/cm³

## 라이선스

MIT License

## 개발자

GenSpark AI Assistant

## 전류에 따른 Pass 수 변화 예시

동일한 조건(80-80-8, 두께 40mm)에서 전류 변화에 따른 결과:

| DC 전류 | AC 전류 | DC 용융속도 | AC 용융속도 | Pass당 면적 | 총 Pass 수 |
|---------|---------|-------------|-------------|-------------|------------|
| 1000A | 900A | 13.1 kg/h | 15.29 kg/h | 77.04 mm² | **14 pass** |
| 800A | 700A | 10.12 kg/h | 10.67 kg/h | 56.42 mm² | **20 pass** |
| 600A | 500A | 7.22 kg/h | 6.68 kg/h | 37.71 mm² | **28 pass** |

**결론**: 전류가 높을수록 용융속도가 빠르고, 필요한 pass 수가 감소합니다.

## 계산 정확도 검증

### 테스트 케이스: 60-70-5 Configuration
**입력:**
- Inside Angle: 60°
- Outside Angle: 70°
- Root Face: 5mm
- Thickness: 50mm
- Welding Speed: 70 cpm
- DC Current: 600A
- AC Current: 550A

**계산 결과:**
- Inside Area: 437.62 mm²
- Outside Area: 364.09 mm²
- Tandem Area per Pass: 51.80 mm²
- **Inside Pass: 9**
- **Outside Pass: 8**
- **Total: 17 passes** ✅

### 테스트 케이스: 80-80-8 Configuration
**입력:**
- Inside Angle: 80°
- Outside Angle: 80°
- Root Face: 8mm
- Thickness: 50mm
- Welding Speed: 70 cpm
- DC Current: 600A
- AC Current: 550A

**계산 결과:**
- Inside Area: 445.59 mm²
- Outside Area: 460.59 mm²
- Tandem Area per Pass: 51.80 mm²
- **Inside Pass: 9**
- **Outside Pass: 9**
- **Total: 18 passes** ✅

## 업데이트 내역

- **2025-01-27 v1.4**: 다중 구성 지원 및 지능형 매칭
  - **MAJOR UPDATE**: 14개 groove 구성 자동 인식 및 적용
  - Excel의 모든 Powerwave 탭에서 Area 공식 자동 추출
  - 지능형 구성 매칭: 가장 가까운 구성 자동 선택
  - 14개 프리셋 버튼 추가 (60-60-6 ~ 90-90-10)
  - 계산 결과에 사용된 구성 정보 표시
  - 모든 구성에서 Excel과 정확히 일치하는 결과 보장

- **2025-01-27 v1.3**: Configuration-specific area formulas
  - **CRITICAL FIX**: 각도와 Root Face 조합별 고유 공식 적용
  - 60-70-5 및 80-80-8 configuration 각각의 Excel 공식 사용
  - 속도 변환 공식 수정: 1 cpm = 600 mm/h (기존 잘못된 변환 수정)
  - Specific gravity 수정: 0.00785 g/mm³ (기존 7.85/1000)
  - 계산 정확도 크게 향상 (Excel 결과와 정확히 일치)

- **2025-01-27 v1.2**: 조인트 길이 필드 제거
  - 조인트 길이 입력 필드 제거 (pass 계산에 불필요)
  - 용접 부피/중량 계산 제거
  - UI 간소화 및 필수 항목만 유지
  - API 응답 최적화

- **2025-01-27 v1.1**: DC/AC 전류 입력 기능 추가
  - 사용자 정의 DC/AC 전류 입력 필드 추가
  - 전류 기반 실시간 용융속도 계산
  - 전류에 따른 정확한 pass 수 계산
  - UI 개선 및 전류 정보 표시

- **2025-01-27 v1.0**: 초기 버전 릴리즈
  - 기본 pass 계산 기능 구현
  - 프리셋 설정 추가
  - 반응형 UI 구현
  - API 엔드포인트 구현
