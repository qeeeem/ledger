export type BudgetPeriod = "month" | "year";

export const DEFAULT_MONTHLY_BUDGET = 1500;
export const DEFAULT_ANNUAL_BUDGET = 18000;

export function budgetForPeriod(period: BudgetPeriod, monthlyBudget: number, annualBudget: number) {
  return period === "month" ? monthlyBudget : annualBudget;
}
