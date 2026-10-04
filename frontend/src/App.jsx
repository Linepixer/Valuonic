import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Dashboard from './components/Dashboard'
import Auth from './components/Auth'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import AccountMenu from './components/AccountMenu'
import AdminDashboard from './components/AdminDashboard'
import DeleteAccountConfirm from './components/DeleteAccountConfirm'
import AccountSettings from './components/AccountSettings'
import UserDeleteAccountConfirm from './components/UserDeleteAccountConfirm'
import LandingPage from './components/LandingPage'
import Terms from './components/Terms'
import Privacy from './components/Privacy'
import api from './api'
import './index.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [currency, setCurrency] = useState('USD')
  const [user, setUser] = useState(null)
  const [verificationMessage, setVerificationMessage] = useState('')
  
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname

  useEffect(() => {
    // Grab the email verification token from the URL if it's there
    const params = new URLSearchParams(location.search)
    const tokenParams = params.get('token')
    
    // Only try to verify if they landed on the root or were redirected to login
    if (tokenParams && (currentPath === '/' || currentPath === '/login')) {
      verifyEmail(tokenParams)
      navigate(currentPath, { replace: true })
    } else {
      // Otherwise, just check if we have a valid session cookie
      checkSession()
    }
  }, []) // Empty dependency array is intentional for initial load

  const checkSession = async () => {
    try {
      const res = await api.get('/users/me')
      setUser(res.data)
      setIsAuthenticated(true)
      if (currentPath === '/login' || currentPath === '/signup') {
        navigate('/portfolio', { replace: true })
      }
    } catch (err) {
      setIsAuthenticated(false)
    } finally {
      setIsInitializing(false)
    }
  }

  const fetchUser = async () => {
    try {
      const res = await api.get('/users/me')
      setUser(res.data)
    } catch (err) {
      console.error("Error fetching user profile", err)
    }
  }

  const verifyEmail = async (verificationToken) => {
    try {
      await api.post(`/verify?token=${verificationToken}`)
      setVerificationMessage('¡Cuenta verificada exitosamente!')
      // verify endpoint sets the cookie for us, so we can checkSession
      checkSession()
    } catch (err) {
      setVerificationMessage('El link de verificación es inválido o expiró.')
      setIsInitializing(false)
    }
  }

  const clearSession = () => {
    setIsAuthenticated(false)
    setUser(null)
  }

  const handleLogout = async () => {
    try {
      await api.post('/logout')
    } catch (err) {
      console.error('Error logging out', err)
    }
    clearSession()
    navigate('/login', { replace: true })
  }

  const onLoginSuccess = () => {
    checkSession()
  }

  const isLandingPage = currentPath === '/'
  const isAuthPage = currentPath === '/login' || currentPath === '/signup'
  const isFullscreenPage = isLandingPage || isAuthPage

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#050505', color: '#10B981' }}>
        <Loader2 className="animate-spin" size={48} />
      </div>
    )
  }

  return (
    <div className={isFullscreenPage ? "" : "app-container"}>
      {!isFullscreenPage && (
        <header>
          <div 
            className="logo-text" 
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          >
            <img src="/logo.svg?v=4" alt="Valuonic Logo" style={{ height: '45px' }} />
          </div>
          <div className="flex-row">
            {isAuthenticated && !currentPath.startsWith('/admin') && (
              <div className="currency-toggle header-currency-toggle">
                <button className={`toggle-btn ${currency === 'ARS' ? 'active' : ''}`} onClick={() => setCurrency('ARS')}>ARS</button>
                <button className={`toggle-btn ${currency === 'USD' ? 'active' : ''}`} onClick={() => setCurrency('USD')}>USD</button>
              </div>
            )}
            {isAuthenticated && (
              <AccountMenu user={user} onLogout={handleLogout} />
            )}
          </div>
        </header>
      )}

      <main style={isFullscreenPage ? { flex: 1, display: 'flex', flexDirection: 'column', padding: 0, margin: 0, maxWidth: '100%' } : {}}>
        {verificationMessage && (
          <div style={{ maxWidth: '500px', margin: '0 auto 20px auto' }}>
             <div className={`badge ${verificationMessage.includes('exitosamente') ? 'badge-profit' : 'badge-loss'}`} style={{ display: 'block', padding: '1rem', textAlign: 'center', fontSize: '1rem' }}>
               {verificationMessage}
             </div>
          </div>
        )}
        
        <Routes>
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/reset-password" element={<ResetPassword onLogin={onLoginSuccess} />} />
          <Route path="/account/delete-confirm" element={<UserDeleteAccountConfirm onAccountDeleted={clearSession} />} />
          
          {isAuthenticated ? (
            <>
              <Route path="/login" element={<Navigate to="/portfolio" replace />} />
              <Route path="/signup" element={<Navigate to="/portfolio" replace />} />
              
              <Route path="/admin" element={<AdminDashboard user={user} />} />
              <Route path="/admin/delete-account" element={<DeleteAccountConfirm user={user} />} />
              
              <Route path="/" element={<LandingPage isAuthenticated={isAuthenticated} user={user} onLogout={handleLogout} />} />
              <Route path="/portfolio" element={<Dashboard currency={currency} />} />
              <Route path="/portfolio/possession/:ticker" element={<Dashboard currency={currency} />} />
              
              <Route path="/market" element={<Dashboard currency={currency} />} />
              <Route path="/asset/:ticker" element={<Dashboard currency={currency} />} />
              
              <Route path="/transactions" element={<Dashboard currency={currency} />} />
              <Route path="/transactions/import" element={<Dashboard currency={currency} />} />
              
              <Route path="/account" element={<AccountSettings user={user} onLogout={handleLogout} />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<LandingPage isAuthenticated={isAuthenticated} />} />
              <Route path="/login" element={<Auth onLogin={onLoginSuccess} />} />
              <Route path="/signup" element={<Auth onLogin={onLoginSuccess} />} />
              <Route path="/forgot-password" element={<ForgotPassword onSwitchToLogin={() => navigate('/login')} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </main>

      {isAuthenticated && !isFullscreenPage && (
        <footer className="app-footer">
          <div style={{ maxWidth: '400px', lineHeight: '1.4' }}>Valuonic &copy; 2026 &mdash; Proyecto de código abierto para seguimiento de inversiones personales.</div>
          <div>
            <Link to="/terms" target="_blank" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}>Términos de Servicio</Link>
            <Link to="/privacy" target="_blank" style={{ color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}>Política de Privacidad</Link>
            Contacto: <a href="mailto:diazmatias@linepixer.com" style={{ color: 'inherit', textDecoration: 'none' }}>diazmatias@linepixer.com</a>
          </div>
        </footer>
      )}
    </div>
  )
}

export default App
