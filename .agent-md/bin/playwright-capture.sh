#!/bin/bash
# playwright-capture.sh — capture DOM screenshot of a URL for visual validation
# Usage: ./.agent-md/bin/playwright-capture.sh <url> [output.png]
# Requires: playwright installed (npm i -D playwright && npx playwright install chromium)
#
# Output: a PNG file the agent can pass to a Vision-Language Model (VLM)
# for independent visual review. Self-grading of UI is forbidden — always
# submit the screenshot for review.

export CAPTURE_URL="${1:-http://localhost:3000}"
export CAPTURE_OUT="${2:-screenshot.png}"

if ! command -v npx &>/dev/null; then
  echo "Error: npx not found. Install Node.js first."
  exit 1
fi

if ! npx playwright --version &>/dev/null 2>&1; then
  echo "Error: playwright not installed. Run:"
  echo "  npm i -D playwright && npx playwright install chromium"
  exit 1
fi

# Single-quoted heredoc + env-var reads: prevents shell interpolation
# inside the JS body (a URL or path containing a quote, $, or backtick
# would otherwise break the script or inject code).
node <<'EOF'
const { chromium } = require('playwright');
const url = process.env.CAPTURE_URL;
const out = process.env.CAPTURE_OUT;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: out, fullPage: true });
    console.log('Captured: ' + out);
  } catch (e) {
    console.error('Capture failed:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
EOF
