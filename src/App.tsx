import { useEffect, useMemo, useState } from "react";
import {
  Bank,
  BowlFood,
  ChartLineUp,
  Check,
  Coins,
  DownloadSimple,
  ForkKnife,
  House,
  ListBullets,
  Money,
  PencilSimple,
  Plus,
  Receipt,
  ShieldCheck,
  Trash,
  TrendUp,
  UploadSimple,
  UserCircle,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  addAccount,
  addCategory,
  addTransaction,
  deleteCategory,
  deleteTransaction,
  expenseCategories,
  exportLedgerWorkbook,
  getAccounts,
  getAnnualBudget,
  getCategories,
  getMonthlyBudget,
  getNetWorthTrend,
  getTransactions,
  importLedgerWorkbook,
  incomeCategories,
  initializeDatabase,
  saveMonthlyBudget,
  saveAnnualBudget,
  updateAccountBalance,
  updateTransaction,
  type LedgerAccount,
  type LedgerTransaction,
  type TransactionType,
} from "./db";
import { budgetForPeriod, DEFAULT_ANNUAL_BUDGET, DEFAULT_MONTHLY_BUDGET, type BudgetPeriod } from "./budget";
import { buildTrendData } from "./chartData";

type Tab = "details" | "charts" | "assets" | "settings";
const currency = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });

const navItems = [
  { id: "details" as Tab, label: "明细", icon: ListBullets },
  { id: "charts" as Tab, label: "图表", icon: ChartLineUp },
  { id: "assets" as Tab, label: "资产", icon: Wallet },
  { id: "settings" as Tab, label: "我的", icon: UserCircle },
];

const kindNames: Record<LedgerAccount["kind"], string> = {
  cash: "现金",
  bank: "储蓄卡",
  virtual: "虚拟账户",
  investment: "投资账户",
};

function categoryIcon(category: string) {
  if (["餐饮", "晚餐", "午餐"].includes(category)) return ForkKnife;
  if (["工资", "兼职", "理财"].includes(category)) return TrendUp;
  if (category === "住房") return House;
  if (category === "学习") return PencilSimple;
  return Receipt;
}

