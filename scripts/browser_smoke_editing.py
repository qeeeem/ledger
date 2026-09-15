import os

url = os.environ.get("LEDGER_TEST_URL", "http://127.0.0.1:4192/")


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


def parse_amount(value):
    return float(value.replace("\u00a5", "").replace(",", "").strip())


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
capture_screenshot("C:/Windows/Temp/editing-workflow-before.png")

open_nav(2, ".assets-screen")
initial_cash_balance = parse_amount(js("document.querySelector('.account-row > span')?.textContent") or "0")
open_nav(0, ".app.tab-details")

# Create a local test transaction for 10 yuan.
click_rect(rect(".add-entry"))
wait(0.3)
replace_input(".full-screen-sheet .amount-field input", "10")
click_rect(rect(".full-screen-sheet .primary"))
wait(0.6)

# Edit it to 25 yuan and ensure the row changes.
click_rect(rect(".transaction-row .transaction-actions button", 0))
wait(0.3)
if js("document.querySelector('.full-screen-sheet h2')?.textContent") != "\u4fee\u6539\u8bb0\u5f55":
    raise SystemExit("RED: transaction edit page did not open")
replace_input(".full-screen-sheet .amount-field input", "25")
click_rect(rect(".full-screen-sheet .primary"))
wait(0.6)
row_amount = js("document.querySelector('.transaction-row .amount')?.textContent") or ""
if "25" not in row_amount:
    raise SystemExit("RED: edited transaction amount was not saved")

# Transactions and assets are separate ledgers; editing must not change the asset snapshot.
open_nav(2, ".assets-screen")
cash_balance = js("document.querySelector('.account-row > span')?.textContent") or ""
if abs(parse_amount(cash_balance) - initial_cash_balance) > 0.001:
    raise SystemExit(f"RED: transaction edit changed the asset balance: {cash_balance}")

# The add-account flow must also use a full-screen page.
js("document.querySelector('.assets-screen .secondary')?.scrollIntoView({block:'center'})")
wait(0.25)
click_rect(rect(".assets-screen .secondary"))
wait(0.3)
if js("document.querySelector('.full-screen-sheet h2')?.textContent") != "\u6dfb\u52a0\u8d26\u6237":
    raise SystemExit("RED: add-account page is not full screen")
click_rect(rect(".full-screen-sheet .sheet-heading button"))
wait(0.3)

# Manually replace the balance and verify the list refreshes.
click_rect(rect(".account-row", 0))
wait(0.3)
if not js("!!document.querySelector('.full-screen-sheet')"):
    raise SystemExit("RED: balance editor is not full screen")
replace_input(".full-screen-sheet .field input", "100")
click_rect(rect(".full-screen-sheet .primary"))
wait(0.6)
cash_balance = js("document.querySelector('.account-row > span')?.textContent") or ""
if "100" not in cash_balance:
    raise SystemExit("RED: manual account balance edit was not saved")

# Update the monthly budget from the expense chart.
open_nav(1, ".charts-screen")
click_rect(rect(".budget-edit"))
wait(0.3)
if not js("!!document.querySelector('.full-screen-sheet')"):
    raise SystemExit("RED: budget editor is not full screen")
replace_input(".full-screen-sheet .amount-field input", "2000")
click_rect(rect(".full-screen-sheet .primary"))
wait(0.6)
budget_text = js("document.querySelector('.budget strong')?.textContent") or ""
if "2,000" not in budget_text:
    raise SystemExit("RED: monthly budget edit was not saved")

capture_screenshot("C:/Windows/Temp/editing-workflow-after.png")
print("GREEN: transaction edit, asset decoupling, manual balance edit, and budget edit passed")
