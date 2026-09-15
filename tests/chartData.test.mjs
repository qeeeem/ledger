import assert from "node:assert/strict";
import test from "node:test";

import { buildTrendData } from "../src/chartData.ts";

test("single-month trend reserves every calendar day and fills missing days with zero", () => {
  const result = buildTrendData([
    { date: "2026-09-04", amount: 40 },
    { date: "2026-09-06", amount: 60 },
  ], "month", "2026-09");

  assert.equal(result.length, 30);
  assert.deepEqual(result.slice(3, 6), [
    { date: "04", amount: 40 },
    { date: "05", amount: 0 },
    { date: "06", amount: 60 },
  ]);
});

test("year trend reserves all twelve months and fills missing months with zero", () => {
  const result = buildTrendData([
    { date: "2026-04-10", amount: 40 },
    { date: "2026-06-10", amount: 60 },
  ], "year", "2026");

  assert.equal(result.length, 12);
  assert.deepEqual(result.slice(3, 6), [
    { date: "04月", amount: 40 },
    { date: "05月", amount: 0 },
    { date: "06月", amount: 60 },
  ]);
});
