/**
 * Utility functions for precise financial calculations using cent-based arithmetic.
 * This prevents floating-point inaccuracies like 0.1 + 0.2 = 0.30000000000000004.
 */

/**
 * Converts a floating-point dollar/LKR amount to integer cents.
 */
export const toCents = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Converts integer cents back to a floating-point decimal amount.
 */
export const fromCents = (cents: number): number => {
  return cents / 100;
};

/**
 * Precisely adds two floating-point financial numbers.
 */
export const preciseAdd = (a: number, b: number): number => {
  return fromCents(toCents(a) + toCents(b));
};

/**
 * Precisely subtracts two floating-point financial numbers.
 */
export const preciseSubtract = (a: number, b: number): number => {
  return fromCents(toCents(a) - toCents(b));
};

/**
 * Precisely sums an array of floating-point financial numbers.
 */
export const preciseSum = (arr: number[]): number => {
  const totalCents = arr.reduce((sum, val) => sum + toCents(val), 0);
  return fromCents(totalCents);
};

/**
 * Precisely rounds a floating-point financial number to 2 decimal places.
 */
export const preciseRound = (amount: number): number => {
  return fromCents(toCents(amount));
};

/**
 * Parses a YYYY-MM-DD date string into a local Date object.
 * This avoids timezone shift bugs associated with new Date("YYYY-MM-DD") parsing as UTC.
 */
export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Calculates the difference in calendar days between two Date objects.
 * This is timezone-safe.
 */
export const getCalendarDaysDifference = (date1: Date, date2: Date): number => {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};
