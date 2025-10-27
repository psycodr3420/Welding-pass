# 용접 Pass 계산기 (Welding Pass Calculator)

## 프로젝트 개요

Lincoln Electric Powerwave 기반의 용접 pass 수를 자동으로 계산하는 웹 애플리케이션입니다. 
용접 groove 각도, root gap, 두께 등의 파라미터를 입력하면 필요한 inside/outside pass 수를 정확하게 계산합니다.

### 주요 기능

- ✅ **자동 Pass 계산**: Inside/Outside groove 각도, root gap, 두께 등을 기반으로 자동 계산
- ✅ **상세 계산 결과**: 용접 면적, 부피, 중량, wire 용융속도 등 상세 정보 제공
- ✅ **프리셋 설정**: 자주 사용하는 설정을 프리셋으로 제공 (80-80-8, 60-70-5 등)
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

| 파라미터 | 단위 | 설명 | 기본값 |
|---------|------|------|--------|
| Inside Angle | 도(°) | 안쪽 groove 각도 | 80 |
| Outside Angle | 도(°) | 바깥쪽 groove 각도 | 80 |
| Root Gap | mm | Root 간격 | 8 |
| 두께 | mm | 용접 두께 | 40 |
| 조인트 길이 | mm | 조인트 길이 | 12000 |
| 용접 속도 | cpm | 용접 속도 (cm/min) | 90 |

## 계산 결과

### 주요 결과
- **총 Pass 수**: Inside + Outside pass의 합계
- **Inside Pass 수**: 안쪽에 필요한 pass 수 (올림값)
- **Outside Pass 수**: 바깥쪽에 필요한 pass 수 (올림값)

### 상세 정보
- **용접 면적** (mm²): Inside/Outside 각각의 용접 면적
- **용접 부피** (mm³): Inside/Outside 각각의 용접 부피
- **용접 중량** (kg): Inside/Outside 각각의 용접 중량 (밀도 7.85 g/cm³ 기준)
- **DC 용융속도** (kg/h): DC 전류 기반 wire 용융속도
- **AC 용융속도** (kg/h): AC 전류 기반 wire 용융속도
- **Pass당 면적** (mm²): 1회 pass당 용접 면적 (Tandem effect 15% 포함)

## 계산 공식

### 1. 용접 면적 계산
```
baseArea = 0.2098 × thickness² - 1.6782 × thickness + 20
area = baseArea × (angle/70) × (gap/5)
```

### 2. Wire 용융속도
- **DC**: `MR = 0.000001 × I² + 0.0131 × I - 0.998 - 0.014`
- **AC**: `MR = 0.000008 × I² + 0.0103 × I - 0.4557 - 0.088`

### 3. Pass 수 계산
```
areaPerPass = (dcArea + acArea) × 1.15  // Tandem effect 15%
requiredPass = weldingArea / areaPerPass
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
  "jointLength": 12000,
  "weldingSpeed": 90
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
    "jointLength": 12000,
    "weldingSpeed": 90
  },
  "calculated": {
    "insideArea": 527.64,
    "outsideArea": 527.64,
    "insideVolume": 6331655,
    "outsideVolume": 6331655,
    "insideWeight": 49.7,
    "outsideWeight": 49.7,
    "dcMeltingRate": 13.09,
    "acMeltingRate": 15.21,
    "areaPerPass": 76.76,
    "insideRequiredPass": 6.87,
    "outsideRequiredPass": 6.87,
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
   - 또는 프리셋 버튼 클릭으로 빠른 설정
3. **계산하기 클릭**: "Pass 계산하기" 버튼 클릭
4. **결과 확인**: 오른쪽 패널에서 상세 계산 결과 확인

## 프리셋 설정

| 프리셋 | Inside | Outside | Gap | 두께 |
|--------|--------|---------|-----|------|
| 80-80-8 | 80° | 80° | 8mm | 40mm |
| 80-80-10 | 80° | 80° | 10mm | 50mm |
| 60-70-5 | 60° | 70° | 5mm | 50mm |
| 60-70-4 | 60° | 70° | 4mm | 31.4mm |

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

## 업데이트 내역

- **2025-01-27**: 초기 버전 릴리즈
  - 기본 pass 계산 기능 구현
  - 프리셋 설정 추가
  - 반응형 UI 구현
  - API 엔드포인트 구현
