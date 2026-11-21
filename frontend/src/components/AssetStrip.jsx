import { BRAND_LOGOS, ETF_BADGE_COLORS } from '../brandLogos';

// The app shows these as images from cryptologos.cc; inlined here so the strip makes no third-party requests.
// BTC from Simple Icons (CC0); XRP is the X mark cryptologos.cc serves, since Simple Icons' "XRP" is the ledger's.
const CRYPTO_GLYPHS = {
  BTC: {
    color: '#F7931A',
    viewBox: '0 0 24 24',
    d: 'M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z',
  },
  XRP: {
    color: '#FFFFFF',
    viewBox: '0 0 512 424',
    d: 'M437 0h74L357 152.48c-55.77 55.19-146.19 55.19-202 0L.94 0H75L192 115.83a91.11 91.11 0 0 0 127.91 0ZM74.05 424H0L155 270.58c55.77-55.19 146.19-55.19 202 0L512 424H438L320 307.23a91.11 91.11 0 0 0-127.91 0Z',
  },
};

// AMD's full logo is the word "AMD", which would read "AMD AMD" next to the ticker; the strip keeps only its arrow.
const GLYPH_OVERRIDES = {
  AMD: {
    color: '#ED1C24',
    viewBox: '17.9 8.75 6.5 6.5',
    d: 'M18.324 9.137l1.559 1.56h2.556v2.557L24 14.814V9.137zM19.881 11.01l-1.604 1.603v2.25h2.246l1.604-1.607h-2.246z',
  },
};

// Types interleaved so no stretch of the strip reads as only stocks or only ETFs.
const STRIP_TICKERS = ['SPY', 'NVDA', 'BTC', 'AAPL', 'MELI', 'QQQ', 'MSFT', 'KO', 'GLD', 'GOOGL', 'XRP', 'AMZN', 'META', 'DIA', 'TSLA', 'AMD'];

const GLYPH_SIZE = 20;
const ETF_BADGE_SIZE = 24;

function isNearBlack(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.05;
}

function Glyph({ ticker }) {
  const single = GLYPH_OVERRIDES[ticker] ?? CRYPTO_GLYPHS[ticker];
  if (single) {
    return (
      <svg className="asset-strip-glyph" viewBox={single.viewBox} width={GLYPH_SIZE} height={GLYPH_SIZE} style={{ '--tint': single.color }} aria-hidden="true">
        <path d={single.d} fill="currentColor" />
      </svg>
    );
  }

  const badge = ETF_BADGE_COLORS[ticker];
  if (badge) {
    // Same badge as Cotizaciones; a bit larger than the glyphs so its three letters stay legible.
    return (
      <svg className="asset-strip-glyph" viewBox="0 0 512 512" width={ETF_BADGE_SIZE} height={ETF_BADGE_SIZE} aria-hidden="true">
        <circle cx="256" cy="256" r="256" fill={badge} />
        <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill="#fff" fontSize="165" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif">{ticker}</text>
      </svg>
    );
  }

  const logo = BRAND_LOGOS[ticker];
  if (!logo) return null;

  const { color, fg, path, parts, size = 288, viewBox = '0 0 24 24' } = logo;
  // The mark takes the brand color, except where that color is near-black (Apple, Amazon's navy): alone on the dark
  // page it would vanish, so it takes the color the app draws the mark in instead.
  const tint = color && isNearBlack(color) ? (fg ?? '#FFFFFF') : color;
  // Wide wordmarks (KO, AMD, META) get a larger box in the app too, so they don't look smaller than the square ones.
  const box = Math.round(GLYPH_SIZE * size / 288);
  return (
    <svg className="asset-strip-glyph" viewBox={viewBox} width={box} height={box} style={{ '--tint': tint }} aria-hidden="true">
      {parts
        // The strip shows marks without their circle, so a black part (Amazon's "a") turns white to stay visible.
        ? parts.map(({ d, fill }) => <path key={d} d={d} className="asset-strip-part" style={{ '--part': isNearBlack(fill) ? '#FFFFFF' : fill }} />)
        : <path d={path} fill="currentColor" />}
    </svg>
  );
}

function StripItems({ hidden }) {
  return STRIP_TICKERS.map(ticker => (
    <li key={ticker} className="asset-strip-item" aria-hidden={hidden || undefined}>
      <Glyph ticker={ticker} />
      <span className="asset-strip-ticker">{ticker}</span>
    </li>
  ));
}

export default function AssetStrip() {
  return (
    <section className="asset-strip-section animate-landing" style={{ animationDelay: '0.6s' }} aria-label="Activos soportados">
      <div className="asset-strip">
        {/* The list is rendered twice and slid by exactly one copy's width, so the loop has no visible seam. */}
        <ul className="asset-strip-track">
          <StripItems />
          <StripItems hidden />
        </ul>
      </div>
    </section>
  );
}
