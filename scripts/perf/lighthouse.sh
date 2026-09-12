#!/bin/bash
# Lighthouse mobile run against the h2 proxy with the main-thread breakdown.
# usage: scripts/perf/lighthouse.sh <label> <path> [runs]
# Needs Lighthouse (npx lighthouse) and a Chrome binary in CHROME_PATH
# (e.g. the Playwright Chromium: ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome).
# LH_EXTRA="--save-assets" keeps the trace next to the JSON.
S=${LH_OUT:-scripts/perf/out}
LABEL=$1; P=$2; RUNS=${3:-2}
export CHROME_PATH=${CHROME_PATH:-$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux64/chrome 2>/dev/null | tail -1)}
LH=${LIGHTHOUSE:-lighthouse}
mkdir -p "$S/lh"
for i in $(seq 1 $RUNS); do
  $LH "https://localhost:3443$P" --quiet --output=json --output-path=$S/lh/$LABEL-$i.json \
    --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate \
    --only-categories=performance ${LH_EXTRA:-} --chrome-flags="--headless=new --ignore-certificate-errors --no-sandbox" >/dev/null 2>&1
  node -e '
const r=require(process.argv[1]); const a=r.audits;
const mt=a["mainthread-work-breakdown"].details.items; const g=k=>{const i=mt.find(x=>x.group===k);return i?Math.round(i.duration):0};
const css=(a["network-requests"].details.items||[]).filter(x=>x.resourceType==="Stylesheet").map(x=>x.url.split("/").pop()+" "+Math.round(x.transferSize/1024)+"KB");
console.log(process.argv[2], "perf", Math.round(r.categories.performance.score*100), "FCP", Math.round(a["first-contentful-paint"].numericValue), "LCP", Math.round(a["largest-contentful-paint"].numericValue), "TBT", Math.round(a["total-blocking-time"].numericValue), "| style&layout", g("styleLayout"), "script", g("scriptEvaluation"), "parseHTML", g("parseHTML"), "paint", g("paintCompositeRender"), "total", Math.round(mt.reduce((s,x)=>s+x.duration,0)), "| dom", a["dom-size"].numericValue, "| css:", css.join(", "));
' $S/lh/$LABEL-$i.json "$LABEL#$i"
done
