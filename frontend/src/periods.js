// Keys match the backend's `periods`; the chart buttons pick one, and the gains on screen follow it.
export const PERIOD_LABELS = {
  '1S': 'última semana',
  '1M': 'último mes',
  '3M': 'últimos 3 meses',
  '6M': 'últimos 6 meses',
  '1A': 'último año',
  'MAX': 'desde el inicio',
};

export const PERIOD_COLUMN_SUFFIX = { '1S': '1S', '1M': '1M', '3M': '3M', '6M': '6M', '1A': '1A', 'MAX': 'total' };

export const getPeriodGain = (periods, period, isArs) => {
  const data = periods?.[period];
  return {
    gain: (isArs ? data?.gain_ars : data?.gain_usd) ?? 0,
    pct: (isArs ? data?.gain_pct_ars : data?.gain_pct_usd) ?? null,
  };
};

// A period that reaches back before the first data point is the whole history, so it is labelled as such.
export const getPeriodLabel = (period, periodStart, firstDate) => {
  const coversFullHistory = !periodStart || !firstDate || periodStart < firstDate;
  return coversFullHistory ? PERIOD_LABELS.MAX : PERIOD_LABELS[period];
};

export const formatPct = (value) => value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
