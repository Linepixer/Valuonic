import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle, Plus, X, Upload, Download, HelpCircle } from 'lucide-react';
import { AreaChart, Area, YAxis } from 'recharts';
import api from '../api';
import TransactionForm from './TransactionForm';
import TransactionsList from './TransactionsList';
import MonthlyInvestmentWidget from './MonthlyInvestmentWidget';
import PassiveIncomeWidget from './PassiveIncomeWidget';
import CompoundInterestWidget from './CompoundInterestWidget';
import PeriodMoversWidget from './PeriodMoversWidget';
import PieChartComponent from './PieChartComponent';
import PortfolioChart from './PortfolioChart';
import AssetDetailView from './AssetDetailView';
import PortfolioAssetDetailView from './PortfolioAssetDetailView';
import CategoryProgressBars from './CategoryProgressBars';
import ImportTransactions from './ImportTransactions';
import XirrCard from './XirrCard';
import { useNavigate, useLocation } from 'react-router-dom';
import { PERIOD_COLUMN_SUFFIX, formatPct, getPeriodGain, getPeriodLabel } from '../periods';

const formatCurrency = (value, currency) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(value).replace('US$', 'USD');
};

const formatQuantity = (value, ticker) => {
  const isFiat = ['USD', 'ARS', 'EUR'].includes(ticker);
  const isCrypto = ['BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'BNB', 'ADA', 'SOL'].includes(ticker);

  if (isFiat) {
    if (value % 1 === 0) {
      return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    }
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  if (isCrypto) {
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 8 }).format(value);
  }

  // Equities / ETFs
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(value);
};

// Same baseline as the backend's "1M" period: the last price on or before this day last month (day clamped to the
// month's length). A fixed count of points is not a month: IOL imports hold weekdays only, the daily job weekends too.
const sinceOneMonthAgo = (history) => {
  const now = new Date();
  const month = now.getUTCMonth() - 1;
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), month + 1, 0)).getUTCDate();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), month, Math.min(now.getUTCDate(), lastDay))).toISOString().slice(0, 10);
  let start = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].date <= cutoff) {
      start = i;
      break;
    }
  }
  return history.slice(start);
};

// Ends at the live price shown beside it rather than the last daily snapshot, so the change matches the portfolio's
// 1M gain. A failed live fetch comes back as 0 and is left out instead of reading as a -100% month.
const withLivePrice = (history, asset) => {
  if (!history.length || !(asset.current_price_usd > 0) || !(asset.current_price_ars > 0)) return history;
  return [...history, { date: 'live', price_usd: asset.current_price_usd, price_ars: asset.current_price_ars }];
};

const Sparkline = ({ data, dataKey }) => {
  if (!data || data.length === 0) return <div style={{ width: 140, height: 40 }} />;
  const first = data[0][dataKey];
  const last = data[data.length - 1][dataKey];
  const color = last >= first ? 'var(--profit)' : 'var(--loss)';
  // Use a unique ID for the gradient based on the color to avoid mixing up multiple sparklines
  const gradientId = `colorSpark_${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  let pctChange = 0;
  if (first > 0) {
    pctChange = ((last - first) / first) * 100;
  }
  const pctText = (pctChange > 0 ? '+' : '') + pctChange.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <AreaChart width={90} height={40} data={data} style={{ filter: `drop-shadow(0px 3px 6px ${color}40)` }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.6} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={['dataMin', 'dataMax']} hide />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#${gradientId})`} isAnimationActive={true} animationDuration={1500} />
      </AreaChart>
      <span style={{ color: color, fontWeight: 600, fontSize: '0.85rem', width: '55px', textAlign: 'right' }}>{pctText}</span>
    </div>
  );
};

const CUSTOM_ASSET_NAMES = {
  'USD': 'Dólar',
  'SPY': 'SPDR S&P 500 ETF Trust',
  'QQQ': 'Invesco QQQ Trust',
  'GLD': 'SPDR Gold Trust',
  'BTC': 'Bitcoin',
  'USDT': 'Tether',
  'XRP': 'Ripple'
};

