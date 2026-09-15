import os

url = os.environ.get("LEDGER_TEST_URL", "http://127.0.0.1:4192/")
test_prefix = "\u6d4b\u8bd5\u5206\u7c7b"


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

click_rect(rect(".nav-button", 3))
wait(0.4)
if not js("!!document.querySelector('.settings-screen')"):
    js("document.querySelectorAll('.nav-button')[3]?.click()")
    wait(0.4)

js("window.confirm=()=>true")

# The first expense category is used by the test transactions and must remain.
used_name = js("document.querySelector('.categories-card .category-setting strong')?.textContent")
click_rect(rect(".categories-card .category-setting button", 0))
wait(0.5)
if not js("document.querySelector('.toast')?.textContent"):
    js("document.querySelector('.categories-card .category-setting button')?.click()")
    wait(0.5)
used_still_exists = js(
    f"[...document.querySelectorAll('.categories-card .category-setting strong')].some(e=>e.textContent==={used_name!r})"
)
toast = js("document.querySelector('.toast')?.textContent || ''")
print({"used": used_name, "still_exists": used_still_exists, "toast": toast})
if not used_still_exists or "\u4e0d\u80fd\u5220\u9664" not in toast:
    raise SystemExit("RED: an in-use category was deleted or no warning was shown")

# A generated, unused category must be removable.
unused = js(
    f"[...document.querySelectorAll('.categories-card .category-setting strong')].map(e=>e.textContent).find(t=>t.startsWith({test_prefix!r}))"
)
if not unused:
    raise SystemExit("RED: no unused test category is available")
unused_button = js(
    f"(()=>{{const row=[...document.querySelectorAll('.categories-card .category-setting')].find(e=>e.querySelector('strong')?.textContent==={unused!r});"
    "const r=row?.querySelector('button')?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null})()"
)
js(
    f"[...document.querySelectorAll('.categories-card .category-setting')].find(e=>e.querySelector('strong')?.textContent==={unused!r})?.scrollIntoView({{block:'center'}})"
)
wait(0.25)
unused_button = js(
    f"(()=>{{const row=[...document.querySelectorAll('.categories-card .category-setting')].find(e=>e.querySelector('strong')?.textContent==={unused!r});"
    "const r=row?.querySelector('button')?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null})()"
)
click_rect(unused_button)
wait(0.5)
unused_still_exists = js(
    f"[...document.querySelectorAll('.categories-card .category-setting strong')].some(e=>e.textContent==={unused!r})"
)
if unused_still_exists:
    js(
        f"[...document.querySelectorAll('.categories-card .category-setting')].find(e=>e.querySelector('strong')?.textContent==={unused!r})?.querySelector('button')?.click()"
    )
    wait(0.5)
    unused_still_exists = js(
        f"[...document.querySelectorAll('.categories-card .category-setting strong')].some(e=>e.textContent==={unused!r})"
    )
if unused_still_exists:
    raise SystemExit("RED: an unused category could not be deleted")

capture_screenshot("C:/Windows/Temp/category-delete-result.png")
print("GREEN: in-use category was protected and unused category was deleted")
