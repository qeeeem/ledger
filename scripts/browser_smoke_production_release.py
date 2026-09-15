url = "https://8.148.157.132/ledger/?release=chart-focus-20260904"
new_tab(url)
wait_for_load()
time.sleep(1)

resources = js("performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/assets/index-'))")
print({"url": js("location.href"), "resources": resources})
if not any("index-D8-mQH8P.js" in item for item in resources):
    raise SystemExit(f"RED: final JavaScript asset was not loaded: {resources}")
if not any("index-BsdLh7LM.css" in item for item in resources):
    raise SystemExit(f"RED: final CSS asset was not loaded: {resources}")

css_check = js("""(async()=>{
  const href=Array.from(document.styleSheets).map(s=>s.href).find(Boolean);
  const css=await fetch(href, {cache:'no-store'}).then(r=>r.text());
  return {
    hasChartOutlineRule: css.includes('.line-chart .recharts-surface') && css.includes('outline:none'),
    hasTapHighlightRule: css.includes('-webkit-tap-highlight-color:transparent')
  };
})()""")
print({"css": css_check})
if not css_check["hasChartOutlineRule"] or not css_check["hasTapHighlightRule"]:
    raise SystemExit(f"RED: final chart focus CSS was not found: {css_check}")

js("document.querySelectorAll('.nav-button')[3]?.click()")
time.sleep(0.5)
labels = js("Array.from(document.querySelectorAll('.backup-actions strong')).map(e=>e.textContent.trim())")
print({"settingsActions": labels})
if labels != ["导出 Excel", "导入 Excel"]:
    raise SystemExit(f"RED: backup actions are unexpected: {labels}")

capture_screenshot("C:/Users/Administrator/Downloads/新建文件夹/local-ledger-pwa/qa-production-final-release.png")
print("GREEN: production loaded the final JS/CSS and backup actions")
