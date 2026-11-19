import { ArrowUpDown, ArrowUpRight, ArrowDownRight, ArrowRight, HelpCircle } from 'lucide-react';
import { formatPct, getPeriodGain } from '../periods';

// Anything smaller prints as 0,00%, so it is shown as no movement instead of a rise or fall nobody can see.
const MIN_VISIBLE_PCT = 0.005;

// Same set as STABLECOINS in backend/app/services/portfolio_service.py. Their move is just the exchange rate,
// which the dollar cards already show.
const DOLLAR_PEGGED = new Set(['USD', 'USDT', 'USDC', 'DAI']);

const MoverRow = ({ asset, pct, getName, onSelect }) => {
  const moved = pct !== null && Math.abs(pct) >= MIN_VISIBLE_PCT;
  const isUp = moved && pct > 0;
  const Arrow = isUp ? ArrowUpRight : ArrowDownRight;
  const colorClass = !moved ? 'text-muted' : (isUp ? 'text-profit' : 'text-loss');

  return (
    <button
      type="button"
      onClick={() => onSelect(asset)}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem',
        width: '100%', padding: '0.35rem 0', background: 'none', border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', minWidth: 0 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{asset.ticker}</span>
        <span className="text-muted" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {getName(asset)}
        </span>
      </div>
      <span className={`font-semibold ${colorClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
        {pct === null ? '—' : (
          <>
            {moved && <Arrow size={12} />}
            {isUp ? '+' : ''}{formatPct(moved ? pct : 0)}%
          </>
        )}
      </span>
    </button>
  );
};

export default function PeriodMoversWidget({ assets, period, periodLabel, currency, getName, onSelect, onViewAll }) {
  const isArs = currency === 'ARS';
  const rows = (assets || [])
    .filter(asset => !DOLLAR_PEGGED.has(asset.ticker.toUpperCase()))
    .map(asset => ({ asset, pct: getPeriodGain(asset.periods, period, isArs).pct }))
    // Biggest rise first; assets with nothing at stake in the period have no percentage and go last.
    .sort((a, b) => (a.pct === null) - (b.pct === null) || b.pct - a.pct);

  if (rows.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <ArrowUpDown size={16} color="var(--text-muted)" />
        <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Cotizaciones
        </h3>
        <div className="tooltip-container">
          <HelpCircle size={14} color="var(--text-muted)" style={{ cursor: 'help' }} />
          <div className="tooltip-content" style={{ bottom: '150%', left: '0', transform: 'translateX(-20%)', width: '250px' }}>
            Cuánto subió o bajó cada activo de tu cartera en el período que elegiste en el gráfico. No incluye el dólar ni las stablecoins.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div
          className="text-muted"
          style={{
            display: 'flex', justifyContent: 'space-between', gap: '0.75rem',
            paddingBottom: '0.35rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
            fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px'
          }}
        >
          <span>Activo</span>
          <span>{periodLabel}</span>
        </div>
        {rows.map(({ asset, pct }) => (
          <MoverRow key={asset.ticker} asset={asset} pct={pct} getName={getName} onSelect={onSelect} />
        ))}
      </div>

      <button
        type="button"
        onClick={onViewAll}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem',
          padding: '0.5rem 0', background: 'transparent', border: 'none',
          color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem'
        }}
        onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-main)'}
        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        Ver todas las cotizaciones <ArrowRight size={16} />
      </button>
    </div>
  );
}
