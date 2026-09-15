# Design QA — 2026-09-15 production release

## Evidence

- Source visual truth: `C:\Users\Administrator\Desktop\Snipaste_2026-09-15_11-16-35.png` (annotated home-screen request) and `C:\Users\Administrator\Desktop\边框.png` (pie-chart focus outline report).
- Full-view comparison: `design-comparison-20260915.png`.
- Browser-rendered production home: `qa-production-20260915-home.png`.
- Production annual budget: `qa-production-20260915-annual.png` and `qa-production-20260915-annual-modal.png`.
- Focused pie-chart checks: `qa-pie-expense-no-focus.png` and `qa-pie-income-no-focus.png`.
- Viewport: 393 × 852 CSS px, deviceScaleFactor 1.
- Source home pixels: 1060 × 1125; the 483 × 1045 device region was cropped and normalized to 393 × 852 for the comparison artifact.
- Implementation pixels: 393 × 852.
- State: home/details, expense chart, income chart, annual expense budget, and annual budget editor.
- Device chrome: the iOS status bar and home indicator in the source are device-owned and excluded from app-layout findings.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the existing Apple/PingFang stack, weights, hierarchy, and numeric alignment remain consistent. The home month now renders as `09` without the `月` suffix.
- Spacing and layout rhythm: the home header and shortcut panel move upward; the scroll viewport begins at 232 px rather than 265 px; the bottom navigation begins at 790 px in the 393 × 852 browser viewport. Denser day headings and rows expose substantially more ledger content without clipping persistent controls.
- Colors and visual tokens: the yellow, paper, ink, green, dividers, cards, radii, and shadows remain unchanged from the existing product language.
- Image and icon fidelity: no custom raster assets were introduced. Existing Phosphor UI icons remain sharp and consistent.
- Copy and content: monthly and annual budgets are explicitly labeled and edited separately. Excel settings export/import includes both `月度预算` and `年度预算`.
- Pie-chart focus: both income and expense pie charts render with no click outline. The SVG is removed from the accessibility focus layer, uses `tabIndex=-1`, prevents pointer focus, and retains a defensive `outline: none !important` focus rule.

## Comparison history

1. Initial annotated-home pass
   - Earlier P1: header/shortcut region and bottom navigation consumed too much of the visible ledger area; month suffix remained visible.
   - Fix: reduced home header/scroll offset from 265 px to 232 px, moved the shortcut panel from 164 px to 146 px, reduced navigation height from 72 px to 62 px, shifted button padding downward, tightened list rhythm, and removed the month suffix.
   - Post-fix evidence: `design-comparison-20260915.png`, `qa-production-20260915-home.png`.
2. Transaction ordering pass
   - Earlier P1: records were ordered by save timestamp, allowing a 9/17 record saved earlier to appear below a 9/15 record.
   - Fix: order by record date descending, then save timestamp descending, then id descending.
   - Post-fix evidence: two passing transaction-order tests.
3. Pie-chart focus pass
   - Earlier P2: clicking either pie chart produced a browser focus rectangle.
   - Fix: first removed the outline in chart CSS, then disabled the chart accessibility focus layer and pointer focus for a durable cross-browser result.
   - Post-fix evidence: `qa-pie-expense-no-focus.png`, `qa-pie-income-no-focus.png`; production CSSOM contains both no-outline rules.
4. Independent annual budget pass
   - Earlier P1: annual budget was calculated as monthly budget × 12.
   - Fix: added separately persisted monthly and annual settings, period-specific editors, and Excel import/export support.
   - Post-fix evidence: annual budget changed to ¥26,000 locally while monthly remained ¥1,500; production opens `修改年预算` with its independent value.

## Interaction and runtime checks

- Home, charts, details navigation, entry opening, month/year switching, income/expense switching, and budget editing were exercised in the browser.
- Production loaded `assets/index-53mhyiZb.js` and `assets/index-D9qqeRWd.css`.
- Production application console errors checked: none.
- Automated tests: 5 passed.
- Production build: passed.

## Follow-up polish

- No P3 follow-up is required for this release.

final result: passed
