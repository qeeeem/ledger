import { openDB, type DBSchema } from "idb";
import { DEFAULT_ANNUAL_BUDGET, DEFAULT_MONTHLY_BUDGET } from "./budget";
import { sortTransactionsByRecordDate } from "./transactionOrder";

export type TransactionType = "expense" | "income";

export interface LedgerTransaction {
  id?: number;
  type: TransactionType;
  amount: number;
  category: string;
  account: string;
  note: string;
  date: string;
  createdAt: string;
}

export interface LedgerAccount {
  id?: number;
  name: string;
  kind: "cash" | "bank" | "virtual" | "investment";
  balance: number;
  accent: string;
}

export interface NetWorthSnapshot {
  month: string;
  total: number;
}

export interface ImportSummary {
  addedTransactions: number;
  skippedTransactions: number;
  addedAccounts: number;
  updatedAccounts: number;
}

interface LedgerDB extends DBSchema {
  transactions: {
    key: number;
    value: LedgerTransaction;
    indexes: { "by-date": string };
  };
  accounts: { key: number; value: LedgerAccount };
  meta: { key: string; value: { key: string; value: boolean | number | string[] | NetWorthSnapshot[] } };
}

const database = openDB<LedgerDB>("own-ledger", 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      const transactions = db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
      transactions.createIndex("by-date", "date");
      db.createObjectStore("accounts", { keyPath: "id", autoIncrement: true });
      db.createObjectStore("meta", { keyPath: "key" });
    }
    if (oldVersion < 2 && !db.objectStoreNames.contains("meta")) {
      db.createObjectStore("meta", { keyPath: "key" });
    }
  },
});

const defaultAccounts: LedgerAccount[] = [
  { name: "现金", kind: "cash", balance: 0, accent: "#16b99a" },
  { name: "银行卡", kind: "bank", balance: 0, accent: "#eb3347" },
  { name: "支付宝", kind: "virtual", balance: 0, accent: "#1b93ef" },
  { name: "微信", kind: "virtual", balance: 0, accent: "#1fc66a" },
];

export const expenseCategories = ["餐饮", "晚餐", "午餐", "交通", "购物", "学习", "娱乐", "日用", "医疗", "旅行", "住房", "其它"];
export const incomeCategories = ["工资", "兼职", "理财", "礼金", "红包", "其它"];

export async function getCategories(type: TransactionType) {
  const db = await database;
  const saved = await db.get("meta", `${type}-categories`);
  return Array.isArray(saved?.value) && saved.value.every((item) => typeof item === "string")
    ? saved.value as string[]
    : type === "expense" ? expenseCategories : incomeCategories;
}

export async function addCategory(type: TransactionType, category: string) {
  const name = category.trim();
  if (!name) return getCategories(type);
  const categories = await getCategories(type);
  if (categories.includes(name)) return categories;
  const next = [...categories, name];
  const db = await database;
  await db.put("meta", { key: `${type}-categories`, value: next });
  return next;
}

export async function deleteCategory(type: TransactionType, category: string) {
  const db = await database;
  const transactions = await db.getAll("transactions");
  if (transactions.some((item) => item.type === type && item.category === category)) return false;
  const categories = await getCategories(type);
  await db.put("meta", { key: `${type}-categories`, value: categories.filter((item) => item !== category) });
  return true;
}

export async function initializeDatabase() {
  const db = await database;
  const tx = db.transaction(["meta", "accounts"], "readwrite");
  const initialized = await tx.objectStore("meta").get("initialized");
  if (!initialized?.value) {
    for (const account of defaultAccounts) await tx.objectStore("accounts").add(account);
    await tx.objectStore("meta").put({ key: "initialized", value: true });
  }
  await tx.done;
  await recordNetWorthSnapshot();
}

export async function getTransactions() {
  const db = await database;
  return sortTransactionsByRecordDate(await db.getAll("transactions"));
}

export async function addTransaction(item: LedgerTransaction) {
  const db = await database;
  return db.add("transactions", item);
}

export async function updateTransaction(id: number, item: LedgerTransaction) {
  const db = await database;
  const previous = await db.get("transactions", id);
  if (!previous) throw new Error("记录不存在");
  await db.put("transactions", { ...item, id, createdAt: previous.createdAt });
}

export async function deleteTransaction(id: number) {
  const db = await database;
  await db.delete("transactions", id);
}

