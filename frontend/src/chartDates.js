// Shared by every price/portfolio chart so their axes and tooltips read the same way.

// Built from the parts so "2026-10-17" stays that calendar day; new Date(iso) would read it as UTC midnight.
const toLocalDate = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDayMonth = (iso) => toLocalDate(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

const formatMonthYear = (iso) => toLocalDate(iso).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });

// "17 oct" fits periods up to a year; across several years the axis needs the year instead of the day.
export const axisDateFormatter = (range) => (range === 'MAX' ? formatMonthYear : formatDayMonth);

export const formatTooltipDate = (iso) => `${formatDayMonth(iso)} ${toLocalDate(iso).getFullYear()}`;
