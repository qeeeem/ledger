export interface DatedTransaction {
  id?: number;
  date: string;
  createdAt: string;
}

export function compareTransactionsByRecordDate(a: DatedTransaction, b: DatedTransaction) {
  const dateOrder = b.date.localeCompare(a.date);
  if (dateOrder !== 0) return dateOrder;

  const createdAtOrder = b.createdAt.localeCompare(a.createdAt);
  if (createdAtOrder !== 0) return createdAtOrder;

  return (b.id ?? 0) - (a.id ?? 0);
}

export function sortTransactionsByRecordDate<T extends DatedTransaction>(transactions: T[]) {
  return [...transactions].sort(compareTransactionsByRecordDate);
}
