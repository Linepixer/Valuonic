import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import './LandingPage.css';

export default function About() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    const prevTitle = document.title;
    document.title = 'Acerca de — Valuonic';
    return () => {
      document.title = prevTitle;
    };
  }, []);

  return (
    <div className="landing-container">
      {/* Barra de Navegación */}
      <nav className="landing-navbar" aria-label="Navegación principal">
        <div className="landing-navbar-inner">
          <div
            className="landing-brand"
            onClick={() => navigate('/')}
            title="Volver a la página principal"
          >
            <img src="/logo.svg?v=4" alt="Valuonic Logo" className="landing-logo-img" />
          </div>

          <div className="landing-nav-right">
            <Link to="/" className="landing-nav-link landing-nav-link-visible">
              <ArrowLeft size={15} style={{ marginRight: '0.35rem' }} />
              <span>Volver al inicio</span>
            </Link>
            <a
              href="https://github.com/Linepixer/Valuonic"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-nav-link"
            >
              GitHub
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

      {/* Contenido Principal */}
      <main className="about-page">
        <article className="about-container">
          {/* Encabezado */}
          <div className="about-intro">
            <h1 className="about-heading">Acerca de Valuonic</h1>
            <p className="about-subtitle">
              La historia detrás del proyecto, cómo calcula tu portafolio bimonetario y cómo está alojado en mi propio servidor en casa.
            </p>
          </div>

          {/* 1. El origen */}
          <section className="about-row" aria-labelledby="origen-title">
            <div className="about-row-label">
              <h2 id="origen-title">Origen de la idea</h2>
            </div>
            <div className="about-row-body">
              <p>
                Empecé este proyecto buscando resolver una necesidad propia. Durante mucho tiempo llevé el registro de mis inversiones en una planilla de Excel que, a medida que sumaba operaciones, se fue volviendo poco práctica de mantener: celdas que quedaban desactualizadas, referencias manuales y fórmulas que se rompían cuando quería incorporar un movimiento nuevo.
              </p>
              <p>
                Cuando salí a buscar una herramienta que lo resolviera mejor, me encontré con un problema muy puntual de Argentina: en el mercado local no existía ninguna solución que integrara todo el portafolio en una única plataforma con seguimiento histórico y en tiempo real, y que además fuera verdaderamente <strong>bimonetaria</strong>.
              </p>
              <p>
                Acá necesitamos medir nuestro capital tanto en pesos como en dólares. El objetivo principal fue lograr que con un simple clic puedas cambiar toda la vista de tu portafolio de pesos a dólares y viceversa, contemplando las cotizaciones reales de <strong>Dólar MEP (Bolsa)</strong>, <strong>Dólar Cripto</strong> y <strong>Dólar Blue</strong>.
              </p>
            </div>
          </section>

          {/* 2. Cómo funciona */}
          <section className="about-row" aria-labelledby="como-funciona-title">
            <div className="about-row-label">
              <h2 id="como-funciona-title">Cómo funciona Valuonic</h2>
            </div>
            <div className="about-row-body">
              <p>
                El funcionamiento toma la lógica de distintas plataformas de terceros dedicadas al seguimiento de portafolios a nivel internacional, pero adaptada desde la base a nuestra economía y a los activos que operamos localmente:
              </p>

              <div className="about-steps-grid">
                <div className="about-step-block">
                  <h3>Carga de operaciones</h3>
                  <p>
                    Simplemente cargás tus transacciones de compra y venta (o las importás desde un archivo). No hace falta vincular cuentas bancarias ni dar acceso a ningún bróker.
                  </p>
                </div>

                <div className="about-step-block">
                  <h3>Base de datos propia y tiempo real</h3>
                  <p>
                    El sistema cuenta con su propia base de datos de cotizaciones históricas y, al mismo tiempo, obtiene los precios actualizados en tiempo real de cada activo y tipo de cambio.
                  </p>
                </div>

                <div className="about-step-block">
                  <h3>Cálculo de patrimonio y métricas</h3>
                  <p>
                    Cruzando las transacciones cargadas con las cotizaciones, la aplicación calcula tu patrimonio exacto y muestra todas las métricas al instante: rendimiento anualizado (XIRR), distribución de activos, ritmo de inversión, intereses generados y proyecciones.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Detrás del proyecto */}
          <section className="about-row" aria-labelledby="autor-title">
            <div className="about-row-label">
              <h2 id="autor-title">Sobre mí</h2>
            </div>
            <div className="about-row-body">
              <p>
                Soy <strong>QA Engineer</strong> y me gusta investigar y construir herramientas propias. Aprovechando la asistencia y los recursos actuales de la Inteligencia Artificial, me propuse armar este desarrollo completo desde cero, cuidando la lógica de negocio, la base de datos y la interfaz.
              </p>
              <p>
                Lo que empezó como un desarrollo interno para ordenar y seguir mis propias finanzas de todos los días terminó tomando forma como una aplicación completa, lista para compartir con amigos, colegas y cualquier persona que busque llevar un control claro de sus inversiones sin depender de hojas de cálculo.
              </p>

              <div className="about-author-links">
                <a
                  href="https://www.linkedin.com/in/diazmatiasezequiel/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-profile-link"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                  <span>LinkedIn · Matías Ezequiel Díaz</span>
                </a>

                <a
                  href="https://github.com/Linepixer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-profile-link"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub · @Linepixer</span>
                </a>
              </div>
            </div>
          </section>

          {/* 4. Infraestructura Homelab y Open Source */}
          <section className="about-row" aria-labelledby="homelab-title">
            <div className="about-row-label">
              <h2 id="homelab-title">Infraestructura Homelab y Código Abierto</h2>
            </div>
            <div className="about-row-body">
              <p>
                A diferencia de otros sitios que alquilan servidores en la nube, todo este proyecto está hosteado físicamente en mi propia casa bajo una filosofía 100% <em>homelab</em>, corriendo sobre un servidor físico <strong>IBM System x3100 M4</strong> configurado íntegramente por mí desde cero con <strong>Debian GNU/Linux</strong> y administrado dentro de mi propia red.
              </p>
              <p>
                El equipo arrancó originalmente con apenas 4 GB de RAM y un procesador Intel Xeon E3-1220 V2, pero lo fui actualizando con repuestos comprados por AliExpress: le sumé 4 módulos de 8 GB para llevarlo a <strong>32 GB de RAM</strong> y cambié el micro por un <strong>Intel Xeon E3-1230 V2</strong>. Además, le agregué un disco <strong>SSD de 120 GB</strong> para el sistema operativo y armé un arreglo <strong>RAID 5 con 4 discos de 4 TB cada uno</strong> (~10,9 TB útiles) para almacenamiento general del laboratorio.
              </p>
              <p>
                Valuonic es un proyecto totalmente <strong>Open Source</strong> (bajo licencia MIT). Cualquiera puede entrar a usar la aplicación libremente o visitar el repositorio público en GitHub para ver cómo está hecho.
              </p>

              {/* Terminal real neofetch */}
              <div className="about-neofetch-terminal" aria-label="Salida de neofetch del servidor homelab">
                <div className="about-terminal-bar">
                  <div className="window-dots">
                    <span className="window-dot red"></span>
                    <span className="window-dot yellow"></span>
                    <span className="window-dot green"></span>
                  </div>
                  <span className="about-terminal-title">username@valuonicserver: ~</span>
                  <div style={{ width: '42px' }} />
                </div>
                <div className="about-terminal-body">
                  <div className="about-terminal-cmd">
                    <span className="nf-prompt-user">username@valuonicserver</span>
                    <span className="nf-prompt-sep">:</span>
                    <span className="nf-prompt-path">~</span>
                    <span className="nf-prompt-sep">$ </span>
                    <span className="nf-cmd-text">neofetch</span>
                  </div>
                  <div className="about-neofetch-grid">
                    <pre className="about-neofetch-ascii" aria-hidden="true">{`       _,met$$$$$gg.
    ,g$$$$$$$$$$$$$$$P.
  ,g$$P"     """Y$$.".
 ,$$P'              \`$$$.
',$$P       ,ggs.     \`$$b:
\`d$$'     ,$P"'   .    $$$
 $$P      d$'     ,    $$P
 $$:      $$.   -    ,d$$'
 $$;      Y$b._   _,d$P'
 Y$$.    \`.\`"Y$$$$P"'
 \`$$b      "-.__
  \`Y$$
   \`Y$$.
     \`$$b.
       \`Y$$b.
          \`"Y$b._
              \`"""`}</pre>
                    <div className="about-neofetch-info">
                      <div><span className="nf-key">username</span>@<span className="nf-key">valuonicserver</span></div>
                      <div className="nf-divider">-----------------------</div>
                      <div><span className="nf-key">OS</span>: Debian GNU/Linux x86_64</div>
                      <div><span className="nf-key">Host</span>: IBM System X3100 M4 -[2582AC1]- 0A</div>
                      <div><span className="nf-key">Kernel</span>: 6.x-amd64</div>
                      <div><span className="nf-key">Uptime</span>: 33 days, 2 hours, 9 mins</div>
                      <div><span className="nf-key">Packages</span>: 689 (dpkg)</div>
                      <div><span className="nf-key">Shell</span>: bash 5.2.37</div>
                      <div><span className="nf-key">Resolution</span>: 1024x768</div>
                      <div><span className="nf-key">Terminal</span>: /dev/pts/0</div>
                      <div><span className="nf-key">CPU</span>: Intel Xeon E3-1230 V2 (8) @ 3.700GHz</div>
                      <div><span className="nf-key">GPU</span>: 04:00.0 Matrox Electronics Systems Ltd. G200eR2</div>
                      <div><span className="nf-key">Memory</span>: 8079MiB / 32090MiB</div>
                      <div className="nf-palette" aria-hidden="true">
                        <div className="nf-palette-row">
                          <span style={{ background: '#1e1e1e' }} />
                          <span style={{ background: '#cc241d' }} />
                          <span style={{ background: '#10b981' }} />
                          <span style={{ background: '#d79921' }} />
                          <span style={{ background: '#2563eb' }} />
                          <span style={{ background: '#9333ea' }} />
                          <span style={{ background: '#3b82f6' }} />
                          <span style={{ background: '#d1d5db' }} />
                        </div>
                        <div className="nf-palette-row">
                          <span style={{ background: '#6b7280' }} />
                          <span style={{ background: '#ef4444' }} />
                          <span style={{ background: '#22c55e' }} />
                          <span style={{ background: '#fde047' }} />
                          <span style={{ background: '#60a5fa' }} />
                          <span style={{ background: '#c084fc' }} />
                          <span style={{ background: '#67e8f9' }} />
                          <span style={{ background: '#ffffff' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Acciones finales */}
          <div className="about-footer-actions">
            <button
              className="btn-hero-primary"
              onClick={() => navigate('/login')}
            >
              <span>Ir a la aplicación</span>
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

            <Link to="/" className="btn-hero-github">
              <ArrowLeft size={16} />
              <span>Volver a la página principal</span>
            </Link>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-left">
            <div className="footer-logo">
              <img src="/logo.svg?v=4" alt="Valuonic Logo" style={{ height: '24px' }} />
            </div>
            <p>Valuonic &copy; 2026 &mdash; Proyecto de c&oacute;digo abierto bajo Licencia MIT para seguimiento de inversiones personales.</p>
          </div>
          <div className="footer-links">
            <Link to="/">Página principal</Link>
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
