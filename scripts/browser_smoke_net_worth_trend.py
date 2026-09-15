import os

url = os.environ.get("LEDGER_TEST_URL", "http://127.0.0.1:4193/")


def rect(selector, index=0):
    return js(
        "((selector,index)=>{const e=document.querySelectorAll(selector)[index];"
        "if(!e)return null;const r=e.getBoundingClientRect();"
        "return {x:r.x,y:r.y,w:r.width,h:r.height}})"
        f"({selector!r},{index})"
    )


def click_rect(value):
    if not value:
        raise SystemExit("RED: expected clickable element is missing")
    click_at_xy(value["x"] + value["w"] / 2, value["y"] + value["h"] / 2)


def replace_input(selector, value):
    click_rect(rect(selector))
    js(
        "((selector,value)=>{const input=document.querySelector(selector);"
        "const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;"
        "setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));"
        "input.dispatchEvent(new Event('change',{bubbles:true}));})"
        f"({selector!r},{value!r})"
    )
    wait(0.15)


new_tab(url)
cdp(
    "Emulation.setDeviceMetricsOverride",
    width=393,
    height=852,
    deviceScaleFactor=1,
    mobile=True,
    screenWidth=393,
    screenHeight=852,
)
goto_url(url)
wait_for_load()
wait(0.7)
capture_screenshot("C:/Windows/Temp/net-worth-trend-before.png")

click_rect(rect(".nav-button", 2))
wait(0.4)
if not js("!!document.querySelector('.assets-screen')"):
    js("document.querySelectorAll('.nav-button')[2]?.click()")
    wait(0.4)

trend = js(
    "({exists:!!document.querySelector('.net-worth-trend'),"
    "months:document.querySelector('.net-worth-trend')?.dataset.months,"
    "year:document.querySelector('.net-worth-trend .card-title span')?.textContent})"
)
if not trend["exists"] or trend["months"] != "12" or trend["year"] != f"{__import__('datetime').datetime.now().year}\u5e74":
    raise SystemExit(f"RED: natural-year net worth trend is incomplete: {trend}")

click_rect(rect(".account-row", 0))
wait(0.3)
replace_input(".full-screen-sheet .field input", "800")
click_rect(rect(".full-screen-sheet .primary"))
wait(0.6)

snapshot = js(
    "new Promise((resolve,reject)=>{const open=indexedDB.open('own-ledger');"
    "open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;"
    "const req=db.transaction('meta').objectStore('meta').get('net-worth-snapshots');"
    "req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result?.value?.at(-1)??null);};})"
)
if not snapshot or snapshot["total"] != 800:
    raise SystemExit(f"RED: monthly net worth snapshot was not updated: {snapshot}")

capture_screenshot("C:/Windows/Temp/net-worth-trend-after.png")
print("GREEN: natural-year trend has 12 months and manual balance updates the current-month snapshot")
