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
    <div className="auth-split-container">
      
      {/* Visual Panel (Left) */}
      <div className="auth-visual-panel">
        <nav className="auth-nav-desktop" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="LedgerView Logo" style={{ height: '24px' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.05em', color: '#fff' }}>LedgerView</span>
        </nav>

        <div className="auth-glow-orb orb-1"></div>
        <div className="auth-glow-orb orb-2"></div>

        <div className="auth-visual-content animate-landing" style={{ animationDelay: '0.2s' }}>
          <h1 className="auth-visual-title">Invierte con <span>claridad</span>.</h1>
          <p className="auth-visual-desc">Todas tus inversiones en un solo lugar. Métricas avanzadas, seguimiento en tiempo real y el control absoluto de tu portafolio.</p>
        </div>
      </div>

      {/* Form Panel (Right) */}
      <div className="auth-form-panel">
        <nav className="auth-nav-mobile" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="LedgerView Logo" style={{ height: '32px' }} />
        </nav>

        <div className="auth-form-container animate-landing">
          <h2 className="auth-title">{isLogin ? t.loginTitle : t.registerTitle}</h2>
          <p className="auth-subtitle">{isLogin ? "Ingresá tus credenciales para continuar." : "Comenzá a medir tu rendimiento real hoy."}</p>
          
          <button className="btn-google" type="button" disabled>
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
            {isLogin ? "Continuar con Google" : "Registrarse con Google"}
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
                  <label className="auth-label">{t.nameLabel}</label>
                  <input 
                    type="text" 
                    required
                    placeholder={t.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="auth-input"
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="auth-input-group" style={{ flex: 1.5 }}>
                    <label className="auth-label">{t.birthDateLabel}</label>
                    <div className="auth-date-group">
                      <select value={bDay} onChange={(e) => setBDay(e.target.value)} required>
                        <option value="" disabled hidden>{t.day}</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={bMonth} onChange={(e) => setBMonth(e.target.value)} required>
                        <option value="" disabled hidden>{t.month}</option>
                        {t.months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                      <select value={bYear} onChange={(e) => setBYear(e.target.value)} required>
                        <option value="" disabled hidden>{t.year}</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="auth-input-group">
                  <label className="auth-label">{t.countryLabel}</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="auth-input"
                    required
                  >
                    <option value="" disabled hidden>{t.countryPlaceholder}</option>
                    {Object.entries(t.countries).map(([code, countryName]) => (
                      <option key={code} value={countryName}>{countryName}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            <div className="auth-input-group">
              <label className="auth-label">{t.emailLabel}</label>
              <input 
                type="email" 
                required
                placeholder={isLogin ? t.loginEmailPlaceholder : t.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-label">{t.passwordLabel}</label>
              {isLogin && (
                <button 
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="auth-forgot-link"
                >
                  {t.forgotPassword}
                </button>
              )}
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={isLogin ? t.loginPasswordPlaceholder : t.passwordPlaceholder}
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

            {!isLogin && (
              <div className="auth-input-group">
                <label className="auth-label">{t.confirmPasswordLabel}</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder={t.confirmPasswordPlaceholder}
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
            )}
            
            <button type="submit" disabled={isLoading} className="btn-auth-submit">
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? t.loginButton : t.registerButton)}
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? `${t.noAccount} ` : `${t.hasAccount} `}
            <span onClick={() => toggleMode(!isLogin)}>
              {isLogin ? t.switchToRegister : t.switchToLogin}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
