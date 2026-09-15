export type TrendPeriod = "month" | "year";

type TrendRecord = {
  date: string;
  amount: number;
};

export type TrendPoint = {
  date: string;
  amount: number;
};

export function buildTrendData(records: TrendRecord[], period: TrendPeriod, scope: string): TrendPoint[] {
  const pointCount = period === "month"
    ? new Date(Number(scope.slice(0, 4)), Number(scope.slice(5, 7)), 0).getDate()
    : 12;
  const points = Array.from({ length: pointCount }, (_, index) => ({
    date: period === "month" ? String(index + 1).padStart(2, "0") : `${String(index + 1).padStart(2, "0")}月`,
    amount: 0,
  }));

  for (const item of records) {
    const index = period === "month" ? Number(item.date.slice(8)) - 1 : Number(item.date.slice(5, 7)) - 1;
    if (points[index]) points[index].amount += item.amount;
  }

  return points;
}
