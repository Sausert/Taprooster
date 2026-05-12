export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(dateStr).toLocaleDateString("nl-NL", options ?? { weekday: "long", day: "numeric", month: "long" });
}

export function formatDateShort(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}
