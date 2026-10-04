const DAY_IN_MS = 24 * 60 * 60 * 1000;
const FULL_TERM_DAYS = 280;

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("날짜 형식이 올바르지 않습니다.");
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getPregnancyStartDate(dueDate: string) {
  const startDate = parseDateOnly(dueDate);
  startDate.setUTCDate(startDate.getUTCDate() - FULL_TERM_DAYS);
  return formatDateOnly(startDate);
}

export function getPregnancyProgress(dueDate: string, now = new Date()) {
  const due = parseDateOnly(dueDate);
  const koreaNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = new Date(Date.UTC(koreaNow.getUTCFullYear(), koreaNow.getUTCMonth(), koreaNow.getUTCDate()));
  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / DAY_IN_MS);
  const elapsedDays = Math.max(0, Math.min(FULL_TERM_DAYS, FULL_TERM_DAYS - daysUntilDue));

  return {
    weeks: Math.floor(elapsedDays / 7),
    days: elapsedDays % 7,
    daysUntilDue,
    progressPercent: Math.max(0, Math.min(100, Math.round((elapsedDays / FULL_TERM_DAYS) * 100))),
  };
}