function dateHeading(date: string) {
  const value = new Date(`${date}T12:00:00`);
  return `${String(value.getMonth() + 1).padStart(2, "0")}月${String(value.getDate()).padStart(2, "0")}日  ${value.toLocaleDateString("zh-CN", { weekday: "short" })}`;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("details");
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<LedgerTransaction | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [balanceAccount, setBalanceAccount] = useState<LedgerAccount | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>("month");
  const [toast, setToast] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState(DEFAULT_MONTHLY_BUDGET);
  const [annualBudget, setAnnualBudget] = useState(DEFAULT_ANNUAL_BUDGET);
  const [netWorthTrend, setNetWorthTrend] = useState<Array<{ month: string; total: number | null }>>([]);
  const [categories, setCategories] = useState({ expense: expenseCategories, income: incomeCategories });

  const refresh = async () => {
    const [nextTransactions, nextAccounts, nextExpenseCategories, nextIncomeCategories, nextMonthlyBudget, nextAnnualBudget, nextNetWorthTrend] = await Promise.all([
      getTransactions(),
      getAccounts(),
      getCategories("expense"),
      getCategories("income"),
      getMonthlyBudget(),
      getAnnualBudget(),
      getNetWorthTrend(),
    ]);
    setTransactions(nextTransactions);
    setAccounts(nextAccounts);
    setCategories({ expense: nextExpenseCategories, income: nextIncomeCategories });
    setMonthlyBudget(nextMonthlyBudget);
    setAnnualBudget(nextAnnualBudget);
    setNetWorthTrend(nextNetWorthTrend);
  };

  useEffect(() => {
    initializeDatabase().then(refresh);
  }, []);

  const totals = useMemo(
    () => transactions.reduce((result, item) => {
      result[item.type] += item.amount;
      return result;
    }, { expense: 0, income: 0 }),
    [transactions],
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const handleExport = async () => {
    await exportLedgerWorkbook();
    notify("Excel 已生成");
  };

  const handleImport = async (file: File) => {
    if (!window.confirm("把这个 Excel 合并到当前账本？已有的相同账单会自动跳过，同名账户余额会以导入文件为准。")) return;
    try {
      const result = await importLedgerWorkbook(file);
      await refresh();
      notify(`已导入 ${result.addedTransactions} 笔账单、${result.addedAccounts + result.updatedAccounts} 个账户${result.skippedTransactions ? `，跳过 ${result.skippedTransactions} 笔重复账单` : ""}`);
    } catch (error) {
      window.alert(`导入失败：${error instanceof Error ? error.message : "无法读取这个文件"}`);
    }
  };

  const remove = async (item: LedgerTransaction) => {
    if (!item.id || !window.confirm(`删除“${item.note || item.category}”这笔记录？`)) return;
    await deleteTransaction(item.id);
    await refresh();
    notify("记录已删除");
  };

  return (
    <div className={`app tab-${tab}`}>
      <Header tab={tab} income={totals.income} expense={totals.expense} />
      {tab === "details" && <QuickPanel onNavigate={setTab} onExport={handleExport} onOpenBills={() => setBillOpen(true)} />}
      <main className="scroll-area">
        {tab === "details" && <Details transactions={transactions} onDelete={remove} onEdit={(item) => { setEditingTransaction(item); setEntryOpen(true); }} />}
        {tab === "charts" && <Charts transactions={transactions} monthlyBudget={monthlyBudget} annualBudget={annualBudget} onEditBudget={(period) => { setBudgetPeriod(period); setBudgetOpen(true); }} />}
        {tab === "assets" && <Assets accounts={accounts} trend={netWorthTrend} onAdd={() => setAccountOpen(true)} onEditBalance={setBalanceAccount} />}
        {tab === "settings" && (
          <Settings categories={categories} onExport={handleExport} onImport={handleImport} onAddCategory={() => setCategoryOpen(true)} onDeleteCategory={async (type, category) => { const deleted = await deleteCategory(type, category); if (!deleted) { notify("该分类已有记录，不能删除"); return; } await refresh(); notify("分类已删除"); }} />
        )}
      </main>
      <nav className="bottom-nav" aria-label="主导航">
        {navItems.slice(0, 2).map((item) => <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />)}
        <button className="add-entry" onClick={() => { setEditingTransaction(null); setEntryOpen(true); }} aria-label="记一笔"><Plus size={34} /><span>记账</span></button>
        {navItems.slice(2).map((item) => <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />)}
      </nav>
      {entryOpen && <TransactionModal transaction={editingTransaction ?? undefined} accounts={accounts} categoryOptions={categories} onClose={() => { setEntryOpen(false); setEditingTransaction(null); }} onSaved={async () => { const wasEditing = Boolean(editingTransaction); await refresh(); setEntryOpen(false); setEditingTransaction(null); setTab("details"); notify(wasEditing ? "记录已更新" : "已经记下来了"); }} />}
      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} onSaved={async () => { await refresh(); setAccountOpen(false); notify("账户已添加"); }} />}
      {balanceAccount && <AccountBalanceModal account={balanceAccount} onClose={() => setBalanceAccount(null)} onSaved={async () => { await refresh(); setBalanceAccount(null); notify("账户余额已更新"); }} />}
      {categoryOpen && <CategoryModal onClose={() => setCategoryOpen(false)} onSaved={async (type, name) => { await addCategory(type, name); await refresh(); setCategoryOpen(false); notify("分类已添加"); }} />}
      {billOpen && <BillBrowser transactions={transactions} onClose={() => setBillOpen(false)} />}
      {budgetOpen && <BudgetModal period={budgetPeriod} value={budgetPeriod === "month" ? monthlyBudget : annualBudget} onClose={() => setBudgetOpen(false)} onSaved={async (value) => { if (budgetPeriod === "month") await saveMonthlyBudget(value); else await saveAnnualBudget(value); await refresh(); setBudgetOpen(false); notify(`${budgetPeriod === "month" ? "月" : "年"}预算已更新`); }} />}
      {toast && <div className="toast"><Check size={18} weight="bold" />{toast}</div>}
    </div>
  );
}

