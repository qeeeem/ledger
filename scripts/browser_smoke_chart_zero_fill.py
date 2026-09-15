import time


URL = "http://127.0.0.1:4191/ledger/"


tab = next((item for item in list_tabs() if item.get("url", "").startswith(URL)), None)
if tab is None:
    new_tab(URL)
    wait_for_load()
else:
    switch_tab(tab, activate=True)

js("""(async()=>{
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('own-ledger',2);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  const tx=db.transaction('transactions','readwrite');
  const store=tx.objectStore('transactions');
  store.clear();
  [
    {type:'expense',amount:10,category:'测试',account:'现金',note:'day-01',date:'2026-09-01',createdAt:'2026-09-01T12:00:00.000Z'},
    {type:'expense',amount:30,category:'测试',account:'现金',note:'day-03',date:'2026-09-03',createdAt:'2026-09-03T12:00:00.000Z'}
  ].forEach(item=>store.add(item));
  await new Promise((resolve,reject)=>{
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error);
  });
  db.close();
})()""")
cdp("Page.reload", ignoreCache=True)
wait_for_load()
time.sleep(0.8)

js("document.querySelectorAll('.nav-button')[1]?.click()")
time.sleep(1.2)

month_dots = js("document.querySelectorAll('.trend-card .recharts-line-dot').length")
month_title = js("document.querySelector('.trend-card h2')?.textContent")
print({"scope": "month", "title": month_title, "points": month_dots})
if month_dots != 30:
    raise SystemExit(f"RED: September should contain 30 daily points including zero days, got {month_dots}")

js("document.querySelectorAll('.chart-period .segmented button')[1]?.click()")
time.sleep(1.2)

year_dots = js("document.querySelectorAll('.trend-card .recharts-line-dot').length")
year_title = js("document.querySelector('.trend-card h2')?.textContent")
print({"scope": "year", "title": year_title, "points": year_dots})
if year_dots != 12:
    raise SystemExit(f"RED: year chart should contain 12 monthly points including zero months, got {year_dots}")

print("GREEN: missing dates are rendered as zero-value chart points")
