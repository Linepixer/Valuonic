import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import api from '../api';
import { getAssetIcon } from './AssetIcon';
import PortfolioChart from './PortfolioChart';
import { formatPct, getPeriodGain, getPeriodLabel } from '../periods';

export default function PortfolioAssetDetailView({ asset, currency, periodStarts, onBack, onGoToMarket }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('1M');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/portfolio/history/${asset.ticker}`);
        setData(res.data.history || []);
      } catch (err) {
        console.error("Error fetching portfolio asset history:", err);
        setError('No se pudo cargar el historial de tu posesión.');
      } finally {
        setLoading(false);
      }
    };
    
    if (asset?.ticker) {
      fetchHistory();
    }
  }, [asset?.ticker]);

  const isArs = currency === 'ARS';

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: isArs ? 0 : 2,
      maximumFractionDigits: isArs ? 0 : 2,
    }).format(value).replace('US$', 'USD');
  };

  const formatCrypto = (value) => {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 8,
    }).format(value);
  };

  if (!asset) return null;

  const currentPrice = isArs ? asset.current_price_ars : asset.current_price_usd;
  const avgPrice = isArs ? asset.average_purchase_price_ars : asset.average_purchase_price_usd;
  const value = isArs ? asset.total_value_ars : asset.total_value_usd;
  // Same all-time figure as the portfolio table's "Ganancia total": includes sales and interest.
  const allTime = asset.periods?.MAX;
  const profit = allTime ? (isArs ? allTime.gain_ars : allTime.gain_usd) : (isArs ? asset.potential_profit_ars : asset.potential_profit_usd);
  const profitPct = allTime ? (isArs ? allTime.gain_pct_ars : allTime.gain_pct_usd) : (isArs ? asset.profit_percentage_ars : asset.profit_percentage_usd);
  const isCrypto = ['BTC', 'XRP'].includes(asset.ticker);

  // Same per-period figure as this asset's row in the portfolio table, so the chart and its number agree.
  const hasPeriods = Boolean(asset.periods);
  const { gain: periodGain, pct: periodPct } = getPeriodGain(asset.periods, period, isArs);
  const periodStart = periodStarts?.[period]?.start_date;
  const periodLabel = getPeriodLabel(period, periodStart, data[0]?.date);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <button 
          onClick={onBack} 
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            background: 'transparent', border: 'none', 
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          <ArrowLeft size={20} /> Volver
        </button>
      </div>

      <div className="card detail-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          {/* Columna Izquierda: Título y Valor Total */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '2rem' }}>
                <span style={{ display: 'flex', marginRight: '0.35rem' }}>{getAssetIcon(asset.ticker, 44)}</span>
                {asset.ticker} <span className="text-muted" style={{ fontSize: '1.25rem', fontWeight: 'normal' }}>{asset.name}</span>
              </h2>
              <div className="summary-label" style={{ marginTop: '1rem' }}>Valor Total en tu Portafolio ({currency})</div>
              <div className="summary-value" style={{ margin: 0, fontSize: '2.5rem', color: 'var(--text-main)' }}>
                {formatCurrency(value)}
              </div>
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              <button 
                onClick={() => onGoToMarket(asset)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: 'transparent', color: 'var(--text-main)', 
                  border: '1px solid var(--border)', padding: '0.6rem 1.2rem', 
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  fontWeight: '500', transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--text-muted)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                Ver cotización de mercado <ExternalLink size={16} />
              </button>
            </div>
          </div>

          {/* Columna Derecha: Estadísticas y Ganancia */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-main)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            
            {/* Ganancia Neta Destacada */}
            <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div className="summary-label" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Ganancia total</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
                <div className={`font-semibold ${profit >= 0 ? 'text-profit' : 'text-loss'}`} style={{ fontSize: '1.8rem', margin: 0, lineHeight: 1 }}>
                  {profit > 0 ? '+' : ''}{formatCurrency(profit)}
                </div>
                {profitPct !== null && profitPct !== undefined && (
                  <div className={`badge ${profit >= 0 ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '0.9rem', padding: '0.3rem 0.6rem' }}>
                    {profit > 0 ? '+' : ''}{profitPct.toLocaleString('es-AR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                  </div>
                )}
              </div>
            </div>

            {/* Grilla de Métricas Secundarias */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cantidad</div>
                <div className="font-semibold" style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  {isCrypto ? formatCrypto(asset.quantity) : asset.quantity}
                </div>
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Precio Promedio</div>
                <div className="font-semibold" style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  {formatCurrency(avgPrice)}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Precio de Mercado Actual</div>
                <div className="font-semibold" style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  {formatCurrency(currentPrice)}
                </div>
              </div>
            </div>

          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500 }}>Evolución de tu Inversión</h3>
          {hasPeriods && (
            <div className={`badge ${periodGain >= 0 ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '0.95rem', padding: '0.2rem 0.6rem' }}>
              {periodGain >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {formatCurrency(Math.abs(periodGain))}
              {periodPct !== null && ` (${formatPct(periodPct)}%)`}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.35rem' }}>· {periodLabel}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-muted flex-row" style={{ justifyContent: 'center', height: '300px' }}>
            <RefreshCw className="animate-spin" /> Cargando gráfico...
          </div>
        ) : error ? (
          <div className="text-loss flex-row" style={{ justifyContent: 'center', height: '300px' }}>
            <AlertTriangle /> {error}
          </div>
        ) : data.length === 0 ? (
          <div className="text-muted" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
            No hay datos históricos registrados para tu posesión.
          </div>
        ) : (
          <PortfolioChart
            data={data}
            isArs={isArs}
            range={period}
            onRangeChange={setPeriod}
            startDate={periodStart}
            isGain={hasPeriods ? periodGain >= 0 : undefined}
          />
        )}
      </div>
    </div>
  );
}
