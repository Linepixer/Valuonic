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
  'MELI': {
    // Simple Icons has no Mercado Libre icon; this is the group's handshake emblem (published there as Mercado Pago),
    // in Mercado Libre's yellow and navy. White on that yellow would not read.
    color: '#FFE600',
    fg: '#2D3277',
    size: 400,
    path: 'M11.115 16.479a.93.927 0 0 1-.939-.886c-.002-.042-.006-.155-.103-.155-.04 0-.074.023-.113.059-.112.103-.254.206-.46.206a.816.814 0 0 1-.305-.066c-.535-.214-.542-.578-.521-.725.006-.038.007-.08-.02-.11l-.032-.03h-.034c-.027 0-.055.012-.093.039a.788.786 0 0 1-.454.16.7.699 0 0 1-.253-.05c-.708-.27-.65-.928-.617-1.126.005-.041-.005-.072-.03-.092l-.05-.04-.047.043a.728.726 0 0 1-.505.203.73.728 0 0 1-.732-.725c0-.4.328-.722.732-.722.364 0 .675.27.721.63l.026.195.11-.165c.01-.018.307-.46.852-.46.102 0 .21.016.316.05.434.13.508.52.519.68.008.094.075.1.09.1.037 0 .064-.024.083-.045a.746.744 0 0 1 .54-.225c.128 0 .263.03.402.09.69.293.379 1.158.374 1.167-.058.144-.061.207-.005.244l.027.013h.02c.03 0 .07-.014.134-.035.093-.032.235-.08.367-.08a.944.942 0 0 1 .94.93.936.934 0 0 1-.94.928zm7.302-4.171c-1.138-.98-3.768-3.24-4.481-3.77-.406-.302-.685-.462-.928-.533a1.559 1.554 0 0 0-.456-.07c-.182 0-.376.032-.58.095-.46.145-.918.505-1.362.854l-.023.018c-.414.324-.84.66-1.164.73a1.986 1.98 0 0 1-.43.049c-.362 0-.687-.104-.81-.258-.02-.025-.007-.066.04-.125l.008-.008 1-1.067c.783-.774 1.525-1.506 3.23-1.545h.085c1.062 0 2.12.469 2.24.524a7.03 7.03 0 0 0 3.056.724c1.076 0 2.188-.263 3.354-.795a9.135 9.11 0 0 0-.405-.317c-1.025.44-2.003.66-2.946.66-.962 0-1.925-.229-2.858-.68-.05-.022-1.22-.567-2.44-.57-.032 0-.065 0-.096.002-1.434.033-2.24.536-2.782.976-.528.013-.982.138-1.388.25-.361.1-.673.186-.979.185-.125 0-.35-.01-.37-.012-.35-.01-2.115-.437-3.518-.962-.143.1-.28.203-.415.31 1.466.593 3.25 1.053 3.812 1.089.157.01.323.027.491.027.372 0 .744-.103 1.104-.203.213-.059.446-.123.692-.17l-.196.194-1.017 1.087c-.08.08-.254.294-.14.557a.705.703 0 0 0 .268.292c.243.162.677.27 1.08.271.152 0 .297-.015.43-.044.427-.095.874-.448 1.349-.82.377-.296.913-.672 1.323-.782a1.494 1.49 0 0 1 .37-.05.611.61 0 0 1 .095.005c.27.034.533.125 1.003.472.835.62 4.531 3.815 4.566 3.846.002.002.238.203.22.537-.007.186-.11.352-.294.466a.902.9 0 0 1-.484.15.804.802 0 0 1-.428-.124c-.014-.01-1.28-1.157-1.746-1.543-.074-.06-.146-.115-.22-.115a.122.122 0 0 0-.096.045c-.073.09.01.212.105.294l1.48 1.47c.002 0 .184.17.204.395.012.244-.106.447-.35.606a.957.955 0 0 1-.526.171.766.764 0 0 1-.42-.127l-.214-.206a21.035 20.978 0 0 0-1.08-1.009c-.072-.058-.148-.112-.221-.112a.127.127 0 0 0-.094.038c-.033.037-.056.103.028.212a.698.696 0 0 0 .075.083l1.078 1.198c.01.01.222.26.024.511l-.038.048a1.18 1.178 0 0 1-.1.096c-.184.15-.43.164-.527.164a.8.798 0 0 1-.147-.012c-.106-.018-.178-.048-.212-.089l-.013-.013c-.06-.06-.602-.609-1.054-.98-.059-.05-.133-.11-.21-.11a.128.128 0 0 0-.096.042c-.09.096.044.24.1.293l.92 1.003a.204.204 0 0 1-.033.062c-.033.044-.144.155-.479.196a.91.907 0 0 1-.122.007c-.345 0-.712-.164-.902-.264a1.343 1.34 0 0 0 .13-.576 1.368 1.365 0 0 0-1.42-1.357c.024-.342-.025-.99-.697-1.274a1.455 1.452 0 0 0-.575-.125c-.146 0-.287.025-.42.075a1.153 1.15 0 0 0-.671-.564 1.52 1.515 0 0 0-.494-.085c-.28 0-.537.08-.767.242a1.168 1.165 0 0 0-.903-.43 1.173 1.17 0 0 0-.82.335c-.287-.217-1.425-.93-4.467-1.613a17.39 17.344 0 0 1-.692-.189 4.822 4.82 0 0 0-.077.494l.67.157c3.108.682 4.136 1.391 4.309 1.525a1.145 1.142 0 0 0-.09.442 1.16 1.158 0 0 0 1.378 1.132c.096.467.406.821.879 1.003a1.165 1.162 0 0 0 .415.08c.09 0 .179-.012.266-.034.086.22.282.493.722.668a1.233 1.23 0 0 0 .457.094c.122 0 .241-.022.355-.063a1.373 1.37 0 0 0 1.269.841c.37.002.726-.147.985-.41.221.121.688.341 1.163.341.06 0 .118-.002.175-.01.47-.059.689-.24.789-.382a.571.57 0 0 0 .048-.078c.11.032.234.058.373.058.255 0 .501-.086.75-.265.244-.174.418-.424.444-.637v-.01c.083.017.167.026.251.026.265 0 .527-.082.773-.242.48-.31.562-.715.554-.98a1.28 1.279 0 0 0 .978-.194 1.04 1.04 0 0 0 .502-.808 1.088 1.085 0 0 0-.16-.653c.804-.342 2.636-1.003 4.795-1.483a4.734 4.721 0 0 0-.067-.492 27.742 27.667 0 0 0-5.049 1.62zm5.123-.763c0 4.027-5.166 7.293-11.537 7.293-6.372 0-11.538-3.266-11.538-7.293 0-4.028 5.165-7.293 11.539-7.293 6.371 0 11.537 3.265 11.537 7.293zm.46.004c0-4.272-5.374-7.755-12-7.755S.002 7.277.002 11.55L0 12.004c0 4.533 4.695 8.203 11.999 8.203 7.347 0 12-3.67 12-8.204z',
  },
  'AAPL': {
    color: '#000000',
    path: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
  },
  'AMD': {
    color: '#ED1C24',
    size: 440,
    path: 'M18.324 9.137l1.559 1.56h2.556v2.557L24 14.814V9.137zM2 9.52l-2 4.96h1.309l.37-.982H3.9l.408.982h1.338L3.432 9.52zm4.209 0v4.955h1.238v-3.092l1.338 1.562h.188l1.338-1.556v3.091h1.238V9.52H10.47l-1.592 1.845L7.287 9.52zm6.283 0v4.96h2.057c1.979 0 2.88-1.046 2.88-2.472 0-1.36-.937-2.488-2.747-2.488zm1.237.91h.792c1.17 0 1.63.711 1.63 1.57 0 .728-.372 1.572-1.616 1.572h-.806zm-10.985.273l.791 1.932H2.008zm17.137.307l-1.604 1.603v2.25h2.246l1.604-1.607h-2.246z',
  },
  'MSFT': {
    // The four-color window is the brand, so it keeps its own colors on white instead of a single-color glyph.
    color: '#FFFFFF',
    parts: [
      { fill: '#F25022', d: 'M0 0h11.4v11.4H0z' },
      { fill: '#7FBA00', d: 'M12.6 0H24v11.4H12.6z' },
      { fill: '#00A4EF', d: 'M0 12.6h11.4V24H0z' },
      { fill: '#FFB900', d: 'M12.6 12.6H24V24H12.6z' },
    ],
  },
  'META': {
    color: '#0467DF',
    // A wide mark like KO and AMD: a bigger box keeps it from looking small next to the square logos.
    size: 360,
    path: 'M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z',
  },
  'TSLA': {
    color: '#CC0000',
    path: 'M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362l-.004.002H12v-.002zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46v.003z',
  },
  'GOOGL': {
    color: '#4285F4',
    path: 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z',
  },
  'AMZN': {
    // Amazon's own pairing, orange smile on its dark navy; white on that orange would barely read.
    color: '#232F3E',
    fg: '#FF9900',
    path: 'M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726a17.617 17.617 0 01-10.951-.577 17.88 17.88 0 01-5.43-3.35c-.1-.074-.151-.15-.151-.22 0-.047.021-.09.051-.13zm6.565-6.218c0-1.005.247-1.863.743-2.577.495-.71 1.17-1.25 2.04-1.615.796-.335 1.756-.575 2.912-.72.39-.046 1.033-.103 1.92-.174v-.37c0-.93-.105-1.558-.3-1.875-.302-.43-.78-.65-1.44-.65h-.182c-.48.046-.896.196-1.246.46-.35.27-.575.63-.675 1.096-.06.3-.206.465-.435.51l-2.52-.315c-.248-.06-.372-.18-.372-.39 0-.046.007-.09.022-.15.247-1.29.855-2.25 1.82-2.88.976-.616 2.1-.975 3.39-1.05h.54c1.65 0 2.957.434 3.888 1.29.135.15.27.3.405.48.12.165.224.314.283.45.075.134.15.33.195.57.06.254.105.42.135.51.03.104.062.3.076.615.01.313.02.493.02.553v5.28c0 .376.06.72.165 1.036.105.313.21.54.315.674l.51.674c.09.136.136.256.136.36 0 .12-.06.226-.18.314-1.2 1.05-1.86 1.62-1.963 1.71-.165.135-.375.15-.63.045a6.062 6.062 0 01-.526-.496l-.31-.347a9.391 9.391 0 01-.317-.42l-.3-.435c-.81.886-1.603 1.44-2.4 1.665-.494.15-1.093.227-1.83.227-1.11 0-2.04-.343-2.76-1.034-.72-.69-1.08-1.665-1.08-2.94l-.05-.076zm3.753-.438c0 .566.14 1.02.425 1.364.285.34.675.512 1.155.512.045 0 .106-.007.195-.02.09-.016.134-.023.166-.023.614-.16 1.08-.553 1.424-1.178.165-.28.285-.58.36-.91.09-.32.12-.59.135-.8.015-.195.015-.54.015-1.005v-.54c-.84 0-1.484.06-1.92.18-1.275.36-1.92 1.17-1.92 2.43l-.035-.02zm9.162 7.027c.03-.06.075-.11.132-.17.362-.243.714-.41 1.05-.5a8.094 8.094 0 011.612-.24c.14-.012.28 0 .41.03.65.06 1.05.168 1.172.33.063.09.099.228.099.39v.15c0 .51-.149 1.11-.424 1.8-.278.69-.664 1.248-1.156 1.68-.073.06-.14.09-.197.09-.03 0-.06 0-.09-.012-.09-.044-.107-.12-.064-.24.54-1.26.806-2.143.806-2.64 0-.15-.03-.27-.087-.344-.145-.166-.55-.257-1.224-.257-.243 0-.533.016-.87.046-.363.045-.7.09-1 .135-.09 0-.148-.014-.18-.044-.03-.03-.036-.047-.02-.077 0-.017.006-.03.02-.063v-.06z',
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
    const { color, path, size = 288, fg = '#fff', parts } = BRAND_LOGOS[ticker];
    const offset = (512 - size) / 2;
    const shapes = parts ?? [{ d: path, fill: fg }];
    return (
      <svg viewBox="0 0 512 512" width="28" height="28" role="img" aria-label={ticker}>
        <circle cx="256" cy="256" r="256" fill={color} />
        <svg x={offset} y={offset} width={size} height={size} viewBox="0 0 24 24">
          {shapes.map(({ d, fill }) => <path key={d} d={d} fill={fill} />)}
        </svg>
      </svg>
    );
  }

  // Generate dynamic SVG logos for equities
  const colors = {
    'SPY': '#c51f33',
    'QQQ': '#1e3a8a',
    'GLD': '#ca8a04',
    'DIA': '#0f766e',
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