export async function getAccounts() {
  const db = await database;
  return db.getAll("accounts");
}

export async function addAccount(item: LedgerAccount) {
  const db = await database;
  const id = await db.add("accounts", item);
  await recordNetWorthSnapshot();
  return id;
}

export async function updateAccountBalance(id: number, balance: number) {
  const db = await database;
  const account = await db.get("accounts", id);
  if (!account) throw new Error("账户不存在");
  account.balance = balance;
  await db.put("accounts", account);
  await recordNetWorthSnapshot();
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function recordNetWorthSnapshot() {
  const db = await database;
  const accounts = await db.getAll("accounts");
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  const saved = await db.get("meta", "net-worth-snapshots");
  const snapshots = Array.isArray(saved?.value) && saved.value.every((item) => typeof item === "object" && item !== null && "month" in item && "total" in item)
    ? saved.value as NetWorthSnapshot[]
    : [];
  const month = currentMonthKey();
  const next = [...snapshots.filter((item) => item.month !== month), { month, total }].sort((a, b) => a.month.localeCompare(b.month));
  await db.put("meta", { key: "net-worth-snapshots", value: next });
}

export async function getNetWorthTrend(year = new Date().getFullYear()) {
  const db = await database;
  const saved = await db.get("meta", "net-worth-snapshots");
  const snapshots = Array.isArray(saved?.value) && saved.value.every((item) => typeof item === "object" && item !== null && "month" in item && "total" in item)
    ? saved.value as NetWorthSnapshot[]
    : [];
  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const snapshot = snapshots.find((item) => item.month === `${year}-${monthNumber}`);
    return { month: `${index + 1}月`, total: snapshot?.total ?? null };
  });
}

export async function getMonthlyBudget() {
  const db = await database;
  const saved = await db.get("meta", "monthly-budget");
  return typeof saved?.value === "number" ? saved.value : DEFAULT_MONTHLY_BUDGET;
}

export async function saveMonthlyBudget(value: number) {
  const db = await database;
  await db.put("meta", { key: "monthly-budget", value });
}

export async function getAnnualBudget() {
  const db = await database;
  const saved = await db.get("meta", "annual-budget");
  return typeof saved?.value === "number" ? saved.value : DEFAULT_ANNUAL_BUDGET;
}

export async function saveAnnualBudget(value: number) {
  const db = await database;
  await db.put("meta", { key: "annual-budget", value });
}