// Drawn inline so the icon needs no third-party request or CSP entry. Paths from Simple Icons (CC0).
const BRAND_LOGOS = {
  'NVDA': {
    color: '#76B900',
    path: 'M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z',
  },
  'KO': {
    color: '#D00013',
    // A wide, short wordmark: it gets most of the circle's width, which a square mark could not use.
    size: 440,
    path: 'M16.813 8.814s-.45.18-.973.756c-.524.577-.828 1.225-.603 1.397.087.066.287.079.65-.25a2.864 2.864 0 0 0 .766-1.063c.234-.57.16-.833.16-.84m2.863 1.038c-.581-.299-1.006-.664-1.448-.89-.422-.216-.695-.307-1.036-.261a1.057 1.057 0 0 0-.14.035s.176.6-.523 1.607c-.708 1.022-1.35 1.015-1.533.734-.191-.296.056-.9.468-1.437.432-.562 1.19-1.028 1.19-1.028s-.241-.148-.835.19c-.58.326-1.577 1.107-2.502 2.423-.926 1.316-1.11 2.04-1.242 2.61-.132.57-.012 1.18.62 1.18s1.368-.964 1.576-1.299c.386-.624.637-1.581.112-1.45-.259.065-.468.351-.6.627a2.683 2.683 0 0 0-.19.554 2.185 2.185 0 0 0-.513.298 3.788 3.788 0 0 0-.486.43s.002-.456.365-1.194c.364-.737 1.03-1.074 1.408-1.106.34-.027.783.262.408 1.327-.375 1.065-1.483 2.36-2.646 2.376-1.073.015-1.776-1.355-.282-3.745C13.501 9.19 15.441 8.38 16.07 8.29c.63-.09.835.187.835.187a2.709 2.709 0 0 1 1.197-.197c.77.052 1.364.596 2.15.979-.205.195-.4.4-.575.592m3.454-.89c-.533.342-1.27.652-1.979.586-.179.185-.371.4-.563.634 1.228.243 2.305-.519 2.877-1.167A3.82 3.82 0 0 0 24 8.248a4.792 4.792 0 0 1-.869.714m-1.636 3.462a.268.268 0 0 0 .023-.051.124.124 0 0 0-.113-.108c-.117-.005-.277.017-.695.48a6.303 6.303 0 0 0-.89 1.263c-.24.438-.337.764-.2.848a.199.199 0 0 0 .146.015c.093-.022.199-.11.36-.295.075-.088.158-.212.258-.349.277-.376.973-1.563 1.111-1.803m-4.349.504c.07-.182.159-.541-.026-.682-.199-.15-.705.201-.708.561-.003.369.357.535.443.559.05.013.066.01.09-.029a3.284 3.284 0 0 0 .201-.409m-.383.67a1.531 1.531 0 0 1-.348-.222 1.116 1.116 0 0 1-.26-.317c-.008-.012-.015-.003-.023.008-.007.01-.039.039-.309.434-.27.396-.684 1.216-.31 1.355.241.09.641-.331.86-.61a5.21 5.21 0 0 0 .402-.614c.012-.023 0-.029-.012-.034m4.258.947c-.102.163-.218.476.117.281.41-.236.994-1.123.994-1.123h.265a8.88 8.88 0 0 1-.803 1.054c-.415.46-.922.879-1.28.837-.416-.048-.286-.596-.286-.596s-.596.635-1.01.59c-.557-.062-.387-.751-.387-.751s-.63.774-1.06.75c-.673-.04-.504-.859-.316-1.436.1-.308.193-.55.193-.55s-.067.017-.21.038c-.076.011-.212.019-.212.019s-.28.495-.505.792c-.224.297-1.178 1.322-1.74 1.117-.518-.19-.346-.984-.044-1.615.44-.92 1.68-2.243 2.396-2.068.741.18.017 1.532.017 1.532s0 .005.007.009c.015.005.054.01.143-.008a1.605 1.605 0 0 0 .271-.08s.746-1.561 1.569-2.583c.823-1.02 2.465-2.78 3.11-2.354.156.105.086.465-.126.902a2.891 2.891 0 0 1-.291.078c.142-.258.236-.475.264-.627.097-.528-1.135.585-2.015 1.78a16.594 16.594 0 0 0-1.409 2.28 3.86 3.86 0 0 0 .454-.324 13.002 13.002 0 0 0 1.118-1.043 12.169 12.169 0 0 0 .951-1.098 2.58 2.58 0 0 0 .28-.029 12.054 12.054 0 0 1-1.05 1.24c-.35.355-.73.737-1.061 1.015a8.84 8.84 0 0 1-.931.691s-.77 1.553-.351 1.652c.246.06.732-.69.732-.69s.635-.967 1.017-1.404c.522-.593.97-.936 1.42-.942.261-.005.415.273.415.273l.123-.19h.757s-1.414 2.398-1.527 2.579m2.111-5.58c-.533.341-1.27.651-1.979.585-.18.185-.371.4-.564.634 1.229.243 2.305-.518 2.878-1.167A3.82 3.82 0 0 0 24 8.248a4.792 4.792 0 0 1-.869.714m-10.63 1.177h-.72l-.407.658h.72zm-3.41 2.277c.307-.42 1.152-1.891 1.152-1.891a.124.124 0 0 0-.112-.108c-.117-.006-.312.034-.7.519-.387.485-.688.87-.907 1.272-.24.438-.346.747-.207.831a.205.205 0 0 0 .144.015c.09-.022.208-.113.369-.298a5.57 5.57 0 0 0 .262-.34m-3.863-1.99c-.199-.15-.705.201-.708.56-.003.369.456.482.515.484a.09.09 0 0 0 .05-.01.06.06 0 0 0 .024-.027 3.483 3.483 0 0 0 .146-.325c.07-.183.158-.541-.027-.682m-.3 1.27a1.678 1.678 0 0 1-.39-.18.812.812 0 0 1-.279-.309c-.007-.012-.015-.003-.022.008-.007.01-.047.061-.318.458-.27.398-.672 1.21-.296 1.35.24.09.644-.334.864-.612a7.24 7.24 0 0 0 .455-.681c.009-.024 0-.03-.014-.034m5.88.244h.263s-1.321 1.912-2.068 1.823c-.416-.049-.293-.563-.293-.563s-.585.685-1.123.546c-.487-.125-.172-.936-.172-.936-.056.022-1.111 1.211-1.853.926-.776-.3-.373-1.296-.225-1.595.125-.253.263-.499.263-.499s-.119.034-.195.051l-.186.04s-.367.596-.591.894c-.225.297-1.178 1.32-1.74 1.117-.562-.204-.423-.99-.107-1.615.512-1.012 1.726-2.256 2.458-2.068.739.189.127 1.388.127 1.388s.147.019.5-.222c.507-.346 1.176-1.277 1.901-1.167.342.051.66.4.225 1.064-.139.213-.372.403-.55.215-.111-.118-.014-.33.103-.477a.457.457 0 0 1 .39-.179s.12-.273-.185-.269c-.247.005-.871.58-1.223 1.16-.323.533-.813 1.441-.322 1.639.451.182 1.309-.836 1.706-1.37.397-.533 1.302-1.742 2.062-1.79.261-.017.417.221.417.221l.088-.139h.759s-1.43 2.387-1.542 2.567c-.088.141-.204.46.117.281.322-.178.996-1.043.996-1.043m-.414 3.824a3.144 3.144 0 0 0-1.908-.557 1.17 1.17 0 0 0-.93.504c-.29-.505-.862-.815-1.747-.808-1.43.016-2.849.676-3.972.675-1.077 0-1.863-.677-1.837-1.88.047-2.109 1.83-4.009 3.16-4.864.767-.49 1.409-.637 1.828-.59.306.034.674.388.442.909-.341.761-.812.699-.795.335.01-.237.168-.386.286-.469a.582.582 0 0 1 .278-.068c.068-.057.117-.474-.429-.337-.546.137-1.21.676-1.84 1.371-.63.696-1.61 2.011-1.852 3.392-.113.64-.039 1.808 1.48 1.795 1.287-.01 3.185-.859 4.929-.841a3.34 3.34 0 0 1 1.725.472c.451.278.992.684 1.184.961',
  },
};

