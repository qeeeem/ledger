import os

url = os.environ.get("LEDGER_TEST_URL", "http://127.0.0.1:4191/")


def rect(selector, index=0):
    return js(
        "((selector,index)=>{const e=document.querySelectorAll(selector)[index];"
        "if(!e)return null;const r=e.getBoundingClientRect();"
        "return {x:r.x,y:r.y,w:r.width,h:r.height}})"
        f"({selector!r},{index})"
    )


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
wait(0.8)
if os.environ.get("LEDGER_SKIP_SCREENSHOTS") != "1":
    capture_screenshot("C:/Windows/Temp/chart-income-home.png")

chart_button = rect(".nav-button", 1)
click_at_xy(chart_button["x"] + chart_button["w"] / 2, chart_button["y"] + chart_button["h"] / 2)
wait(0.5)
if not js("!!document.querySelector('.charts-screen')"):
    chart_button = rect(".nav-button", 1)
    click_at_xy(chart_button["x"] + chart_button["w"] / 2, chart_button["y"] + chart_button["h"] / 2)
    wait(0.5)
if not js("!!document.querySelector('.charts-screen')"):
    js("document.querySelectorAll('.nav-button')[1]?.click()")
    wait(0.5)
if not js("!!document.querySelector('.charts-screen')"):
    raise SystemExit("RED: charts screen did not open")
if os.environ.get("LEDGER_SKIP_SCREENSHOTS") != "1":
    capture_screenshot("C:/Windows/Temp/chart-income-before-switch.png")

income_button = rect(".charts-screen .segmented button", 1)
click_at_xy(income_button["x"] + income_button["w"] / 2, income_button["y"] + income_button["h"] / 2)
wait(0.3)
if js("document.querySelectorAll('.charts-screen > .segmented button')[1]?.dataset.active") != "true":
    js("document.querySelectorAll('.charts-screen > .segmented button')[1]?.click()")
    wait(0.3)

year_button = rect(".chart-period .segmented button", 1)
click_at_xy(year_button["x"] + year_button["w"] / 2, year_button["y"] + year_button["h"] / 2)
wait(0.2)
if js("document.querySelectorAll('.chart-period .segmented button')[1]?.dataset.active") != "true":
    js("document.querySelectorAll('.chart-period .segmented button')[1]?.click()")
    wait(0.2)

result = js(
    "({active:document.querySelectorAll('.charts-screen .segmented button')[1]?.dataset.active,"
    "yearActive:document.querySelectorAll('.chart-period .segmented button')[1]?.dataset.active,"
    "yearPicker:!!document.querySelector('.chart-period > select'),"
    "trend:document.querySelector('.trend-card h2')?.textContent,"
    "category:document.querySelector('.category-card h2')?.textContent})"
)
print(result)
if result["active"] != "true" or result["yearActive"] != "true" or not result["yearPicker"] or "\u6536\u5165\u8d8b\u52bf" not in result["trend"] or result["category"] != "\u6536\u5165\u5206\u7c7b":
    raise SystemExit("RED: income chart did not activate")

if os.environ.get("LEDGER_SKIP_SCREENSHOTS") != "1":
    capture_screenshot("C:/Windows/Temp/chart-income-active.png")

print("GREEN: income chart activated and rendered income labels")
