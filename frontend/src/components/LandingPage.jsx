import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Code2,
  Terminal,
  TrendingUp
} from 'lucide-react';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* 1. Barra de Navegación Minimalista (2 Extremos) */}
      <nav className="landing-navbar">
        <div className="landing-navbar-inner">
          {/* Extremo Izquierdo: Logo Oficial */}
          <div
            className="landing-brand"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img src="/logo.svg?v=4" alt="Valuonic Logo" className="landing-logo-img" />
          </div>

          {/* Extremo Derecho: Navegación + Divisor + Ir a la App */}
          <div className="landing-nav-right">
            <a
              href="#features"
              className="landing-nav-link"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Características
            </a>
            <a
              href="#architecture"
              className="landing-nav-link"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Arquitectura
            </a>
            <div className="landing-nav-divider" />
            <button
              className="btn-landing-primary"
              onClick={() => navigate('/login')}
            >
              <span>Ir a la App</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </nav>

      {/* 2. Sección Hero */}
      <section className="hero-section">
        <div className="hero-bg-glow"></div>
        <div className="hero-grid">
          {/* Columna Izquierda: Copywriting y CTAs */}
          <div className="hero-content">
            <div className="hero-badge animate-landing" style={{ animationDelay: '0.1s' }}>
              <span className="hero-badge-dot"></span>
              <span>Proyecto Open Source · Pensado para el mercado argentino y global</span>
            </div>

            <h1 className="hero-title animate-landing" style={{ animationDelay: '0.2s' }}>
              Seguimiento patrimonial bimonetario con métricas reales.
            </h1>

            <p className="hero-subtitle animate-landing" style={{ animationDelay: '0.3s' }}>
              Consolidá tu portafolio en pesos y dólares en una sola interfaz. Valuonic calcula tu tasa interna de retorno (XIRR), integra cotizaciones de Dólar MEP, Cripto y Blue en tiempo real y mide el rendimiento real de tus activos sin hojas de cálculo manuales.
            </p>

            <div className="hero-actions animate-landing" style={{ animationDelay: '0.4s' }}>
              <button
                className="btn-hero-primary"
                onClick={() => navigate('/login')}
              >
                <span>Comenzar ahora</span>
                <ArrowRight size={16} />
              </button>

              <a
                href="https://github.com/Linepixer/Valuonic"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hero-github"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>Ver repositorio en GitHub</span>
              </a>
            </div>

            <div className="hero-specs animate-landing" style={{ animationDelay: '0.5s' }}>
              <span className="hero-spec-item">
                <Check size={14} className="hero-spec-icon" strokeWidth={3} />
                <span>100% Sin custodia (Self-hosted)</span>
              </span>
              <span className="hero-spec-item">
                <Check size={14} className="hero-spec-icon" strokeWidth={3} />
                <span>Cero telemetría</span>
              </span>
              <span className="hero-spec-item">
                <Check size={14} className="hero-spec-icon" strokeWidth={3} />
                <span>Licencia MIT</span>
              </span>
            </div>
          </div>

          {/* Columna Derecha: Presentación del Producto con Marco Estilizado de Ventana */}
          <div className="hero-mockup-wrapper animate-landing" style={{ animationDelay: '0.3s' }}>
            <div className="hero-mockup-container">
              <div className="hero-mockup-glow"></div>
              <div className="hero-mockup">
                {/* Barra superior de ventana de navegador */}
                <div className="mockup-window-header">
                  <div className="window-dots">
                    <span className="window-dot red"></span>
                    <span className="window-dot yellow"></span>
                    <span className="window-dot green"></span>
                  </div>
                  <div className="window-address-pill">
                    <span className="address-lock"></span>
                    <span>valuonic.local/portfolio</span>
                  </div>
                  <div className="window-header-spacer"></div>
                </div>

                <div className="mockup-window-body">
                  <img
                    src="/dashboard-pc.png?v=2"
                    alt="Valuonic Dashboard en Computadora"
                    className="mockup-img-pc"
                  />
                </div>

                <div className="mockup-mobile-frame">
                  <img
                    src="/dashboard-mobile.png?v=2"
                    alt="Valuonic Dashboard en Celular"
                    className="mockup-img-mobile"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sección de Funcionalidades (Grilla Bento) */}
      <section id="features" className="bento-section">
        <div className="bento-header">
          <h2>Métricas financieras precisas, sin fórmulas rotas.</h2>
          <p>
            Cada módulo resuelve los problemas reales de llevar una cartera diversificada entre moneda local, activos dolarizados y criptomonedas.
          </p>
        </div>

        <div className="bento-grid-12">
          {/* Tarjeta 1 (Span 7): Valuación Bimonetaria en Tiempo Real */}
          <div className="bento-card span-7 animate-landing" style={{ animationDelay: '0.1s' }}>
            <div className="bento-card-text">
              <h3>Valuación Bimonetaria en Tiempo Real</h3>
              <p>
                Alterná la visualización de todo tu patrimonio entre ARS y USD con un clic. Toma automáticamente las referencias de Dólar Bolsa (MEP), Cripto y Blue para reflejar tu liquidez exacta.
              </p>
            </div>

            {/* Componente UI Real: Toggle ARS/USD + Cotizaciones Reales */}
            <div className="bento-mockup-bimonetary">
              <div className="bimonetary-topbar">
                <div className="bimonetary-label">Patrimonio consolidado</div>
                <div className="currency-toggle-pill">
                  <span className="toggle-item">ARS</span>
                  <span className="toggle-item active">USD</span>
                </div>
              </div>

              <div className="rates-preview-grid">
                <div className="rate-mini-card">
                  <span className="rate-title">DÓLAR BOLSA</span>
                  <span className="rate-value">$1.534</span>
                  <span className="rate-sub">Referencia MEP</span>
                </div>
                <div className="rate-mini-card">
                  <span className="rate-title">DÓLAR CRIPTO</span>
                  <span className="rate-value">$1.618</span>
                  <span className="rate-sub">USDT / USDC</span>
                </div>
                <div className="rate-mini-card">
                  <span className="rate-title">DÓLAR BLUE</span>
                  <span className="rate-value">$1.535</span>
                  <span className="rate-sub">Informal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta 2 (Span 5): Rendimiento Anualizado (XIRR) con Eje Cero Bidireccional */}
          <div className="bento-card span-5 animate-landing" style={{ animationDelay: '0.2s' }}>
            <div className="bento-card-text">
              <h3>Rendimiento Anualizado (XIRR)</h3>
              <p>
                Calculá la Tasa Interna de Retorno Ponderada por fechas exactas de compra y venta. Conocé qué activos traccionan tu cartera y cuáles rinden por debajo del promedio.
              </p>
            </div>

            {/* Componente UI Real: Global XIRR + Eje Cero Bidireccional (+ / -) */}
            <div className="bento-mockup-xirr">
              <div className="xirr-header-box">
                <span className="xirr-label">TIR Ponderada</span>
                <span className="xirr-badge-positive">
                  <TrendingUp size={14} />
                  <span>+5,25% Portafolio global</span>
                </span>
              </div>

              <div className="xirr-axis-legend">
                <span className="axis-legend-left">Negativo (−)</span>
                <span className="axis-legend-zero">0%</span>
                <span className="axis-legend-right">Positivo (+)</span>
              </div>

              <div className="xirr-bars-list">
                {/* XRP (+71,75%) */}
                <div className="xirr-bar-row">
                  <span className="xirr-asset-ticker">XRP</span>
                  <div className="xirr-axis-track">
                    <div className="xirr-axis-negative"></div>
                    <div className="xirr-axis-line"></div>
                    <div className="xirr-axis-positive">
                      <div className="xirr-bar-fill positive" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <span className="xirr-asset-return positive">+71,75%</span>
                </div>

                {/* SPY (+24,12%) */}
                <div className="xirr-bar-row">
                  <span className="xirr-asset-ticker">SPY</span>
                  <div className="xirr-axis-track">
                    <div className="xirr-axis-negative"></div>
                    <div className="xirr-axis-line"></div>
                    <div className="xirr-axis-positive">
                      <div className="xirr-bar-fill positive" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                  <span className="xirr-asset-return positive">+24,12%</span>
                </div>

                {/* QQQ (+13,91%) */}
                <div className="xirr-bar-row">
                  <span className="xirr-asset-ticker">QQQ</span>
                  <div className="xirr-axis-track">
                    <div className="xirr-axis-negative"></div>
                    <div className="xirr-axis-line"></div>
                    <div className="xirr-axis-positive">
                      <div className="xirr-bar-fill positive" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                  <span className="xirr-asset-return positive">+13,91%</span>
                </div>

                {/* GLD (-11,03%): Crece hacia la izquierda desde la línea de cero */}
                <div className="xirr-bar-row">
                  <span className="xirr-asset-ticker">GLD</span>
                  <div className="xirr-axis-track">
                    <div className="xirr-axis-negative">
                      <div className="xirr-bar-fill negative" style={{ width: '55%' }}></div>
                    </div>
                    <div className="xirr-axis-line"></div>
                    <div className="xirr-axis-positive"></div>
                  </div>
                  <span className="xirr-asset-return negative">-11,03%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta 3 (Span 6): Distribución y Exposición por Activo */}
          <div className="bento-card span-6 animate-landing" style={{ animationDelay: '0.3s' }}>
            <div className="bento-card-text">
              <h3>Distribución y Exposición por Activo</h3>
              <p>
                Visualizá el peso porcentual de cada categoría (Moneda Fiat, ETFs, Criptomonedas y Acciones) para detectar sobreexposición y rebalancear a tiempo.
              </p>
            </div>

            {/* Componente UI Real: Barras de Progreso por Categoría + Tags */}
            <div className="bento-mockup-allocation">
              <div className="allocation-progress-list">
                <div className="alloc-item">
                  <div className="alloc-meta">
                    <span className="alloc-name">Moneda Fiat</span>
                    <span className="alloc-pct">42,33%</span>
                  </div>
                  <div className="alloc-track">
                    <div className="alloc-fill fiat" style={{ width: '42.33%' }}></div>
                  </div>
                </div>
                <div className="alloc-item">
                  <div className="alloc-meta">
                    <span className="alloc-name">ETFs</span>
                    <span className="alloc-pct">40,36%</span>
                  </div>
                  <div className="alloc-track">
                    <div className="alloc-fill etf" style={{ width: '40.36%' }}></div>
                  </div>
                </div>
                <div className="alloc-item">
                  <div className="alloc-meta">
                    <span className="alloc-name">Criptomonedas</span>
                    <span className="alloc-pct">17,31%</span>
                  </div>
                  <div className="alloc-track">
                    <div className="alloc-fill crypto" style={{ width: '17.31%' }}></div>
                  </div>
                </div>
              </div>

              <div className="alloc-tags-row">
                <span className="asset-pill"><span className="dot dot-fiat"></span>USD</span>
                <span className="asset-pill"><span className="dot dot-etf"></span>QQQ</span>
                <span className="asset-pill"><span className="dot dot-etf"></span>SPY</span>
                <span className="asset-pill"><span className="dot dot-etf"></span>GLD</span>
                <span className="asset-pill"><span className="dot dot-crypto"></span>BTC</span>
                <span className="asset-pill"><span className="dot dot-crypto"></span>USDT</span>
              </div>
            </div>
          </div>

          {/* Tarjeta 4 (Span 6): Ritmo de Inversión y Proyección Compuesta */}
          <div className="bento-card span-6 animate-landing" style={{ animationDelay: '0.4s' }}>
            <div className="bento-card-text">
              <h3>Ritmo de Inversión y Proyección Compuesta</h3>
              <p>
                Auditá tu constancia de ahorro mensual histórico y simulá el crecimiento de tu capital a 1, 5, 10 y 20 años basándote en tu rendimiento efectivo.
              </p>
            </div>

            {/* Componente UI Real: Mini-Panel Dividido */}
            <div className="bento-mockup-compound">
              <div className="compound-half left">
                <span className="compound-caption">RITMO DE INVERSIÓN</span>
                <div className="compound-number">USD 12.393</div>
                <span className="compound-subtext">Promedio mensual ahorrado</span>
                <div className="sparkline-bars">
                  <span className="spark-bar" style={{ height: '45%' }}></span>
                  <span className="spark-bar" style={{ height: '60%' }}></span>
                  <span className="spark-bar" style={{ height: '55%' }}></span>
                  <span className="spark-bar" style={{ height: '80%' }}></span>
                  <span className="spark-bar" style={{ height: '70%' }}></span>
                  <span className="spark-bar active" style={{ height: '95%' }}></span>
                </div>
              </div>
              <div className="compound-half right">
                <span className="compound-caption">PROYECCIÓN A 10 AÑOS</span>
                <div className="compound-number green">USD 2.382.309</div>
                <span className="compound-subtext">Rendimiento anual ponderado</span>
                <div className="compound-badge-pill">
                  <span>Simulación con Interés Compuesto</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Sección: Arquitectura y Privacidad */}
      <section id="architecture" className="arch-section">
        <div className="arch-header">
          <h2>Código abierto, autohospedable y transparente.</h2>
          <p>
            Tus datos financieros no deberían vivir en servidores de terceros. Desplegá tu propia instancia local o en tu servidor privado en minutos.
          </p>
        </div>

        <div className="arch-grid">
          {/* Bloque 1: Privacidad por diseño */}
          <div className="arch-card">
            <div className="arch-icon-box">
              <ShieldCheck size={22} />
            </div>
            <h3>Privacidad por diseño</h3>
            <p>
              Base de datos propia en PostgreSQL. Sin rastreadores, sin venta de datos y sin conexión obligatoria a cuentas bancarias.
            </p>
            <div className="arch-tag">
              <span>Cero telemetría · 100% Self-Hosted</span>
            </div>
          </div>

          {/* Bloque 2: Stack moderno y auditable */}
          <div className="arch-card">
            <div className="arch-icon-box">
              <Code2 size={22} />
            </div>
            <h3>Stack moderno y auditable</h3>
            <p>
              Backend rápido y tipado con FastAPI (Python), interfaz reactiva con Vite y cálculos financieros verificables en el repositorio público.
            </p>
            <div className="arch-tag">
              <span>FastAPI · React 19 · PostgreSQL</span>
            </div>
          </div>

          {/* Bloque 3: Despliegue con Docker */}
          <div className="arch-card">
            <div className="arch-icon-box">
              <Terminal size={22} />
            </div>
            <h3>Despliegue con Docker</h3>
            <p>
              Listo para levantar en cualquier entorno Linux o homelab mediante Docker Compose con un solo comando.
            </p>
            <div className="arch-tag code-tag">
              <code>docker compose up -d</code>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CTA Final */}
      <section className="cta-section">
        <h2>Tomá el control de tus inversiones hoy mismo.</h2>
        <p>
          Accedé a la plataforma web para gestionar tu cartera o cloná el repositorio para desplegar tu propia instancia en minutos.
        </p>
        <div className="cta-actions">
          <button
            className="btn-hero-primary"
            onClick={() => navigate('/login')}
          >
            <span>Entrar a la App</span>
            <ArrowRight size={16} />
          </button>
          <a
            href="https://github.com/Linepixer/Valuonic"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-hero-github"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>Explorar en GitHub</span>
          </a>
        </div>
      </section>

      {/* 6. Footer Coherente */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-left">
            <div className="footer-logo">
              <img src="/logo.svg?v=4" alt="Valuonic Logo" style={{ height: '24px' }} />
            </div>
            <p>Valuonic &copy; 2026 &mdash; Proyecto de c&oacute;digo abierto bajo Licencia MIT para seguimiento de inversiones personales.</p>
          </div>
          <div className="footer-links">
            <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Iniciar sesión</a>
            <a href="https://github.com/Linepixer/Valuonic" target="_blank" rel="noopener noreferrer">Repositorio GitHub</a>
            <a href="https://github.com/Linepixer/Valuonic/issues" target="_blank" rel="noopener noreferrer">Reportar un bug</a>
            <a href="mailto:diazmatias@linepixer.com">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
