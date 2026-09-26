---
name: Ledger Sovereign
colors:
  surface: '#101417'
  surface-dim: '#101417'
  surface-bright: '#363a3d'
  surface-container-lowest: '#0b0f12'
  surface-container-low: '#181c1f'
  surface-container: '#1c2023'
  surface-container-high: '#262a2e'
  surface-container-highest: '#313539'
  on-surface: '#e0e3e7'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#e0e3e7'
  inverse-on-surface: '#2d3134'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#e29100'
  on-tertiary-container: '#523200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#101417'
  on-background: '#e0e3e7'
  surface-variant: '#313539'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  metric-xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  metric-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  metric-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-regular:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system establishes a high-precision, institutional yet warm financial environment tailored for bi-monetary portfolio tracking (ARS/USD). The design narrative resolves the inherent volatility and complexity of the Argentine and regional financial context into serene, unambiguous mathematical clarity. 

Drawing heavily from the technical restraint of Linear and Bloomberg Terminals softened by the humane minimalism of Stripe, the visual identity rejects generic neon-green artificiality in favor of deep charcoal strata, muted institutional emerald accents, and crisp tabular typography. The interface feels permanent, dense with utility, and quiet—projecting composure, institutional trust, and absolute control.

The visual style blends:
- **Dark Minimalist Precision:** Rich charcoal foundation layers that minimize eye strain during intense data analysis.
- **Micro-tactile Outlines:** Razor-thin borders (1px) with subtle opacity shifts replacing heavy drop shadows for clean spatial boundaries.
- **Editorial FinTech Data Presentation:** High tabular legibility, calibrated data density, and distinct color roles reserved exclusively for fiscal movements, currency arbitrage, and market indices (MEP, CCL, Blue, Cedears, Merval).

## Colors

The palette is engineered around deep carbon layers with strict functional semantics. Chromatic energy is reserved strictly for signal-bearing financial data: yields, currency spreads, tickers, and asset class distributions.

### Foundation & Surfaces
- **Canvas Base (`#080B0E`):** The deepest foundation backing all layouts and structural grids.
- **Surface Elevation 1 (`#0E1318`):** Main application cards, sidebar background, and top navigation containers.
- **Surface Elevation 2 (`#151C23`):** Elevated inner wells, interactive input states, data tables, and hover targets.
- **Surface Elevation 3 (`#1D2630`):** Floating dropdowns, context menus, modal sheets, and active segmented controls.

### Structural Lines & Borders
- **Border Subtle (`rgba(255, 255, 255, 0.06)`):** Standard card separation and non-intrusive container divisions.
- **Border Default (`rgba(255, 255, 255, 0.12)`):** Interactive component outlines, selected pills, and data grid divisions.
- **Border Focused (`rgba(16, 185, 129, 0.5)`):** Dynamic focus indicators for inputs and active financial charts.

### Accents & Financial Semantics
- **Positive Yield / Emerald (`#10B981`):** Institutional green signaling capital appreciation, positive XIRR, and primary action affordances.
- **Negative Yield / Crimson (`#F43F5E`):** Controlled red reserved exclusively for capital drawdown and loss vectors.
- **Bi-monetary FX Accent (`#38BDF8`):** Sky blue reserved for Argentine FX metrics (Dólar MEP, CCL, Cripto), bridging currency conversions.
- **Asset Allocation Spectrum:**
  - Cash / Fiat: `#10B981`
  - Fixed Income / Cedears: `#0284C7`
  - Equity / Merval / Global: `#F59E0B`
  - Crypto / Hard Assets: `#8B5CF6`
  - Alternative: `#EC4899`

## Typography

The typographic scale pairs **Plus Jakarta Sans** for expressive header hierarchies with **Inter** for dense, computational clarity.

### Tabular Formatting
All numerical figures, currency tags, tickers, rate quotations, and portfolio totals must explicitly apply tabular numerals (`font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;`). This prevents layout jitter during real-time data streaming and ensures absolute vertical decimal alignment across comparative tables.

### Hierarchy & Scale
- **Display & Headings:** Formed with tight negative letter tracking to create strong, architectural titles and balance numerical summaries.
- **Metric Tokens (`metric-xl`, `metric-lg`, `metric-md`):** Tailored weights specifically intended for portfolio balances, asset amounts, and rate badges.
- **Label Caps:** Formatted in uppercase with `0.06em` letter spacing for financial tags (e.g., `DÓLAR CCL`, `XIRR HISTÓRICO`, `MEP COMPRA`).

## Layout & Spacing

The layout adopts an institutional grid that optimizes analytical scanning speed and high density of bi-monetary financial telemetry.

### Grid Framework
- **Desktop (>= 1280px):** 12-column responsive fluid grid with maximum canvas constraint at `1440px`. Column gutter at `1.25rem` (20px) and page margin at `2rem` (32px).
- **Tablet (768px – 1279px):** 8-column layout with `1rem` (16px) gutters and `1.5rem` (24px) margins. Data panels collapse from split 3-up cards into dual-column groups.
- **Mobile (< 768px):** 4-column layout with `0.75rem` (12px) gutters and `1rem` (16px) margins. Horizontal scrolling rail views are used for ticker strips and quick time-horizon selectors (1D, 1S, 1M, 1A, MAX).

