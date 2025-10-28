# Cloudflare Pages Deployment

## Deployment Information

**Project Name**: welding-pass-calculator
**Deployment Date**: 2025-01-28
**Account**: blue20002001@gmail.com
**Account ID**: 12f6b2d2bf87cb135e4abc322a8afcc2

## URLs

- **Production**: https://welding-pass-calculator.pages.dev
- **Latest Deployment**: https://1ade4415.welding-pass-calculator.pages.dev
- **API Endpoint**: https://1ade4415.welding-pass-calculator.pages.dev/api/calculate-pass

## Deployment Command

```bash
export CLOUDFLARE_API_TOKEN="fn76VjPRqi5_kJSWgimeHt03HLqlM5vxphwSWGHi"
npm run build
npx wrangler pages deploy dist --project-name welding-pass-calculator
```

## Environment Setup

```bash
# Add to ~/.bashrc for persistence
echo 'export CLOUDFLARE_API_TOKEN="fn76VjPRqi5_kJSWgimeHt03HLqlM5vxphwSWGHi"' >> ~/.bashrc
source ~/.bashrc
```

## Verify Deployment

```bash
# Check authentication
npx wrangler whoami

# Test API
curl -X POST https://1ade4415.welding-pass-calculator.pages.dev/api/calculate-pass \
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
```

## Project Configuration

**Production Branch**: main
**Compatibility Date**: 2024-01-01
**Build Output**: dist/
**Bundle Size**: 54.43 kB

## Next Deployments

```bash
# Quick deploy after changes
npm run deploy:prod

# Or manually
npm run build
npx wrangler pages deploy dist --project-name welding-pass-calculator
```

## Custom Domain (Optional)

```bash
# Add custom domain
npx wrangler pages domain add example.com --project-name welding-pass-calculator
```