function QuickPanel({ onNavigate, onExport, onOpenBills }: { onNavigate: (tab: Tab) => void; onExport: () => void; onOpenBills: () => void }) {
  const items = [
    { label: "账单", icon: Receipt, action: onOpenBills },
    { label: "预算", icon: Coins, action: () => onNavigate("charts") },
    { label: "资产管家", icon: Wallet, action: () => onNavigate("assets") },
    { label: "导出", icon: UploadSimple, action: onExport },
  ];
  return <div className="quick-shell"><div className="quick-panel">{items.map((item) => { const Icon = item.icon; return <button key={item.label} onClick={item.action}><span><Icon size={23} weight="regular" /></span><small>{item.label}</small></button>; })}</div></div>;
}

function BillBrowser({ transactions, onClose }: { transactions: LedgerTransaction[]; onClose: () => void }) {
  const defaultMonth = transactions[0]?.date.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultMonth.slice(0, 4));
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [type, setType] = useState<"all" | TransactionType>("all");
  const availableYears = Array.from(new Set([new Date().getFullYear().toString(), ...transactions.map((item) => item.date.slice(0, 4))])).sort().reverse();
  const periodPrefix = period === "month" ? month : year;
  const periodLabel = period === "month" ? `${month.replace("-", "年")}月` : `${year}年`;
  const filtered = transactions.filter((item) => item.date.startsWith(periodPrefix) && (type === "all" || item.type === type));
  const totals = filtered.reduce((result, item) => {
    result[item.type] += item.amount;
    return result;
  }, { expense: 0, income: 0 });

  return <div className="modal-layer bill-browser" role="dialog" aria-modal="true" aria-label="账单浏览">
    <button className="modal-backdrop" onClick={onClose} aria-label="关闭账单" />
    <section className="sheet bill-sheet">
      <div className="sheet-handle" />
      <div className="sheet-heading"><div><h2>账单</h2><p>按单月或全年查看本地记录</p></div><button onClick={onClose} aria-label="关闭"><X size={22} /></button></div>
      <div className="bill-toolbar">
        <div className="bill-filter bill-period" aria-label="账单时间范围"><button data-active={period === "month"} onClick={() => setPeriod("month")}>单月</button><button data-active={period === "year"} onClick={() => setPeriod("year")}>全年</button></div>
        {period === "month" ? <label><span>月份</span><input aria-label="选择账单月份" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label> : <label><span>年份</span><select aria-label="选择账单年份" value={year} onChange={(event) => setYear(event.target.value)}>{availableYears.map((value) => <option key={value}>{value}</option>)}</select></label>}
        <div className="bill-filter" aria-label="收支筛选">
          {(["all", "expense", "income"] as const).map((value) => <button key={value} data-active={type === value} onClick={() => setType(value)}>{value === "all" ? "全部" : value === "expense" ? "支出" : "收入"}</button>)}
        </div>
      </div>
      <div className="bill-summary">
        <div><small>共 {filtered.length} 笔</small><strong>{periodLabel}</strong></div>
        <div><small>收入</small><strong className="income">+{currency.format(totals.income)}</strong></div>
        <div><small>支出</small><strong>−{currency.format(totals.expense)}</strong></div>
      </div>
      <div className="bill-list">
        {filtered.length ? filtered.map((item) => {
          const Icon = categoryIcon(item.category);
          return <article className="bill-row" key={item.id ?? `${item.createdAt}-${item.amount}`}>
            <div className="category-icon"><Icon size={22} /></div>
            <div><strong>{item.note || item.category}</strong><small>{item.date} · {item.category} · {item.account}</small></div>
            <span className={`amount ${item.type}`}>{item.type === "expense" ? "−" : "+"}{currency.format(item.amount)}</span>
          </article>;
        }) : <div className="bill-empty"><Receipt size={36} weight="duotone" /><strong>这个月份还没有记录</strong><span>可切换月份，或先记一笔。</span></div>}
      </div>
    </section>
  </div>;
}

