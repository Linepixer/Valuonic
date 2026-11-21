import { BRAND_LOGOS, ETF_BADGE_COLORS } from '../brandLogos';

// Shared by the quotes list and the asset detail, which shows the same icon larger.
export const getAssetIcon = (ticker, px = 28) => {
  const cryptoUrl = {
    'BTC': 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=032',
    'USDT': 'https://cryptologos.cc/logos/tether-usdt-logo.svg?v=032',
    'XRP': 'https://cryptologos.cc/logos/xrp-xrp-logo.svg?v=032',
    'ETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=032',
  };

  if (cryptoUrl[ticker]) {
    if (ticker === 'XRP') {
      return (
        <div style={{ width: px, height: px, borderRadius: '50%', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={cryptoUrl[ticker]} alt={ticker} style={{ width: px * 4 / 7, height: px * 4 / 7, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </div>
      );
    }
    return <img src={cryptoUrl[ticker]} alt={ticker} style={{ width: px, height: px, objectFit: 'contain' }} />;
  }

  if (ticker === 'USD' || ticker === 'ARS') {
    const symbol = ticker === 'USD' ? '$' : 'AR$';
    const bg = ticker === 'USD' ? '#16a34a' : '#0284c7';
    return (
      <svg viewBox="0 0 512 512" width={px} height={px}>
        <circle cx="256" cy="256" r="256" fill={bg} />
        <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill="#fff" fontSize={ticker === 'USD' ? "260" : "180"} fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" textRendering="optimizeLegibility">{symbol}</text>
      </svg>
    );
  }

  if (BRAND_LOGOS[ticker]) {
    const { color, path, size = 288, fg = '#fff', parts, viewBox = '0 0 24 24' } = BRAND_LOGOS[ticker];
    // A mark without a circle (Google's G) fills most of the icon, so it doesn't look smaller than the round ones.
    const markSize = color ? size : 400;
    const offset = (512 - markSize) / 2;
    const shapes = parts ?? [{ d: path, fill: fg }];
    return (
      <svg viewBox="0 0 512 512" width={px} height={px} role="img" aria-label={ticker}>
        {color && <circle cx="256" cy="256" r="256" fill={color} />}
        <svg x={offset} y={offset} width={markSize} height={markSize} viewBox={viewBox}>
          {shapes.map(({ d, fill }) => <path key={d} d={d} fill={fill} />)}
        </svg>
      </svg>
    );
  }

  // Generate dynamic SVG logos for equities
  const bgColor = ETF_BADGE_COLORS[ticker] || '#374151';
  let displayTicker = ticker;
  if (displayTicker.length > 3) displayTicker = displayTicker.substring(0, 3);

  return (
    <svg viewBox="0 0 512 512" width={px} height={px}>
      <circle cx="256" cy="256" r="256" fill={bgColor} />
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill="#fff" fontSize="165" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" textTransform="uppercase" textRendering="optimizeLegibility">{displayTicker}</text>
    </svg>
  );
};
