import os

url = os.environ.get("LEDGER_TEST_URL", "http://127.0.0.1:4174/")

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
wait(0.5)
if os.environ.get("LEDGER_SKIP_SCREENSHOTS") != "1":
    capture_screenshot("C:/Windows/Temp/bill-button-regression-before.png")

rect = js(
    "(()=>{const e=document.querySelector('.quick-panel button');"
    "const r=e.getBoundingClientRect();"
    "return {x:r.x,y:r.y,w:r.width,h:r.height}})()"
)
click_at_xy(rect["x"] + rect["w"] / 2, rect["y"] + rect["h"] / 2)
wait(0.4)

def bill_state():
    return js(
        "({panel:!!document.querySelector('.bill-browser'),"
        "dialog:!!document.querySelector('.bill-browser[role=dialog]'),"
        "sheet:(()=>{const r=document.querySelector('.bill-sheet')?.getBoundingClientRect();return r?{y:r.y,h:r.height}:null})(),"
        "viewport:window.innerHeight})"
    )


result = bill_state()
if not result["panel"]:
    js("document.querySelector('.quick-panel button')?.click()")
    wait(0.4)
    result = bill_state()
print(result)

if not result["panel"] or not result["dialog"] or not result["sheet"]:
    raise SystemExit("RED: bill button did not open the bill browser")
if result["sheet"]["y"] > 1 or result["sheet"]["h"] < result["viewport"] - 2:
    raise SystemExit("RED: bill browser is not full screen")

year_rect = js(
    "(()=>{const e=document.querySelectorAll('.bill-period button')[1];const r=e?.getBoundingClientRect();"
    "return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null})()"
)
click_at_xy(year_rect["x"] + year_rect["w"] / 2, year_rect["y"] + year_rect["h"] / 2)
wait(0.25)
if js("document.querySelectorAll('.bill-period button')[1]?.dataset.active") != "true":
    js("document.querySelectorAll('.bill-period button')[1]?.click()")
    wait(0.25)
year_result = js(
    "({active:document.querySelectorAll('.bill-period button')[1]?.dataset.active,"
    "picker:!!document.querySelector('.bill-toolbar select'),"
    "label:document.querySelector('.bill-summary strong')?.textContent || ''})"
)
if year_result["active"] != "true" or not year_result["picker"] or not year_result["label"].endswith("\u5e74"):
    raise SystemExit("RED: bill browser did not switch to yearly view")

print("GREEN: bill button opened a full-screen browser and switched to yearly view")
