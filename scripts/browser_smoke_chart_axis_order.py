tab = next((t for t in list_tabs() if t.get("url", "").startswith("http://127.0.0.1:4191/ledger/")), None)
if tab is None:
    new_tab("http://127.0.0.1:4191/ledger/")
    wait_for_load()
else:
    switch_tab(tab, activate=True)

js("""(async()=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('own-ledger',2);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const tx=db.transaction('transactions','readwrite');
  const store=tx.objectStore('transactions');
  [
    {type:'expense',amount:10,category:'测试',account:'现金',note:'day-01',date:'2026-09-01',createdAt:'2026-09-01T12:00:00.000Z'},
    {type:'expense',amount:20,category:'测试',account:'现金',note:'day-02',date:'2026-09-02',createdAt:'2026-09-02T12:00:00.000Z'},
    {type:'expense',amount:30,category:'测试',account:'现金',note:'day-03',date:'2026-09-03',createdAt:'2026-09-03T12:00:00.000Z'},
    {type:'income',amount:10,category:'测试',account:'现金',note:'income-01',date:'2026-09-01',createdAt:'2026-09-01T13:00:00.000Z'},
    {type:'income',amount:20,category:'测试',account:'现金',note:'income-02',date:'2026-09-02',createdAt:'2026-09-02T13:00:00.000Z'},
    {type:'income',amount:30,category:'测试',account:'现金',note:'income-03',date:'2026-09-03',createdAt:'2026-09-03T13:00:00.000Z'}
  ].forEach(item=>store.add(item));
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  db.close();
})()""")
cdp("Page.reload", ignoreCache=True)
wait_for_load()
time.sleep(0.5)

box = js("(()=>{const e=document.querySelectorAll('.nav-button')[1];const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()")
click_at_xy(box["x"] + box["w"] / 2, box["y"] + box["h"] / 2)
time.sleep(0.5)
if not js("!!document.querySelector('.charts-screen')"):
    js("document.querySelectorAll('.nav-button')[1]?.click()")
    time.sleep(1)

labels = js("Array.from(document.querySelectorAll('.recharts-cartesian-axis-tick-value')).map(e=>e.textContent.trim())")
print({"type": "expense", "charts": js("!!document.querySelector('.charts-screen')"), "labels": labels})
numbers = [int(label.replace("月", "")) for label in labels]
if len(numbers) < 2:
    raise SystemExit("RED: expense chart did not render enough x-axis labels")
if numbers != sorted(numbers):
    raise SystemExit(f"RED: expense x-axis is not ascending: {labels}")

income = js("(()=>{const e=document.querySelectorAll('.charts-screen > .segmented button')[1];const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()")
click_at_xy(income["x"] + income["w"] / 2, income["y"] + income["h"] / 2)
time.sleep(0.5)
if js("document.querySelectorAll('.charts-screen > .segmented button')[1]?.dataset.active") != "true":
    js("document.querySelectorAll('.charts-screen > .segmented button')[1]?.click()")
    time.sleep(0.5)

income_labels = js("Array.from(document.querySelectorAll('.recharts-cartesian-axis-tick-value')).map(e=>e.textContent.trim())")
print({"type": "income", "labels": income_labels})
income_numbers = [int(label.replace("月", "")) for label in income_labels]
if len(income_numbers) < 2:
    raise SystemExit("RED: income chart did not render enough x-axis labels")
if income_numbers != sorted(income_numbers):
    raise SystemExit(f"RED: income x-axis is not ascending: {income_labels}")

print("GREEN: expense and income x-axes are ascending from left to right")
