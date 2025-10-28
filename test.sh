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