const getAssetIcon = (ticker) => {
  const cryptoUrl = {
    'BTC': 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=032',
    'USDT': 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=032',
    'XRP': 'https://cryptologos.cc/logos/xrp-xrp-logo.svg?v=032',
    'ETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=032',
  };

  if (cryptoUrl[ticker]) {
    if (ticker === 'XRP') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={cryptoUrl[ticker]} alt={ticker} style={{ width: '16px', height: '16px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </div>
      );
    }
    return <img src={cryptoUrl[ticker]} alt={ticker} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
  }

  if (ticker === 'USD' || ticker === 'ARS') {
    const symbol = ticker === 'USD' ? '$' : 'AR$';
    const bg = ticker === 'USD' ? '#16a34a' : '#0284c7';
    return (
      <svg viewBox="0 0 512 512" width="28" height="28">
        <circle cx="256" cy="256" r="256" fill={bg} />
        <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill="#fff" fontSize={ticker === 'USD' ? "260" : "180"} fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" textRendering="optimizeLegibility">{symbol}</text>
      </svg>
    );
  }

  if (BRAND_LOGOS[ticker]) {
    const { color, path, size = 288 } = BRAND_LOGOS[ticker];
    const offset = (512 - size) / 2;
    return (
      <svg viewBox="0 0 512 512" width="28" height="28" role="img" aria-label={ticker}>
        <circle cx="256" cy="256" r="256" fill={color} />
        <svg x={offset} y={offset} width={size} height={size} viewBox="0 0 24 24">
          <path d={path} fill="#fff" />
        </svg>
      </svg>
    );
  }

  // Generate dynamic SVG logos for equities
  const colors = {
    'SPY': '#c51f33',
    'QQQ': '#1e3a8a',
    'GLD': '#ca8a04',
  };
  const bgColor = colors[ticker] || '#374151';
  let displayTicker = ticker;
  if (displayTicker.length > 3) displayTicker = displayTicker.substring(0, 3);

  return (
    <svg viewBox="0 0 512 512" width="28" height="28">
      <circle cx="256" cy="256" r="256" fill={bgColor} />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill="#fff" fontSize="165" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" textTransform="uppercase" textRendering="optimizeLegibility">{displayTicker}</text>
    </svg>
  );
};

