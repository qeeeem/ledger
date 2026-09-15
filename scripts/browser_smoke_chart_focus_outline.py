tab = next((t for t in list_tabs() if t.get("url", "").startswith("http://127.0.0.1:4192/ledger/")), None)
if tab is None:
    new_tab("http://127.0.0.1:4192/ledger/")
    wait_for_load()
else:
    switch_tab(tab, activate=True)

js("""(async()=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('own-ledger',2);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const tx=db.transaction('transactions','readwrite');
  tx.objectStore('transactions').add({type:'expense',amount:20,category:'test',account:'cash',note:'focus',date:'2026-09-02',createdAt:'2026-09-02T12:00:00.000Z'});
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  db.close();
})()""")
cdp("Page.reload", ignoreCache=True)
wait_for_load()
time.sleep(0.5)

if not js("!!document.querySelector('.charts-screen')"):
    js("document.querySelectorAll('.nav-button')[1]?.click()")
    time.sleep(0.5)

chart = js("(()=>{const e=document.querySelector('.line-chart .recharts-surface');const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()")
click_at_xy(chart["x"] + chart["w"] / 2, chart["y"] + chart["h"] / 2)
time.sleep(0.3)

result = js("""(()=>{
  const surface=document.querySelector('.line-chart .recharts-surface');
  const style=getComputedStyle(surface);
  return {
    activeTag: document.activeElement?.tagName,
    activeClass: document.activeElement?.getAttribute('class'),
    outlineStyle: style.outlineStyle,
    outlineWidth: style.outlineWidth,
    tapHighlight: style.webkitTapHighlightColor
  };
})()""")
print(result)
if result["outlineStyle"] != "none":
    raise SystemExit(f"RED: chart focus outline is still visible: {result}")

capture_screenshot("C:/Users/Administrator/Downloads/新建文件夹/local-ledger-pwa/qa-chart-no-focus-outline-local.png")
print("GREEN: clicking the chart does not draw a browser focus outline")