export async function exportLedgerWorkbook() {
  const XLSX = await import("xlsx");
  const db = await database;
  const [transactions, accounts, monthlyBudget, annualBudget, savedExpenseCategories, savedIncomeCategories, savedSnapshots] = await Promise.all([
    getTransactions(),
    getAccounts(),
    getMonthlyBudget(),
    getAnnualBudget(),
    getCategories("expense"),
    getCategories("income"),
    db.get("meta", "net-worth-snapshots"),
  ]);
  const transactionRows = transactions.map((item) => ({
    日期: item.date,
    类型: item.type === "expense" ? "支出" : "收入",
    分类: item.category,
    金额: item.amount,
    账户: item.account,
    备注: item.note,
    创建时间: item.createdAt,
  }));
  const accountRows = accounts.map((item) => ({
    账户名称: item.name,
    账户类型: item.kind === "cash" ? "现金" : item.kind === "bank" ? "储蓄卡" : item.kind === "virtual" ? "虚拟账户" : "投资账户",
    当前余额: item.balance,
  }));
  const settingRows = [
    { 配置项: "月度预算", 值: JSON.stringify(monthlyBudget) },
    { 配置项: "年度预算", 值: JSON.stringify(annualBudget) },
    { 配置项: "支出分类", 值: JSON.stringify(savedExpenseCategories) },
    { 配置项: "收入分类", 值: JSON.stringify(savedIncomeCategories) },
    { 配置项: "净资产快照", 值: JSON.stringify(savedSnapshots?.value ?? []) },
  ];

  const workbook = XLSX.utils.book_new();
  const transactionSheet = XLSX.utils.json_to_sheet(transactionRows.length ? transactionRows : [{ 日期: "", 类型: "", 分类: "", 金额: "", 账户: "", 备注: "", 创建时间: "" }]);
  const accountSheet = XLSX.utils.json_to_sheet(accountRows);
  const settingSheet = XLSX.utils.json_to_sheet(settingRows);
  transactionSheet["!cols"] = [{ wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 24 }, { wch: 24 }];
  accountSheet["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }];
  settingSheet["!cols"] = [{ wch: 18 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, transactionSheet, "账单明细");
  XLSX.utils.book_append_sheet(workbook, accountSheet, "资产账户");
  XLSX.utils.book_append_sheet(workbook, settingSheet, "账本设置");
  XLSX.writeFile(workbook, `我的账本-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

type WorkbookRow = Record<string, unknown>;

function textValue(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  return Number(textValue(value).replace(/,/g, ""));
}

function dateValue(value: unknown, parseSerialDate: (value: number) => { y: number; m: number; d: number } | null) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number") {
    const parsed = parseSerialDate(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const match = textValue(value).match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!match) return "";
  const result = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const parsed = new Date(`${result}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.getFullYear() === Number(match[1]) && parsed.getMonth() + 1 === Number(match[2]) && parsed.getDate() === Number(match[3]) ? result : "";
}

function transactionFingerprint(item: LedgerTransaction) {
  return [item.date, item.type, item.amount, item.category, item.account, item.note, item.createdAt].join("\u0000");
}

function parseJsonSetting<T>(rows: WorkbookRow[], name: string, validate: (value: unknown) => value is T) {
  const raw = rows.find((row) => textValue(row.配置项) === name)?.值;
  if (raw == null || raw === "") return undefined;
  try {
    const value: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    return validate(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSnapshotArray(value: unknown): value is NetWorthSnapshot[] {
  return Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null && typeof (item as NetWorthSnapshot).month === "string" && typeof (item as NetWorthSnapshot).total === "number");
}

export async function importLedgerWorkbook(file: File): Promise<ImportSummary> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const transactionSheet = workbook.Sheets["账单明细"];
  const accountSheet = workbook.Sheets["资产账户"];
  const settingSheet = workbook.Sheets["账本设置"];
  if (!transactionSheet && !accountSheet && !settingSheet) throw new Error("未找到“账单明细”或“资产账户”工作表");

  const transactionRows = transactionSheet ? XLSX.utils.sheet_to_json<WorkbookRow>(transactionSheet, { defval: "" }) : [];
  const accountRows = accountSheet ? XLSX.utils.sheet_to_json<WorkbookRow>(accountSheet, { defval: "" }) : [];
  const settingRows = settingSheet ? XLSX.utils.sheet_to_json<WorkbookRow>(settingSheet, { defval: "" }) : [];
  const errors: string[] = [];
  const importedTransactions: LedgerTransaction[] = [];
  const parseSerialDate = (value: number) => XLSX.SSF.parse_date_code(value);

  transactionRows.forEach((row, index) => {
    if (Object.values(row).every((value) => textValue(value) === "")) return;
    const typeText = textValue(row.类型).toLowerCase();
    const type: TransactionType | undefined = typeText === "支出" || typeText === "expense" ? "expense" : typeText === "收入" || typeText === "income" ? "income" : undefined;
    const amount = numberValue(row.金额);
    const date = dateValue(row.日期, parseSerialDate);
    const category = textValue(row.分类);
    const account = textValue(row.账户);
    if (!type || !Number.isFinite(amount) || amount <= 0 || !date || !category || !account) {
      errors.push(`账单明细第 ${index + 2} 行格式不正确`);
      return;
    }
    const rawCreatedAt = row.创建时间 instanceof Date ? row.创建时间.toISOString() : textValue(row.创建时间);
    const parsedCreatedAt = rawCreatedAt ? new Date(rawCreatedAt) : null;
    importedTransactions.push({
      type,
      amount,
      category,
      account,
      note: textValue(row.备注),
      date,
      createdAt: parsedCreatedAt && !Number.isNaN(parsedCreatedAt.getTime()) ? parsedCreatedAt.toISOString() : `${date}T12:00:00.000Z`,
    });
  });

  const kindByName: Record<string, LedgerAccount["kind"]> = {
    现金: "cash",
    cash: "cash",
    储蓄卡: "bank",
    银行卡: "bank",
    bank: "bank",
    虚拟账户: "virtual",
    virtual: "virtual",
    投资账户: "investment",
    investment: "investment",
  };
  const accentByKind: Record<LedgerAccount["kind"], string> = { cash: "#16b99a", bank: "#eb3347", virtual: "#1b93ef", investment: "#8b6fe8" };
  const importedAccounts: LedgerAccount[] = [];
  accountRows.forEach((row, index) => {
    if (Object.values(row).every((value) => textValue(value) === "")) return;
    const name = textValue(row.账户名称);
    const kind = kindByName[textValue(row.账户类型).toLowerCase()];
    const balance = numberValue(row.当前余额);
    if (!name || !kind || !Number.isFinite(balance)) {
      errors.push(`资产账户第 ${index + 2} 行格式不正确`);
      return;
    }
    importedAccounts.push({ name, kind, balance, accent: accentByKind[kind] });
  });
  if (errors.length) throw new Error(`${errors.slice(0, 3).join("；")}${errors.length > 3 ? `；另有 ${errors.length - 3} 行` : ""}`);

  const importedMonthlyBudget = parseJsonSetting(settingRows, "月度预算", (value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  const importedAnnualBudget = parseJsonSetting(settingRows, "年度预算", (value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  const importedExpenseCategories = parseJsonSetting(settingRows, "支出分类", isStringArray);
  const importedIncomeCategories = parseJsonSetting(settingRows, "收入分类", isStringArray);
  const importedSnapshots = parseJsonSetting(settingRows, "净资产快照", isSnapshotArray);
  const db = await database;
  const [existingTransactions, existingAccounts, currentExpenseCategories, currentIncomeCategories] = await Promise.all([
    db.getAll("transactions"),
    db.getAll("accounts"),
    getCategories("expense"),
    getCategories("income"),
  ]);
  const tx = db.transaction(["transactions", "accounts", "meta"], "readwrite");
  const transactionStore = tx.objectStore("transactions");
  const accountStore = tx.objectStore("accounts");
  const metaStore = tx.objectStore("meta");
  const fingerprints = new Set(existingTransactions.map(transactionFingerprint));
  let addedTransactions = 0;
  let skippedTransactions = 0;
  for (const item of importedTransactions) {
    const fingerprint = transactionFingerprint(item);
    if (fingerprints.has(fingerprint)) {
      skippedTransactions += 1;
      continue;
    }
    await transactionStore.add(item);
    fingerprints.add(fingerprint);
    addedTransactions += 1;
  }

  const accountsByName = new Map(existingAccounts.map((item) => [item.name.trim(), item]));
  let addedAccounts = 0;
  let updatedAccounts = 0;
  for (const item of importedAccounts) {
    const existing = accountsByName.get(item.name);
    if (existing?.id) {
      await accountStore.put({ ...existing, kind: item.kind, balance: item.balance });
      updatedAccounts += 1;
    } else {
      const id = await accountStore.add(item);
      accountsByName.set(item.name, { ...item, id });
      addedAccounts += 1;
    }
  }

  const categoriesFromTransactions = (type: TransactionType) => importedTransactions.filter((item) => item.type === type).map((item) => item.category);
  await metaStore.put({ key: "expense-categories", value: Array.from(new Set([...currentExpenseCategories, ...(importedExpenseCategories ?? []), ...categoriesFromTransactions("expense")])) });
  await metaStore.put({ key: "income-categories", value: Array.from(new Set([...currentIncomeCategories, ...(importedIncomeCategories ?? []), ...categoriesFromTransactions("income")])) });
  if (importedMonthlyBudget != null) await metaStore.put({ key: "monthly-budget", value: importedMonthlyBudget });
  if (importedAnnualBudget != null) await metaStore.put({ key: "annual-budget", value: importedAnnualBudget });
  if (importedSnapshots) {
    const saved = await metaStore.get("net-worth-snapshots");
    const currentSnapshots = isSnapshotArray(saved?.value) ? saved.value : [];
    const snapshotsByMonth = new Map(currentSnapshots.map((item) => [item.month, item]));
    importedSnapshots.forEach((item) => snapshotsByMonth.set(item.month, item));
    await metaStore.put({ key: "net-worth-snapshots", value: Array.from(snapshotsByMonth.values()).sort((a, b) => a.month.localeCompare(b.month)) });
  }
  await tx.done;
  await recordNetWorthSnapshot();
  return { addedTransactions, skippedTransactions, addedAccounts, updatedAccounts };
}
