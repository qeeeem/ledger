import assert from "node:assert/strict";
import test from "node:test";

import { budgetForPeriod } from "../src/budget.ts";

test("annual budget is independent from the monthly budget", () => {
  assert.equal(budgetForPeriod("month", 1500, 26000), 1500);
  assert.equal(budgetForPeriod("year", 1500, 26000), 26000);
});