const getTypeBadge = (type) => {
  let bg = '#374151';
  let color = '#d1d5db';
  if (type === 'Criptomonedas' || type === 'Criptomoneda') { bg = 'rgba(139, 92, 246, 0.15)'; color = '#a78bfa'; }
  if (type === 'ETFs') { bg = 'rgba(59, 130, 246, 0.15)'; color = '#60a5fa'; }
  if (type === 'Moneda Fiat') { bg = 'rgba(16, 185, 129, 0.15)'; color = '#34d399'; }

  return (
    <span style={{
      background: bg, color: color, padding: '0.25rem 0.6rem',
      borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
      whiteSpace: 'nowrap'
    }}>
      {type}
    </span>
  );
};

export default function Dashboard({ currency }) {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);
  const [history, setHistory] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [assetsHistory, setAssetsHistory] = useState({});
  const [error, setError] = useState('');

  // Valid tabs: 'portfolio', 'transactions', 'cotizaciones', 'cotizacion_detalle', 'portfolio_asset_detalle'
  const [activeTab, setActiveTab] = useState('portfolio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [refreshTransactions, setRefreshTransactions] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [period, setPeriod] = useState('1M');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Browser history synchronization
  useEffect(() => {
    const checkPath = () => {
      const path = location.pathname;
      let initialTab = 'portfolio';
      let initialAsset = null;
      let initialImporting = false;

      if (path.startsWith('/market')) initialTab = 'cotizaciones';
      else if (path.startsWith('/transactions')) {
        initialTab = 'transactions';
        if (path === '/transactions/import') initialImporting = true;
      }
      else if (path.startsWith('/asset/')) {
        initialTab = 'cotizacion_detalle';
        const ticker = path.split('/')[2];
        if (location.state?.asset?.ticker === ticker) {
          initialAsset = location.state.asset;
        } else {
          initialAsset = { ticker: ticker, name: '' };
        }
      } else if (path.startsWith('/portfolio/possession/')) {
        initialTab = 'portfolio_asset_detalle';
        const ticker = path.split('/')[3];
        if (location.state?.asset?.ticker === ticker) {
          initialAsset = location.state.asset;
        } else {
          initialAsset = { ticker: ticker, name: '' };
        }
      }

      setActiveTab(initialTab);
      setSelectedAsset(initialAsset);
      setIsImporting(initialImporting);
    };

    checkPath();
  }, [location.pathname, location.state]);

  const navigateTo = (tab, asset = null, importing = false) => {
    if (activeTab === tab && selectedAsset?.ticker === asset?.ticker && isImporting === importing) return;

    let path = `/${tab}`;
    if (tab === 'portfolio') path = '/portfolio';
    if (tab === 'cotizaciones') path = '/market';
    if (tab === 'transactions') {
      path = importing ? '/transactions/import' : '/transactions';
    }
    if (tab === 'cotizacion_detalle' && asset) path = `/asset/${asset.ticker}`;
    if (tab === 'portfolio_asset_detalle' && asset) path = `/portfolio/possession/${asset.ticker}`;

    navigate(path, { state: { tab, asset, isImporting: importing } });
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [resSummary, resHistory, resAssets] = await Promise.all([
        api.get('/portfolio/summary'),
        api.get('/portfolio/history'),
        api.get('/assets')
      ]);
      setPortfolio(resSummary.data);
      setHistory(resHistory.data.history || []);
      const assets = resAssets.data || [];
      setAllAssets(assets);

      if (assets.length > 0) {
        const histories = await Promise.all(assets.map(a => api.get(`/assets/${a.ticker}/history`).catch(() => null)));
        const historyMap = {};
        histories.forEach((res, idx) => {
          if (res && res.data && res.data.history) {
            historyMap[assets[idx].ticker] = withLivePrice(sinceOneMonthAgo(res.data.history), assets[idx]);
          }
        });
        setAssetsHistory(historyMap);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError('Error al cargar los datos. Intenta iniciar sesión nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/transactions/');
      const transactions = response.data;

      if (!transactions || transactions.length === 0) {
        alert('No hay transacciones para exportar.');
        return;
      }

      const EXPECTED_HEADERS = [
        "Fecha",
        "Activo",
        "Tipo",
        "Cantidad",
        "Precio unitario",
        "Divisa operada",
        "Plataforma"
      ];

      let csvContent = EXPECTED_HEADERS.join(',') + '\n';

      transactions.forEach(tx => {
        const dateObj = new Date(tx.timestamp);
        const day = String(dateObj.getUTCDate()).padStart(2, '0');
        const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const year = dateObj.getUTCFullYear();
        const hours = String(dateObj.getUTCHours()).padStart(2, '0');
        const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');

        const fecha = `${day}/${month}/${year} ${hours}:${minutes}`;
        const activo = tx.ticker || '';
        const tipo = tx.type || '';
        const isCashInterest = tipo.toLowerCase() === 'intereses' && (Number(tx.quantity) || 0) === 0;
        const cantidad = Number(tx.quantity) || 0;
        const precio = isCashInterest
          ? (Number(tx.total_value) || Number(tx.price_per_unit) || 0)
          : (Number(tx.price_per_unit) || 0);
        const divisa = tx.operated_currency || 'USD';
        const plataforma = tx.platform || '';

        csvContent += `${fecha},${activo},${tipo},${cantidad},${precio},${divisa},${plataforma}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exportando CSV:', err);
      alert('Hubo un error al exportar las transacciones.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransactionAdded = () => {
    fetchData();
    setRefreshTransactions(prev => prev + 1);
    setIsModalOpen(false);
    navigateTo('transactions');
  };

  const handleAssetClick = (asset) => {
    navigateTo('cotizacion_detalle', asset);
  };

  if (loading && !portfolio) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={32} style={{ marginBottom: '1rem', color: 'var(--accent)' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 500, letterSpacing: '0.5px' }}>Cargando portafolio...</div>
      </div>
    );
  }

  if (error) {
    return <div className="text-loss flex-row" style={{ justifyContent: 'center', marginTop: '100px' }}><AlertTriangle /> {error}</div>;
  }

  const isArs = currency === 'ARS';
  const totalValue = isArs ? portfolio.total_value_ars : portfolio.total_value_usd;

  const { gain: totalGain, pct: totalGainPct } = getPeriodGain(portfolio.periods, period, isArs);
  const periodStart = portfolio.periods?.[period]?.start_date;
  const periodLabel = getPeriodLabel(period, periodStart, history[0]?.date);
  const gainColumnSuffix = PERIOD_COLUMN_SUFFIX[period];

  const periodMovers = (
    <PeriodMoversWidget
      assets={portfolio.assets}
      period={period}
      periodLabel={periodLabel}
      currency={currency}
      getName={(asset) => CUSTOM_ASSET_NAMES[asset.ticker] || asset.name}
      onSelect={(asset) => navigateTo('portfolio_asset_detalle', asset)}
      onViewAll={() => navigateTo('cotizaciones')}
    />
  );

  const getAssetType = (ticker) => {
    const asset = allAssets.find(a => a.ticker === ticker);
    if (asset) {
      if (asset.type === 'Acción') return 'Acciones';
      if (asset.type === 'Criptomoneda' || asset.type === 'Crypto') return 'Criptomonedas';
      if (asset.type === 'ETF') return 'ETFs';
      if (asset.type === 'Fiat' || asset.type === 'Efectivo') return 'Moneda Fiat';
      return asset.type;
    }
    return 'Otros';
  };

  const categoryDistribution = portfolio.assets.reduce((acc, asset) => {
    const type = getAssetType(asset.ticker);
    const value = isArs ? asset.total_value_ars : asset.total_value_usd;
    if (acc[type] === undefined) acc[type] = 0;
    acc[type] += value;
    return acc;
  }, {
    'Criptomonedas': 0,
    'ETFs': 0,
    'Moneda Fiat': 0,
    'Acciones': 0
  });

  const categoryData = Object.keys(categoryDistribution).map(type => ({
    type,
    value: categoryDistribution[type],
    percentage: totalValue > 0 ? (categoryDistribution[type] / totalValue) * 100 : 0
  })).sort((a, b) => b.value - a.value);

  return (
    <div>
      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => navigateTo('portfolio')}
        >
          Portafolio
        </button>
        <button
          className={`tab ${activeTab === 'cotizaciones' || activeTab === 'cotizacion_detalle' ? 'active' : ''}`}
          onClick={() => navigateTo('cotizaciones')}
        >
          Cotizaciones
        </button>
        <button
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => navigateTo('transactions')}
        >
          Transacciones
        </button>
      </div>

      {activeTab === 'portfolio' && (
        <div className="dashboard-layout">
          <div className="main-column">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <div>
                <div className="summary-label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Patrimonio Total
                  <div className="tooltip-container">
                    <HelpCircle size={14} color="var(--text-muted)" style={{ cursor: 'help' }} />
                    <div className="tooltip-content" style={{ bottom: '150%', left: '0', transform: 'translateX(-10%)', width: '250px' }}>
                      La suma total del valor actual de todos tus activos convertida a la moneda que tenés seleccionada. Representa tu riqueza neta.
                    </div>
                  </div>
                </div>
                <div className="flex-row" style={{ flexWrap: 'wrap' }}>
                  <h1 className="summary-value">{formatCurrency(totalValue, currency)}</h1>
                  <div className={`badge ${totalGain >= 0 ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '1rem', padding: '0.2rem 0.6rem' }}>
                    {totalGain >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {formatCurrency(Math.abs(totalGain), currency)}
                    {totalGainPct !== null && ` (${formatPct(totalGainPct)}%)`}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.35rem' }}>· {periodLabel}</span>
                  </div>
                </div>
              </div>

            </div>

            <div style={{ marginBottom: '1rem' }}>
              <PortfolioChart
                data={history}
                isArs={isArs}
                range={period}
                onRangeChange={setPeriod}
                startDate={periodStart}
                isGain={totalGain >= 0}
              />
            </div>

            <div className="summary-cards">
              <div className="card">
                <div className="summary-label">Dólar Bolsa</div>
                <div className="summary-value" style={{ fontSize: '1.5rem' }}>
                  {portfolio.exchange_rates.bolsa ? '$' + Math.round(portfolio.exchange_rates.bolsa).toLocaleString('es-AR') : '-'}
                </div>
              </div>
              <div className="card">
                <div className="summary-label">Dólar Cripto</div>
                <div className="summary-value" style={{ fontSize: '1.5rem' }}>
                  {portfolio.exchange_rates.cripto ? '$' + Math.round(portfolio.exchange_rates.cripto).toLocaleString('es-AR') : '-'}
                </div>
              </div>
              <div className="card">
                <div className="summary-label">Dólar Blue</div>
                <div className="summary-value" style={{ fontSize: '1.5rem' }}>
                  {portfolio.exchange_rates.blue ? '$' + Math.round(portfolio.exchange_rates.blue).toLocaleString('es-AR') : '-'}
                </div>
              </div>
            </div>

            <>
              <div className="card" style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Distribución de Activos
                  <div className="tooltip-container">
                    <HelpCircle size={14} color="var(--text-muted)" style={{ cursor: 'help' }} />
                    <div className="tooltip-content" style={{ bottom: '150%', left: '0', transform: 'translateX(-10%)', width: '250px', fontWeight: 'normal' }}>
                      Muestra cómo está diversificado tu dinero. Mantener una buena diversificación ayuda a reducir el riesgo de tu portafolio.
                    </div>
                  </div>
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', minWidth: '300px', maxWidth: '400px' }}>
                    <PieChartComponent data={portfolio.assets} />
                  </div>
                  <div style={{ flex: '1', minWidth: '300px', maxWidth: '500px' }}>
                    <CategoryProgressBars data={categoryData} currency={currency} />
                  </div>
                </div>
              </div>

              <XirrCard portfolio={portfolio} isArs={isArs} />

              {isMobile && (
                <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <MonthlyInvestmentWidget currency={currency} />
                  </div>
                  <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <PassiveIncomeWidget currency={currency} />
                  </div>
                  <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <CompoundInterestWidget portfolio={portfolio} currency={currency} />
                  </div>
                  <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    {periodMovers}
                  </div>
                </div>
              )}

              <div className="table-container hide-on-mobile">
                <table>
                  <thead>
                    <tr>
                      <th>Activo</th>
                      <th className="text-right">Cantidad</th>
                      <th className="text-right">Precio Actual</th>
                      <th className="text-right">Promedio Compra</th>
                      <th className="text-right">Valor Total</th>
                      <th className="text-right">Ganancia {gainColumnSuffix}</th>
                      <th className="text-right">% Ganancia {gainColumnSuffix}</th>
                      <th className="text-right">% Portafolio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.assets.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                          <div className="text-muted">Aún no tienes activos en tu portafolio. Agrega tu primera transacción para comenzar a medir tu rendimiento.</div>
                        </td>
                      </tr>
                    ) : (
                      [...portfolio.assets].sort((a, b) => {
                        const valA = isArs ? a.total_value_ars : a.total_value_usd;
                        const valB = isArs ? b.total_value_ars : b.total_value_usd;
                        return valB - valA;
                      }).map(asset => {
                        const currentPrice = isArs ? asset.current_price_ars : asset.current_price_usd;
                        const avgPrice = isArs ? asset.average_purchase_price_ars : asset.average_purchase_price_usd;
                        const value = isArs ? asset.total_value_ars : asset.total_value_usd;
                        const { gain: profit, pct: profitPct } = getPeriodGain(asset.periods, period, isArs);

                        return (
                          <tr
                            key={asset.ticker}
                            onClick={() => navigateTo('portfolio_asset_detalle', asset)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td>
                              <div className="font-semibold">{asset.ticker}</div>
                              <div className="text-muted" style={{ fontSize: '0.8rem' }}>{CUSTOM_ASSET_NAMES[asset.ticker] || asset.name}</div>
                            </td>
                            <td className="text-right font-semibold">
                              {formatQuantity(asset.quantity, asset.ticker)}
                            </td>
                            <td className="text-right">{formatCurrency(currentPrice, currency)}</td>
                            <td className="text-right text-muted">{formatCurrency(avgPrice, currency)}</td>
                            <td className="text-right font-semibold">{formatCurrency(value, currency)}</td>
                            <td className={`text-right ${profit >= 0 ? 'text-profit' : 'text-loss'}`} style={{ whiteSpace: 'nowrap' }}>
                              {profit > 0 ? '+' : ''}{formatCurrency(profit, currency)}
                            </td>
                            <td className="text-right">
                              {profitPct === null ? (
                                <span className="text-muted">—</span>
                              ) : (
                                <span className={`badge ${profitPct >= 0 ? 'badge-profit' : 'badge-loss'}`}>
                                  {profitPct > 0 ? '+' : ''}{formatPct(profitPct)}%
                                </span>
                              )}
                            </td>
                            <td className="text-right text-muted">{asset.portfolio_percentage.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                          </tr>
                        )
                      }))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="hide-on-desktop">
                {portfolio.assets.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <div className="text-muted">Aún no tienes activos en tu portafolio. Agrega tu primera transacción.</div>
                  </div>
                ) : (
                  [...portfolio.assets].sort((a, b) => {
                    const valA = isArs ? a.total_value_ars : a.total_value_usd;
                    const valB = isArs ? b.total_value_ars : b.total_value_usd;
                    return valB - valA;
                  }).map(asset => {
                    const value = isArs ? asset.total_value_ars : asset.total_value_usd;
                    const { gain: profit, pct: profitPct } = getPeriodGain(asset.periods, period, isArs);

                    return (
                      <div
                        key={asset.ticker}
                        onClick={() => navigateTo('portfolio_asset_detalle', asset)}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                          marginBottom: '1rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="font-semibold" style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{asset.ticker}</span>
                            <span className="text-muted" style={{ fontSize: '0.85rem' }}>{CUSTOM_ASSET_NAMES[asset.ticker] || asset.name}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span className="font-semibold" style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{formatCurrency(value, currency)}</span>
                            {profitPct !== null && (
                              <span className={`badge ${profitPct >= 0 ? 'badge-profit' : 'badge-loss'}`} style={{ marginTop: '0.3rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                                {profitPct > 0 ? '+' : ''}{formatPct(profitPct)}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cantidad</span>
                            <span className="font-semibold" style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{formatQuantity(asset.quantity, asset.ticker)}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ganancia {gainColumnSuffix}</span>
                            <span className={`font-semibold ${profit >= 0 ? 'text-profit' : 'text-loss'}`} style={{ fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                              {profit > 0 ? '+' : ''}{formatCurrency(profit, currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }))}
              </div>
            </>
          </div>
          {!isMobile && (
            <div className="sidebar-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <MonthlyInvestmentWidget currency={currency} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <PassiveIncomeWidget currency={currency} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <CompoundInterestWidget portfolio={portfolio} currency={currency} />
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
                {periodMovers}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cotizaciones' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Mercado</h2>
          </div>
          <div className="table-container hide-on-mobile">
            <table>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Tipo</th>
                  <th>Variación mensual</th>
                  <th className="text-right">Precio de Mercado</th>
                </tr>
              </thead>
              <tbody>
                {[...allAssets].sort((a, b) => {
                  const TYPE_ORDER = { 'Moneda Fiat': 1, 'ETFs': 2, 'Acciones': 3, 'Criptomonedas': 4 };
                  const orderA = TYPE_ORDER[getAssetType(a.ticker)] || 99;
                  const orderB = TYPE_ORDER[getAssetType(b.ticker)] || 99;
                  if (orderA !== orderB) return orderA - orderB;
                  return a.ticker.localeCompare(b.ticker);
                }).map(asset => {
                  const currentPrice = isArs ? asset.current_price_ars : asset.current_price_usd;
                  return (
                    <tr
                      key={asset.ticker}
                      onClick={() => handleAssetClick(asset)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-hover)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {getAssetIcon(asset.ticker)}
                          </div>
                          <div>
                            <div className="font-semibold">{asset.ticker}</div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>{CUSTOM_ASSET_NAMES[asset.ticker] || asset.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {getTypeBadge(getAssetType(asset.ticker))}
                      </td>
                      <td style={{ width: '180px' }}>
                        <Sparkline data={assetsHistory[asset.ticker]} dataKey={isArs ? 'price_ars' : 'price_usd'} />
                      </td>
                      <td className="text-right font-semibold">
                        {formatCurrency(currentPrice, currency)}
                      </td>
                    </tr>
                  )
                })}
                {allAssets.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center text-muted" style={{ padding: '2rem' }}>
                      No hay activos soportados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View for Cotizaciones */}
          <div className="hide-on-desktop">
            {[...allAssets].sort((a, b) => {
              const TYPE_ORDER = { 'Moneda Fiat': 1, 'ETFs': 2, 'Acciones': 3, 'Criptomonedas': 4 };
              const orderA = TYPE_ORDER[getAssetType(a.ticker)] || 99;
              const orderB = TYPE_ORDER[getAssetType(b.ticker)] || 99;
              if (orderA !== orderB) return orderA - orderB;
              return a.ticker.localeCompare(b.ticker);
            }).map(asset => {
              const currentPrice = isArs ? asset.current_price_ars : asset.current_price_usd;
              return (
                <div
                  key={asset.ticker}
                  onClick={() => handleAssetClick(asset)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginBottom: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {getAssetIcon(asset.ticker)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="font-semibold" style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{asset.ticker}</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{CUSTOM_ASSET_NAMES[asset.ticker] || asset.name}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                      <span className="font-semibold" style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{formatCurrency(currentPrice, currency)}</span>
                      {getTypeBadge(getAssetType(asset.ticker))}
                    </div>
                  </div>

                  <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', height: '60px' }}>
                    <Sparkline data={assetsHistory[asset.ticker]} dataKey={isArs ? 'price_ars' : 'price_usd'} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'cotizacion_detalle' && selectedAsset && (
        <AssetDetailView
          asset={selectedAsset}
          currency={currency}
          onBack={() => {
            if (location.state && location.state.tab === 'cotizacion_detalle') {
              navigate(-1);
            } else {
              const prevTab = selectedAsset.total_value_usd !== undefined ? 'portfolio' : 'cotizaciones';
              navigateTo(prevTab);
            }
          }}
        />
      )}

      {activeTab === 'portfolio_asset_detalle' && selectedAsset && (
        <PortfolioAssetDetailView
          asset={selectedAsset}
          currency={currency}
          periodStarts={portfolio?.periods}
          onBack={() => {
            if (location.state && location.state.tab === 'portfolio_asset_detalle') {
              navigate(-1);
            } else {
              navigateTo('portfolio');
            }
          }}
          onGoToMarket={(a) => navigateTo('cotizacion_detalle', a)}
        />
      )}

      {activeTab === 'transactions' && (
        isImporting ? (
          <ImportTransactions
            onCancel={() => navigateTo('transactions', null, false)}
            onImportSuccess={() => {
              navigateTo('transactions', null, false);
            }}
            onDataChanged={() => {
              fetchData();
              setRefreshTransactions(prev => prev + 1);
            }}
            assets={allAssets}
          />
        ) : (
          <>
            <TransactionsList
              currency={currency}
              onTransactionDeleted={fetchData}
              refreshTrigger={refreshTransactions}
              headerActions={[
                <button key="export" className="btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem' }} title="Exportar CSV">
                  <Download size={18} /> <span className="hide-on-mobile">Exportar CSV</span>
                </button>,
                <button key="import" className="btn-secondary" onClick={() => navigateTo('transactions', null, true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem' }} title="Importar CSV">
                  <Upload size={18} /> <span className="hide-on-mobile">Importar CSV</span>
                </button>
              ]}
            />
          </>
        )
      )}

      {(activeTab !== 'cotizacion_detalle' && activeTab !== 'portfolio_asset_detalle' && !isImporting) && (
        <button className="fab" onClick={() => setIsModalOpen(true)}>
          <Plus size={24} />
        </button>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ margin: 0 }}>Nueva transacción</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <TransactionForm onTransactionAdded={handleTransactionAdded} exchangeRates={portfolio?.exchange_rates || {}} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
