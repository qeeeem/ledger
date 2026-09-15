import assert from "node:assert/strict";
import test from "node:test";

import { sortTransactionsByRecordDate } from "../src/transactionOrder.ts";

test("transactions are ordered by their record date before their save time", () => {
  const result = sortTransactionsByRecordDate([
    { id: 1, date: "2026-09-14", createdAt: "2026-09-15T10:00:00.000Z" },
    { id: 2, date: "2026-09-17", createdAt: "2026-09-14T10:00:00.000Z" },
    { id: 3, date: "2026-09-15", createdAt: "2026-09-15T11:00:00.000Z" },
  ]);

  assert.deepEqual(result.map((item) => item.date), [
    "2026-09-17",
    "2026-09-15",
    "2026-09-14",
  ]);
});

test("transactions on the same record date keep newest saves first", () => {
  const result = sortTransactionsByRecordDate([
    { id: 1, date: "2026-09-15", createdAt: "2026-09-15T10:00:00.000Z" },
    { id: 2, date: "2026-09-15", createdAt: "2026-09-15T11:00:00.000Z" },
  ]);

  assert.deepEqual(result.map((item) => item.id), [2, 1]);
});
