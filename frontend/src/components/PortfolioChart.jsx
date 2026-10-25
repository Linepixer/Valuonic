import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PortfolioChart({ data, isArs }) {
  const [timeRange, setTimeRange] = useState('MAX');

  const isEmpty = !data || data.length === 0;

  const chartData = isEmpty ? [
    { date: '2024-01-01', total_value_usd: 0, total_value_ars: 0 },
    { date: '2024-02-01', total_value_usd: 0, total_value_ars: 0 },
    { date: '2024-03-01', total_value_usd: 0, total_value_ars: 0 },
    { date: '2024-04-01', total_value_usd: 0, total_value_ars: 0 },
    { date: '2024-05-01', total_value_usd: 0, total_value_ars: 0 },
    { date: '2024-06-01', total_value_usd: 0, total_value_ars: 0 }
  ] : data;

  const filteredData = useMemo(() => {
    if (timeRange === 'MAX') return chartData;
    
    const lastItem = chartData[chartData.length - 1];
    const baseDate = lastItem?.date ? new Date(lastItem.date + 'T12:00:00') : new Date();
    let targetDate = new Date(baseDate);
    if (timeRange === '1S') targetDate.setDate(baseDate.getDate() - 7);
    if (timeRange === '1M') targetDate.setMonth(baseDate.getMonth() - 1);
    if (timeRange === '3M') targetDate.setMonth(baseDate.getMonth() - 3);
    if (timeRange === '6M') targetDate.setMonth(baseDate.getMonth() - 6);
    if (timeRange === '1A') targetDate.setFullYear(baseDate.getFullYear() - 1);
    
    const targetString = targetDate.toISOString().split('T')[0];
    const filtered = chartData.filter(d => d.date >= targetString);
    
    return filtered.length >= 2 ? filtered : chartData.slice(-2);
  }, [chartData, timeRange]);

  const dataKey = isArs ? 'total_value_ars' : 'total_value_usd';
  
  const firstValue = filteredData[0]?.[dataKey] ?? 0;
  const lastValue = filteredData[filteredData.length - 1]?.[dataKey] ?? 0;
  const isProfit = lastValue >= firstValue;
  const color = isEmpty ? 'var(--profit)' : (isProfit ? 'var(--profit)' : 'var(--loss)');

  const { yDomain, span } = useMemo(() => {
    if (isEmpty || !filteredData || filteredData.length === 0) {
      return { yDomain: [0, 'auto'], span: 0 };
    }
    const values = filteredData
      .map(d => Number(d[dataKey]))
      .filter(v => typeof v === 'number' && !isNaN(v));

    if (values.length === 0) return { yDomain: [0, 'auto'], span: 0 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) {
      if (min === 0) return { yDomain: [0, 10], span: 10 };
      const pad = min * 0.05;
      const lower = Math.max(0, min - pad);
      const upper = max + pad;
      return { yDomain: [lower, upper], span: upper - lower };
    }

    const pad = range * 0.08;
    const lower = Math.max(0, min - pad);
    const upper = max + pad;
    return { yDomain: [lower, upper], span: upper - lower };
  }, [filteredData, dataKey, isEmpty]);

  const formatYTick = (value) => {
    if (value >= 1000000 && span >= 100000) {
      return `$${(value / 1000000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }
    if (value >= 1000 && span >= 2000) {
      return `$${(value / 1000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
    }
    if (span < 2) {
      return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${Math.round(value).toLocaleString('es-AR')}`;
  };

  return (
    <div style={{ width: '100%', height: 330, marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem', marginBottom: '0.5rem', paddingRight: '10px' }}>
        {['1S', '1M', '3M', '6M', '1A', 'MAX'].map(tr => (
          <button 
            key={tr}
            onClick={() => setTimeRange(tr)}
            style={{
              background: timeRange === tr ? 'var(--border)' : 'transparent',
              color: timeRange === tr ? 'var(--text-main)' : 'var(--text-muted)',
              border: 'none',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: timeRange === tr ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tr}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart key={`${timeRange}-${isArs}`} data={filteredData} margin={{ top: 20, right: 0, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
            dy={10}
            minTickGap={30}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted)', fontSize: 11, dx: 10, dy: -10, textAnchor: 'start' }}
            domain={yDomain}
            tickFormatter={formatYTick}
            width={1}
            mirror={false}
          />
          {!isEmpty && (
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--bg-card)', 
                border: '1px solid var(--border)', 
                borderRadius: '8px', 
                color: 'var(--text-main)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
              }}
              itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }}
              formatter={(value) => [
                new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: isArs ? 'ARS' : 'USD',
                  minimumFractionDigits: isArs ? 0 : 2,
                  maximumFractionDigits: isArs ? 0 : 2
                }).format(value), 
                'Patrimonio Total'
              ]}
              labelStyle={{ color: 'var(--text-muted)', marginBottom: '5px' }}
            />
          )}
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            fillOpacity={1} 
            fill="url(#colorValue)" 
            strokeWidth={3}
            animationBegin={0}
            animationDuration={600}
            activeDot={{ r: 6, fill: color, stroke: 'var(--bg-main)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
