// Shared by every price/portfolio chart so their axes and tooltips read the same way, and by the date filters.
// Days are calendar days in Argentina, like the history the API returns, so they never go through UTC.

// Built from the parts so "2026-10-17" stays that calendar day; new Date(iso) would read it as UTC midnight.
export const toLocalDate = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// The local day of a Date as "YYYY-MM-DD"; toISOString() would give the UTC one, already tomorrow after 21:00.
export const toIsoDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatDayMonth = (iso) => toLocalDate(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

const formatMonthYear = (iso) => toLocalDate(iso).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });

// "17 oct" fits periods up to a year; across several years the axis needs the year instead of the day.
export const axisDateFormatter = (range) => (range === 'MAX' ? formatMonthYear : formatDayMonth);

export const formatTooltipDate = (iso) => `${formatDayMonth(iso)} ${toLocalDate(iso).getFullYear()}`;
