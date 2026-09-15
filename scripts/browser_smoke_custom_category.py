import os
import time

url = os.environ.get("LEDGER_TEST_URL", "http://127.0.0.1:4177/")
category_name = f"\u6d4b\u8bd5\u5206\u7c7b{int(time.time())}"


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


def screenshot(path):
    if os.environ.get("LEDGER_SKIP_SCREENSHOTS") != "1":
        capture_screenshot(path)


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
wait(0.6)
screenshot("C:/Windows/Temp/custom-category-home.png")

click_rect(rect(".nav-button", 3))
wait(0.3)
if not js("!!document.querySelector('.settings-screen')"):
    js("document.querySelectorAll('.nav-button')[3]?.click()")
    wait(0.3)
screenshot("C:/Windows/Temp/custom-category-settings.png")

if not js("(()=>{const button=document.querySelector('.settings-screen .category-add');const list=document.querySelector('.settings-screen .categories-card');return !!(button&&list&&(button.compareDocumentPosition(list)&Node.DOCUMENT_POSITION_FOLLOWING))})()"):
    raise SystemExit("RED: add-category entry is not before the category list")

js("document.querySelector('.settings-screen .secondary')?.scrollIntoView({block:'center'})")
wait(0.3)
button_rect = rect(".settings-screen .secondary")

screenshot("C:/Windows/Temp/custom-category-before-open.png")
click_rect(button_rect)
wait(0.25)

if not js("!!document.querySelector('.modal-layer[role=dialog]')"):
    js("document.querySelector('.settings-screen .category-add')?.click()")
    wait(0.25)
if not js("!!document.querySelector('.modal-layer[role=dialog]')"):
    raise SystemExit("RED: add-category dialog did not open")

category_geometry = js(
    "(()=>{const r=document.querySelector('.full-screen-sheet')?.getBoundingClientRect();"
    "return r?{y:r.y,h:r.height,viewport:window.innerHeight}:null})()"
)
if not category_geometry or category_geometry["y"] > 1 or category_geometry["h"] < category_geometry["viewport"] - 2:
    raise SystemExit("RED: add-category page is not full screen")

screenshot("C:/Windows/Temp/custom-category-dialog.png")
click_rect(rect(".modal-layer input"))
cdp("Input.insertText", text=category_name)
wait(0.1)
click_rect(rect(".modal-layer .primary"))
wait(0.5)
if js("!!document.querySelector('.modal-layer .primary')"):
    js("document.querySelector('.modal-layer .primary')?.click()")
    wait(0.5)

result = js(
    f"({{saved:[...document.querySelectorAll('.categories-card strong')].some(e=>e.textContent==={category_name!r}),"
    "toast:document.querySelector('.toast')?.textContent?.trim() || ''})"
)
print(result)
if not result["saved"] or "\u5206\u7c7b\u5df2\u6dfb\u52a0" not in result["toast"]:
    raise SystemExit("RED: custom category was not persisted into settings")

screenshot("C:/Windows/Temp/custom-category-saved.png")
click_rect(rect(".add-entry"))
wait(0.3)
if not js("!!document.querySelector('.full-screen-sheet .amount-field')"):
    js("document.querySelector('.add-entry')?.click()")
    wait(0.3)
option_present = js(
    f"[...document.querySelectorAll('.modal-layer select option')].some(e=>e.textContent==={category_name!r})"
)
if not option_present:
    raise SystemExit("RED: custom category is unavailable when recording a transaction")

entry_geometry = js(
    "(()=>{const r=document.querySelector('.full-screen-sheet')?.getBoundingClientRect();"
    "return r?{y:r.y,h:r.height,viewport:window.innerHeight}:null})()"
)
if not entry_geometry or entry_geometry["y"] > 1 or entry_geometry["h"] < entry_geometry["viewport"] - 2:
    raise SystemExit("RED: transaction page is not full screen")

screenshot("C:/Windows/Temp/custom-category-transaction.png")
print(f"GREEN: custom category persisted and transaction page is full screen: {category_name}")