### Rhythmic Discipline
Spatial structure strictly follows a 4px/8px modular cadence. Internal card paddings use `space-lg` (24px) on desktop and drop to `space-md` (16px) on mobile cards. Tight relational groupings (e.g., currency symbol + value + percentage delta) adhere strictly to `space-xs` (4px) and `space-sm` (8px).

## Elevation & Depth

This design system avoids blurry skeuomorphism, noisy AI-generated drop shadows, and harsh saturated halos. Elevation is communicated through structured tonal shifts and low-contrast surface borders.

### Surface Hierarchy
1. **Level 0 (App Canvas):** `#080B0E` (Deep charcoal baseline).
2. **Level 1 (Card Baseline):** `#0E1318` paired with a 1px border `rgba(255, 255, 255, 0.07)`.
3. **Level 2 (Active Wells & Nested Panels):** `#151C23` with a 1px border `rgba(255, 255, 255, 0.05)`.
4. **Level 3 (Overlays & Dialogs):** `#18202A` with a subtle diffuse shadow `0 20px 40px -15px rgba(0, 0, 0, 0.6)` and border `rgba(255, 255, 255, 0.12)`.

### Technical Backdrop & Subtle Ambient Gradients
When charts or high-level totals require contextual focus, a restrained radial gradient is applied strictly behind the chart SVG area:
`radial-gradient(ellipse 60% 40% at 50% 0%, rgba(16, 185, 129, 0.08), transparent 70%)`.
Fine technical gridlines in background spaces are constrained to `rgba(255, 255, 255, 0.02)` at 32px intervals.

## Shapes

The design system maintains a refined balance between soft ergonomics and structured geometry using Level 2 roundedness (`0.5rem` / 8px baseline):

- **Data Cards & Containers:** `12px` (`rounded-lg`) to preserve sharp data separation while remaining contemporary and approachable.
- **Controls & Form Inputs:** `8px` (`rounded-md`) for field targets, buttons, and dropdown triggers.
- **Badges, Tickers & Time-frame Chips:** `9999px` (Full Pill) for market state tags, exchange quotes (MEP / CCL), and pill toggles (ARS / USD).
- **Nested Inner Wells:** `6px` (`rounded-sm`) to nest comfortably within `12px` parent cards without geometric corner collisions.

## Components

### Buttons
- **Primary:** Filled with `#10B981`, text in `#042F2E` (or `#080B0E`) with `font-weight: 600`. Subtle hover shift to `#059669`. Never use harsh drop shadows or neon halos.
- **Secondary / Ghost:** Transparent background with `1px solid rgba(255, 255, 255, 0.12)`, text in `#F1F5F9`. Hover transitions surface to `rgba(255, 255, 255, 0.05)`.
- **Currency Switcher Pill (ARS | USD):** A single 8-shape pill container (`#12171C` background with `1px solid rgba(255, 255, 255, 0.08)`) encasing two compact toggles. The active currency uses `#1F2937` with crisp white text.

### Currency & Metric Cards
- **Structure:** Card surface `#0E1318` with subtle border. 
- **Header:** Label caps in muted slate (`#64748B`), paired with an optional micro-tooltip icon.
- **Main Figure:** Tabular-numeral metric value in bright high-contrast text (`#F8FAFC`).
- **Delta Indicator:** Compact badge showing inline trend icon (↗ or ↘), numeric delta, and percentage (e.g., `+USD 29.632,37 (12,54%)`) using `#10B981` (positive) or `#F43F5E` (negative).

### Form Inputs & Selectors
- **Input Fields:** Dark container `#0E1318`, border `rgba(255, 255, 255, 0.1)`. Placeholder text in `#475569`. Active focus transitions border to `#10B981` with a zero-distance outer ring `0 0 0 1px rgba(16, 185, 129, 0.4)`.
- **Bimonetary Split Inputs:** Dual input fields side-by-side allowing simultaneous valuation display in Pesos Argentinos (ARS) and US Dollars (USD) according to chosen rate (MEP, Oficial, or CCL).

### Tables & Asset Holdings List
- **Header Row:** Muted uppercase labels (`#64748B`, `11px`, `600`), bordered bottom by `1px solid rgba(255, 255, 255, 0.06)`.
- **Data Rows:** `48px` minimum height, subtle hover background `rgba(255, 255, 255, 0.02)`. Left-aligned assets (Ticker, Name, Icon badge) and right-aligned quantitative values (Quantity, Avg Purchase Price, Current Quote, Total Balance, Unrealized Gain/Loss).

### Market Tickers Strip (Argentine Context)
- Specialized horizontal ticker component displaying Dólar MEP, Dólar CCL, Dólar Blue, and Merval Index. Each ticker features the rate identifier in pill format, current quotation, and daily variation indicator.