function Header({ tab, income, expense }: { tab: Tab; income: number; expense: number }) {
  if (tab !== "details") {
    const titles = { charts: "图表", assets: "资产管家", settings: "我的账本" };
    return <header className={`header compact ${tab === "assets" ? "light" : ""}`}><h1>{titles[tab]}</h1></header>;
  }
  const now = new Date();
  return (
    <header className="header home-header">
      <div className="brand"><div className=""></div><h1>记账本</h1></div>
      <div className="summary">
        <div className="month"><small>{now.getFullYear()}年</small><strong>{String(now.getMonth() + 1).padStart(2, "0")}</strong></div>
        <div><small>收入</small><strong>{currency.format(income)}</strong></div>
        <div><small>支出</small><strong>{currency.format(expense)}</strong></div>
      </div>
    </header>
  );
}

function NavButton({ item, active, onClick }: { item: (typeof navItems)[number]; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return <button className="nav-button" data-active={active} onClick={onClick}><Icon size={26} weight={active ? "fill" : "regular"} /><span>{item.label}</span></button>;
}

function Details({ transactions, onDelete, onEdit }: { transactions: LedgerTransaction[]; onDelete: (item: LedgerTransaction) => void; onEdit: (item: LedgerTransaction) => void }) {
  const grouped = transactions.reduce<Record<string, LedgerTransaction[]>>((result, item) => {
    (result[item.date] ??= []).push(item);
    return result;
  }, {});
  if (!transactions.length) return <EmptyState />;
  return (
    <section className="transaction-list">
      {Object.entries(grouped).map(([date, items]) => {
        const income = items.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
        const expense = items.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
        return <div className="day-group" key={date}>
          <div className="day-heading"><span>{dateHeading(date)}</span><span>{income ? `收入 ${currency.format(income)}  ` : ""}支出 {currency.format(expense)}</span></div>
          {items.map((item) => {
            const Icon = categoryIcon(item.category);
            return <article className="transaction-row" key={item.id}>
              <div className="category-icon"><Icon size={25} /></div>
              <div className="transaction-copy"><strong>{item.note || item.category}</strong><small>{item.note ? item.category : item.account}</small></div>
              <span className={`amount ${item.type}`}>{item.type === "expense" ? "−" : "+"}{currency.format(item.amount)}</span>
              <div className="transaction-actions"><button onClick={() => onEdit(item)} aria-label="修改记录"><PencilSimple size={17} /></button><button onClick={() => onDelete(item)} aria-label="删除"><Trash size={17} /></button></div>
            </article>;
          })}
        </div>;
      })}
    </section>
  );
}

function Charts({ transactions, monthlyBudget, annualBudget, onEditBudget }: { transactions: LedgerTransaction[]; monthlyBudget: number; annualBudget: number; onEditBudget: (period: BudgetPeriod) => void }) {
  const [type, setType] = useState<TransactionType>("expense");
  const defaultMonth = transactions[0]?.date.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultMonth.slice(0, 4));
  const [period, setPeriod] = useState<"month" | "year">("month");
  const availableYears = Array.from(new Set([new Date().getFullYear().toString(), ...transactions.map((item) => item.date.slice(0, 4))])).sort().reverse();
  const periodPrefix = period === "month" ? month : year;
  const periodLabel = period === "month" ? `${month.replace("-", "年")}月` : `${year}年`;
  const records = transactions.filter((item) => item.type === type && item.date.startsWith(periodPrefix));
  const typeLabel = type === "expense" ? "支出" : "收入";
  const byCategory = records.reduce<Record<string, number>>((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + item.amount;
    return result;
  }, {});
  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const daily = buildTrendData(records, period, periodPrefix);
  const total = pieData.reduce((sum, item) => sum + item.value, 0);
  const budgetLimit = budgetForPeriod(period, monthlyBudget, annualBudget);
  const scopeLabel = period === "month" ? "本月" : "全年";
  const colors = ["#ffda3d", "#7d7bf2", "#43b4d5", "#46b89c", "#f15c57", "#ff9d35"];
  return <section className="charts-screen">
    <div className="segmented"><button data-active={type === "expense"} onClick={() => setType("expense")}>支出</button><button data-active={type === "income"} onClick={() => setType("income")}>收入</button></div>
    <div className="chart-period"><div className="segmented"><button data-active={period === "month"} onClick={() => setPeriod("month")}>单月</button><button data-active={period === "year"} onClick={() => setPeriod("year")}>全年</button></div>{period === "month" ? <input aria-label="选择图表月份" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /> : <select aria-label="选择图表年份" value={year} onChange={(event) => setYear(event.target.value)}>{availableYears.map((value) => <option key={value}>{value}</option>)}</select>}</div>
    <article className="card trend-card"><div className="card-title"><h2>{periodLabel}{typeLabel}趋势</h2></div>
    <div className="line-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={daily} margin={{ top: 10, right: 10, left: 10 }}><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#999", fontSize: 11 }} />
    <Tooltip formatter={(value) => `¥${currency.format(Number(value))}`} /><Line dataKey="amount" type="monotone" stroke="#292a2e" strokeWidth={0.5} dot={{ r: 4, fill: type === "expense" ? "#ffda3d" : "#1fac69", stroke: "#292a2e", strokeWidth: 0.5 }} activeDot={{ r: 5, fill: type === "expense" ? "#ffda3d" : "#1fac69", stroke: "#292a2e", strokeWidth: 0.5 }} />
    </LineChart>
    </ResponsiveContainer>
    </div>
    </article>
    <article className="card category-card"><h2>{typeLabel}分类</h2>{pieData.length ? <div className="pie-layout"><div className="pie-wrap" onMouseDown={(event) => event.preventDefault()}><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer={false} tabIndex={-1}><Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={1} stroke="none">{pieData.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie></PieChart></ResponsiveContainer><div className="pie-center"><small>总{typeLabel}</small><strong>{currency.format(total)}</strong></div></div><div className="legend">{pieData.slice(0, 6).map((item, index) => <div key={item.name}><i style={{ background: colors[index % colors.length] }} /><span>{item.name}</span><strong>{Math.round(item.value / total * 100)}%</strong></div>)}</div></div> : <p className="chart-empty">记一笔{typeLabel}后，这里会自动生成图表。</p>}</article>
    {type === "expense" ? <article className="card budget"><div><small>{scopeLabel}预算</small><strong>¥{currency.format(budgetLimit)}</strong></div><div><small>预算结余</small><strong>¥{currency.format(Math.max(0, budgetLimit - total))}</strong></div><button className="budget-edit" onClick={() => onEditBudget(period)}><PencilSimple size={15} />修改</button></article> : <article className="card budget"><div><small>{scopeLabel}收入</small><strong>¥{currency.format(total)}</strong></div><div><small>收入笔数</small><strong>{records.length} 笔</strong></div></article>}
  </section>;
}

