import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import TopRightMenu from './components/TopRightMenu'
import NotificationBell from './components/NotificationBell'
import ToastContainer from './components/ToastContainer'
import OnboardingWizard from './components/OnboardingWizard'
import { analytics } from './lib/analytics'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Accounts = lazy(() => import('./pages/Accounts'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Verification = lazy(() => import('./pages/Verification'))
const Settings = lazy(() => import('./pages/Settings'))
const Login = lazy(() => import('./pages/Login'))
const SharedLedger = lazy(() => import('./pages/SharedLedger'))
const Transactions = lazy(() => import('./pages/Transactions'))
import {
  LayoutDashboard, Users, Receipt, ShieldCheck,
  Calendar, LogOut, Settings as SettingsIcon
} from 'lucide-react'

function ProtectedRoute({ children }) {
  const { user, isMfaRequired, loading } = useAuth()
  
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="auth-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
      </div>
    )
  }
  
  if (!user || isMfaRequired) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function LoginRoute() {
  const { user, isMfaRequired, loading } = useAuth()
  
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="auth-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
      </div>
    )
  }
  
  if (user && !isMfaRequired) {
    return <Navigate to="/" replace />
  }
  
  return <Login />
}

function TopBar() {
  const { currentMonth, setCurrentMonth, monthOptions } = useApp()

  return (
    <header className="mobile-header">
      <div className="sidebar-logo">
        <img src="/logo.svg" alt="Accountify Logo" className="sidebar-logo-icon" />
        <div className="sidebar-logo-text">
          <h1>Accountify</h1>
          <p>Personal Finance</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="mobile-month-select">
          <Calendar size={14} color="var(--text-secondary)" />
          <select
            id="mobile-month-select"
            aria-label="Select month"
            value={currentMonth}
            onChange={e => setCurrentMonth(e.target.value)}
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <NotificationBell />
        <TopRightMenu />
      </div>
    </header>
  )
}

function BottomNav() {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/accounts', icon: Users, label: 'Accounts' },
    { path: '/expenses', icon: Receipt, label: 'Expenses' },
    { path: '/verification', icon: ShieldCheck, label: 'Verify' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function Sidebar() {
  const { currentMonth, setCurrentMonth, monthOptions } = useApp()

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/accounts', icon: Users, label: 'Accounts' },
    { path: '/expenses', icon: Receipt, label: 'Expenses' },
    { path: '/verification', icon: ShieldCheck, label: 'Verification' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/logo.svg" alt="Accountify Logo" className="sidebar-logo-icon" />
          <div className="sidebar-logo-text">
            <h1>Accountify</h1>
            <p>Personal Finance</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-month">
        <label htmlFor="sidebar-active-month">Active Month</label>
        <select
          id="sidebar-active-month"
          className="month-selector"
          value={currentMonth}
          onChange={e => setCurrentMonth(e.target.value)}
        >
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </aside>
  )
}

function AppLayout() {
  return (
    <div className="app-layout">
      <ToastContainer />
      {/* Mobile-only header */}
      <TopBar />

      {/* Desktop-only sidebar */}
      <Sidebar />

      {/* Desktop-only top right menu */}
      <div className="desktop-top-right-menu">
        <NotificationBell />
        <TopRightMenu />
      </div>

      {/* Main content page area */}
      <main className="main-content">
        <Suspense fallback={
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <div className="auth-spinner" style={{ width: '30px', height: '30px', borderWidth: '3px' }}></div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/security" element={<Navigate to="/settings" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Mobile-only bottom nav */}
      <BottomNav />
      <OnboardingWizard />
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    analytics.pageViewed(pathname, document.title)
  }, [pathname])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <NotificationProvider>
          <AppProvider>
            <Suspense fallback={
              <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="auth-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
              </div>
            }>
              <Routes>
                <Route path="/login" element={<LoginRoute />} />
                <Route path="/shared/:token" element={<SharedLedger />} />
                <Route 
                  path="/*" 
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </Suspense>
          </AppProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
