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


def open_nav(index, expected_selector):
    click_rect(rect(".nav-button", index))
    wait(0.35)
    if not js(f"!!document.querySelector({expected_selector!r})"):
        js(f"document.querySelectorAll('.nav-button')[{index}]?.click()")
        wait(0.35)


def account_balance():
    text = js("document.querySelector('.account-row > span')?.textContent || ''")
    return float(text.replace("\u00a5", "").replace(",", "").strip())


def assert_asset_unchanged(stage):
    open_nav(2, ".assets-screen")
    value = account_balance()
    if abs(value - 700) > 0.001:
        raise SystemExit(f"RED: asset balance changed after {stage}: {value}")


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
capture_screenshot("C:/Windows/Temp/asset-decoupling-before.png")

# Establish a manually maintained asset snapshot.
open_nav(2, ".assets-screen")
click_rect(rect(".account-row", 0))
wait(0.3)
replace_input(".full-screen-sheet .field input", "700")
click_rect(rect(".full-screen-sheet .primary"))
wait(0.5)
if abs(account_balance() - 700) > 0.001:
    raise SystemExit("RED: could not establish the asset baseline")

# Adding an expense must not change the asset snapshot.
open_nav(0, ".app.tab-details")
click_rect(rect(".add-entry"))
wait(0.3)
replace_input(".full-screen-sheet .amount-field input", "72")
click_rect(rect(".full-screen-sheet .primary"))
wait(0.6)
assert_asset_unchanged("adding a transaction")

# Editing the transaction must not change it either.
open_nav(0, ".app.tab-details")
click_rect(rect(".transaction-row .transaction-actions button", 0))
wait(0.3)
replace_input(".full-screen-sheet .amount-field input", "100")
click_rect(rect(".full-screen-sheet .primary"))
wait(0.6)
assert_asset_unchanged("editing a transaction")

# Deleting the transaction must remain decoupled.
open_nav(0, ".app.tab-details")
js("window.confirm=()=>true")
click_rect(rect(".transaction-row .transaction-actions button", 1))
wait(0.5)
if js("!!document.querySelector('.transaction-row')"):
    js("document.querySelector('.transaction-row .transaction-actions button:nth-child(2)')?.click()")
    wait(0.5)
assert_asset_unchanged("deleting a transaction")

capture_screenshot("C:/Windows/Temp/asset-decoupling-after.png")
print("GREEN: assets stayed independent from add/edit/delete transaction flows")