function Assets({ accounts, trend, onAdd, onEditBalance }: { accounts: LedgerAccount[]; trend: Array<{ month: string; total: number | null }>; onAdd: () => void; onEditBalance: (account: LedgerAccount) => void }) {
  const total = accounts.reduce((sum, item) => sum + item.balance, 0);
  const groups = accounts.reduce<Record<string, LedgerAccount[]>>((result, item) => { (result[item.kind] ??= []).push(item); return result; }, {});
  return <section className="assets-screen">
    <article className="asset-summary"><small>净资产</small><strong>¥ {currency.format(total)}</strong><div><span>资产 ¥{currency.format(total)}</span><span>负债 ¥0.00</span></div></article>
    <article className="card net-worth-trend" data-months={trend.length}><div className="card-title"><h2>净资产趋势</h2><span>{new Date().getFullYear()}年</span></div><div className="net-worth-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 14, right: 8, left: 8, bottom: 0 }}><XAxis dataKey="month" interval={0} axisLine={false} tickLine={false} tick={{ fill: "#999", fontSize: 9 }} /><Tooltip formatter={(value) => value == null ? "暂无快照" : `¥${currency.format(Number(value))}`} /><Line dataKey="total" type="monotone" connectNulls={false} stroke="#292a2e" strokeWidth={0.5} dot={{ r: 4, fill: "#ffda3d", stroke: "#292a2e", strokeWidth: 0.5 }} activeDot={{ r: 5, fill: "#ffda3d", stroke: "#292a2e", strokeWidth: 0.5 }} /></LineChart></ResponsiveContainer></div></article>
    {Object.entries(groups).map(([kind, items]) => <div className="account-group" key={kind}><div className="account-title"><h2>{kindNames[kind as LedgerAccount["kind"]]}</h2><span>¥{currency.format(items.reduce((sum, item) => sum + item.balance, 0))}</span></div>{items.map((item) => <button className="account-row" key={item.id} onClick={() => onEditBalance(item)} aria-label={`修改${item.name}余额`}><div className="account-logo" style={{ background: item.accent }}>{item.kind === "bank" ? <Bank size={21} weight="fill" /> : item.kind === "investment" ? <Coins size={21} weight="fill" /> : <Money size={21} weight="fill" />}</div><div><strong>{item.name}</strong></div><span>¥{currency.format(item.balance)}</span></button>)}</div>)}
    <button className="secondary" onClick={onAdd}><Plus size={20} />添加账户</button>
  </section>;
}

