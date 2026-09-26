import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import es from '../locales/es.json';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import './Auth.css';

export default function Auth({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(() => {
    return location.pathname !== '/signup';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [name, setName] = useState('');
  const [bYear, setBYear] = useState('');
  const [bMonth, setBMonth] = useState('');
  const [bDay, setBDay] = useState('');
  const [country, setCountry] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const t = es.auth;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  useEffect(() => {
    if (location.pathname !== '/login' && location.pathname !== '/signup') {
      const search = location.search;
      navigate('/login' + search, { replace: true });
      setIsLogin(true);
    } else {
      setIsLogin(location.pathname !== '/signup');
      setError('');
    }
  }, [location.pathname, location.search, navigate]);

  const toggleMode = (loginMode) => {
    setIsLogin(loginMode);
    setError('');
    const newPath = loginMode ? '/login' : '/signup';
    if (location.pathname !== newPath) {
      navigate(newPath);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);

    if (!isLogin && password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await api.post('/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        onLogin();
      } else {
        const birthDate = (bYear && bMonth && bDay)
          ? new Date(`${bYear}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}T00:00:00Z`).toISOString()
          : null;

        const payload = {
          email,
          password,
          name: name || null,
          birth_date: birthDate,
          country: country || null
        };
        await api.post('/users/', payload);
        setIsLogin(true);
        setError(t.registerSuccess);
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail === 'not_verified') {
        setError(t.notVerified);
        setNeedsVerification(true);
      } else {
        setError(err.response?.data?.detail || t.defaultError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await api.post('/resend-verification', { email });
      setError(t.emailSent);
      setNeedsVerification(false);
    } catch (err) {
      setError(t.defaultError);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Top Header Grid Line */}
      <header className="auth-header">
        <div className="auth-logo" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="LedgerView Logo" style={{ height: '24px' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#fff' }}>LedgerView</span>
        </div>
      </header>

      {/* Middle Content */}
      <main className="auth-main">
        {/* Glow effect strictly inside main content */}
        <div className="auth-ambient-glow"></div>

        {/* Left Panel */}
        <div className="auth-left">
          <div className="auth-visual-content">
            <h1 className="auth-visual-title">Invertí con <span>claridad</span></h1>
            <p className="auth-visual-desc">Controla tus inversiones con una aplicación para el mercado argentino.</p>

            <ul className="auth-features-list">
              <li>
                <div className="feature-icon"></div>
                <div className="feature-text">
                  <h3>Plataforma 100% bimonetaria</h3>
                  <p>Controla tus inversiones en pesos y dolares sin que la inflacion argentina te distorcione tus ganancias.</p>
                </div>
              </li>
              <li>
                <div className="feature-icon"></div>
                <div className="feature-text">
                  <h3>Cotizacion en tiempo real y valuacion total de tu portafolio</h3>
                  <p>Combina CEDEARs, Criptos, Dolares y mira el valor total de tus activos de forma centralizada y a la cotizacion del momento.</p>
                </div>
              </li>
              <li>
                <div className="feature-icon"></div>
                <div className="feature-text">
                  <h3>Evolucion historica de tu patrimonio</h3>
                  <p>Medi la evolucion de tu patrimonio con el paso del tiempo y consulta la cotizacion de tus activos en el pasado.</p>
                </div>
              </li>
              <li>
                <div className="feature-icon"></div>
                <div className="feature-text">
                  <h3>Compara el rendimiento anualizado de tus inversiones frente a la inflacion</h3>
                  <p>Revisa si le ganaste a la inflacion del dolar con el calculo preciso de tu rendimiento anualizado.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-right">
          <div className="auth-form-container">
            <h2 className="auth-title">{isLogin ? "Ingresá a tu cuenta" : "Creá tu cuenta"}</h2>
            <p className="auth-subtitle">{isLogin ? "Ingresá tus credenciales para continuar." : "Ingresá tus datos para comenzar."}</p>

            <button className="btn-google" type="button" disabled>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
              Continuar con Google
            </button>

            <div className="auth-divider">o continuá con email</div>

            {error && <div className={`badge ${error.includes('exitoso') || error.includes('enviado') ? 'badge-profit' : 'badge-loss'}`} style={{ marginBottom: '1.5rem', display: 'block', padding: '0.75rem', textAlign: 'center' }}>{error}</div>}

            {needsVerification && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="btn-auth-submit"
                style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', marginBottom: '1.5rem' }}
              >
                {isResending ? <Loader2 className="animate-spin" size={20} /> : t.resendEmail}
              </button>
            )}

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="auth-input-group">
                    <label className="auth-label">NOMBRE COMPLETO</label>
                    <input
                      type="text"
                      required
                      placeholder="¿Cómo te llamas?"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-input-group">
                    <label className="auth-label">FECHA DE NACIMIENTO</label>
                    <div className="auth-date-group">
                      <select value={bDay} onChange={(e) => setBDay(e.target.value)} required className="auth-input">
                        <option value="" disabled hidden>Día</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={bMonth} onChange={(e) => setBMonth(e.target.value)} required className="auth-input">
                        <option value="" disabled hidden>Mes</option>
                        {t.months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                      <select value={bYear} onChange={(e) => setBYear(e.target.value)} required className="auth-input">
                        <option value="" disabled hidden>Año</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="auth-input-group">
                    <label className="auth-label">PAÍS</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="auth-input"
                      required
                    >
                      <option value="" disabled hidden>¿De dónde eres?</option>
                      {Object.entries(t.countries).map(([code, countryName]) => (
                        <option key={code} value={countryName}>{countryName}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="auth-input-group">
                <label className="auth-label">EMAIL</label>
                <input
                  type="email"
                  required
                  placeholder={isLogin ? "Escribe tu email" : "¿Cuál es tu email?"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                />
              </div>

              <div className="auth-input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="auth-label" style={{ marginBottom: 0 }}>CONTRASEÑA</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="auth-forgot-link"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={isLogin ? "Escribe tu contraseña" : "Escribe una contraseña"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-password-toggle"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="auth-remember-me">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="checkmark">
                      {rememberMe && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </span>
                    Recordar por 30 días
                  </label>
                </div>
              )}

              {!isLogin && (
                <>
                  <div className="auth-input-group">
                    <label className="auth-label">CONFIRMAR CONTRASEÑA</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Vuelve a escribir tu contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="auth-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="auth-password-toggle"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="auth-remember-me" style={{ marginTop: '0.5rem' }}>
                    <label className="checkbox-container">
                      <input type="checkbox" required />
                      <span className="checkmark">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </span>
                      <span>Acepto los <span style={{ color: '#10B981', cursor: 'pointer' }}>Términos de servicio</span> y la <span style={{ color: '#10B981', cursor: 'pointer' }}>Política de privacidad</span></span>
                    </label>
                  </div>
                </>
              )}

              <button type="submit" disabled={isLoading} className="btn-auth-submit">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? "Ingresar" : "Crear cuenta")}
              </button>
            </form>

            <p className="auth-switch">
              {isLogin ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
              <span onClick={() => toggleMode(!isLogin)}>
                {isLogin ? "Registrate" : "Ingresá"}
              </span>
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Footer Grid Line */}
      <footer className="auth-footer">
        <div className="auth-footer-left-text">
          LedgerView &copy; 2026 &mdash; Proyecto de código abierto para seguimiento de inversiones personales.
        </div>
        <div className="auth-footer-right-text">
          Contacto: diazmatias@linepixer.com
        </div>
      </footer>
    </div>
  );
}