function Settings({ categories, onExport, onImport, onAddCategory, onDeleteCategory }: { categories: { expense: string[]; income: string[] }; onExport: () => void; onImport: (file: File) => void; onAddCategory: () => void; onDeleteCategory: (type: TransactionType, category: string) => void }) {
  const renderCategories = (type: TransactionType, items: string[]) => <article className="categories-card">{items.map((category) => { const Icon = categoryIcon(category); return <div className="category-setting" key={`${type}-${category}`}><span><Icon size={20} /></span><strong>{category}</strong><button onClick={() => { if (window.confirm(`删除“${category}”分类？`)) onDeleteCategory(type, category); }} aria-label={`删除${category}分类`}><Trash size={17} /></button></div>; })}</article>;
  return <section className="settings-screen">
    <div className="backup-actions">
      <button className="export-card" onClick={onExport}><span><UploadSimple size={26} weight="bold" /></span><span><strong>导出 Excel</strong></span><b>›</b></button>
      <label className="export-card import-card"><span><DownloadSimple size={26} weight="bold" /></span><span><strong>导入 Excel</strong></span><b>›</b><input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ""; }} /></label>
    </div>
    <div className="section-label">类别设置</div>
    <button className="secondary category-add" onClick={onAddCategory}><Plus size={20} />新增分类</button>
    <div className="category-type-label">支出分类</div>
    {renderCategories("expense", categories.expense)}
    <div className="category-type-label">收入分类</div>
    {renderCategories("income", categories.income)}
  </section>;
}

function ModalFrame({ title, subtitle, onClose, children, fullScreen = false }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode; fullScreen?: boolean }) {
  return <div className={`modal-layer${fullScreen ? " full-screen-page" : ""}`} role="dialog" aria-modal="true">{!fullScreen && <button className="modal-backdrop" onClick={onClose} aria-label="关闭" />}<section className={`sheet${fullScreen ? " full-screen-sheet" : ""}`}>{!fullScreen && <div className="sheet-handle" />}<div className="sheet-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={onClose} aria-label="关闭"><X size={22} /></button></div>{children}</section></div>;
}

function TransactionModal({ transaction, accounts, categoryOptions, onClose, onSaved }: { transaction?: LedgerTransaction; accounts: LedgerAccount[]; categoryOptions: { expense: string[]; income: string[] }; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [category, setCategory] = useState(transaction?.category ?? categoryOptions.expense[0] ?? "其它");
  const [account, setAccount] = useState(transaction?.account ?? accounts[0]?.name ?? "现金");
  const [note, setNote] = useState(transaction?.note ?? "");
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10));
  const categories = type === "expense" ? categoryOptions.expense : categoryOptions.income;
  const switchType = (next: TransactionType) => { setType(next); setCategory((next === "expense" ? categoryOptions.expense : categoryOptions.income)[0] ?? "其它"); };
  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    const item = { type, amount: value, category, account, note: note.trim(), date, createdAt: transaction?.createdAt ?? new Date().toISOString() };
    if (transaction?.id) await updateTransaction(transaction.id, item);
    else await addTransaction(item);
    onSaved();
  };
  return <ModalFrame title={transaction ? "修改记录" : "记一笔"} subtitle="保存后只写入当前设备" onClose={onClose} fullScreen><div className="form">
    <div className="type-switch"><button data-active={type === "expense"} onClick={() => switchType("expense")}>支出</button><button data-active={type === "income"} onClick={() => switchType("income")}>收入</button></div>
    <label className="field amount-field"><span>金额</span><div><b>¥</b><input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div></label>
    <div className="field-grid"><label className="field"><span>分类</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>账户</span><select value={account} onChange={(event) => setAccount(event.target.value)}>{accounts.map((item) => <option key={item.id}>{item.name}</option>)}</select></label></div>
    <label className="field"><span>日期</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
    <label className="field"><span>备注</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="写点什么（可选）" /></label>
    <button className="primary" disabled={!amount} onClick={submit}>{transaction ? "保存修改" : "保存"}</button>
  </div></ModalFrame>;
}

function AccountModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [kind, setKind] = useState<LedgerAccount["kind"]>("bank");
  const submit = async () => {
    const value = Number(balance);
    if (!name.trim() || !Number.isFinite(value)) return;
    await addAccount({ name: name.trim(), balance: value, kind, accent: "#ffb923" });
    onSaved();
  };
  return <ModalFrame title="添加账户" subtitle="录入一项需要管理的资产" onClose={onClose} fullScreen><div className="form">
    <label className="field"><span>账户名称</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：工资卡" /></label>
    <label className="field"><span>账户类型</span><select value={kind} onChange={(event) => setKind(event.target.value as LedgerAccount["kind"])}>{Object.entries(kindNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label className="field"><span>当前余额</span><input inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0.00" /></label>
    <button className="primary" disabled={!name || balance === ""} onClick={submit}>保存账户</button>
  </div></ModalFrame>;
}

function AccountBalanceModal({ account, onClose, onSaved }: { account: LedgerAccount; onClose: () => void; onSaved: () => void }) {
  const [balance, setBalance] = useState(String(account.balance));
  const submit = async () => {
    const value = Number(balance);
    if (!account.id || !Number.isFinite(value)) return;
    await updateAccountBalance(account.id, value);
    onSaved();
  };
  return <ModalFrame title="修改账户余额" subtitle={account.name} onClose={onClose} fullScreen><div className="form">
    <label className="field"><span>当前余额</span><input autoFocus inputMode="decimal" value={balance} onChange={(event) => setBalance(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} /></label>
    <button className="primary" disabled={balance === "" || !Number.isFinite(Number(balance))} onClick={submit}>保存余额</button>
  </div></ModalFrame>;
}

function CategoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: (type: TransactionType, name: string) => void }) {
  const [type, setType] = useState<TransactionType>("expense");
  const [name, setName] = useState("");
  const submit = () => {
    if (!name.trim()) return;
    onSaved(type, name.trim());
  };
  return <ModalFrame title="新增分类" subtitle="分类只保存在当前设备" onClose={onClose} fullScreen><div className="form">
    <div className="type-switch"><button data-active={type === "expense"} onClick={() => setType("expense")}>支出分类</button><button data-active={type === "income"} onClick={() => setType("income")}>收入分类</button></div>
    <label className="field"><span>分类名称</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder="例如：宠物" /></label>
    <button className="primary" disabled={!name.trim()} onClick={submit}>保存分类</button>
  </div></ModalFrame>;
}

function BudgetModal({ period, value, onClose, onSaved }: { period: BudgetPeriod; value: number; onClose: () => void; onSaved: (value: number) => void }) {
  const [budget, setBudget] = useState(String(value));
  const periodLabel = period === "month" ? "月" : "年";
  const submit = () => {
    const next = Number(budget);
    if (!Number.isFinite(next) || next < 0) return;
    onSaved(next);
  };
  return <ModalFrame title={`修改${periodLabel}预算`} subtitle="" onClose={onClose} fullScreen><div className="form">
    <label className="field amount-field"><span>{periodLabel}预算</span><div><b>¥</b><input autoFocus inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} /></div></label>
    <button className="primary" disabled={budget === "" || !Number.isFinite(Number(budget)) || Number(budget) < 0} onClick={submit}>保存预算</button>
  </div></ModalFrame>;
}

function EmptyState() {
  return <div className="empty"><div><BowlFood size={44} weight="duotone" /></div><h2>还没有账单</h2><p>点下方黄色按钮，记下第一笔。</p></div>;
}
