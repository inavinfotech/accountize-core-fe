import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, useParams } from 'react-router-dom'
import {
  LayoutDashboard, Users, Receipt, ShieldCheck,
  Calendar, LogOut, Settings as SettingsIcon, Ban, TrendingUp,
  Grid3x3, X, ChevronRight, ArrowLeftRight
} from 'lucide-react'
import { DataStoreProvider, useApp } from './lib/useDataStore.jsx'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext'
import { SystemConfigProvider, useSystemConfig } from './context/SystemConfigContext'
import ServiceBlockScreen from './components/ServiceBlockScreen'
import TopRightMenu from './components/TopRightMenu'
import NotificationBell from './components/NotificationBell'
import ToastContainer from './components/ToastContainer'
import OnboardingWizard from './components/OnboardingWizard'
import NetworkStatusBanner from './components/NetworkStatusBanner'
import YearlyReportModal from './components/YearlyReportModal'
import { analytics } from './lib/analytics'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Accounts = lazy(() => import('./pages/Accounts'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Verification = lazy(() => import('./pages/Verification'))
const YearlyReport = lazy(() => import('./pages/YearlyReport'))
const Settings = lazy(() => import('./pages/Settings'))
const Login = lazy(() => import('./pages/Login'))
const SharedLedger = lazy(() => import('./pages/SharedLedger'))
const Transactions = lazy(() => import('./pages/Transactions'))

function ProtectedRoute({ children }) {
  const { user, isMfaRequired, loading, signOut } = useAuth()
  const { isSuspended } = useSubscription()
  const { isUserPanelEnabled, userPanelBlockMessage, isUserBypassed } = useSystemConfig()
  
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

  if (!isUserPanelEnabled && !isUserBypassed(user)) {
    return (
      <ServiceBlockScreen
        title="User Panel Under Maintenance"
        message={userPanelBlockMessage || 'The User Panel is currently under system maintenance. Please check back shortly.'}
        allowSignOut={true}
      />
    )
  }

  if (isSuspended) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Ban size={32} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>Account Suspended</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 420, lineHeight: 1.5, margin: '0 0 24px' }}>
          Your Accountize ledger access has been temporarily suspended by an administrator. Please contact support to resolve this issue.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="mailto:support@accountize.in" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Contact Support
          </a>
          <button className="btn btn-secondary" onClick={() => signOut()}>
            Sign Out
          </button>
        </div>
      </div>
    )
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
        <img src="/logo.svg" alt="Accountize Logo" className="sidebar-logo-icon" />
        <div className="sidebar-logo-text">
          <h1>Accountize</h1>
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
  const location = useLocation()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/accounts', icon: Users, label: 'Accounts' },
    { path: '/expenses', icon: Receipt, label: 'Expenses' },
    { path: '/verification', icon: ShieldCheck, label: 'Audit' },
    { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { path: '/yearly', icon: TrendingUp, label: 'Yearly' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  // Close slider on route changes
  useEffect(() => {
    setIsMoreOpen(false)
  }, [location.pathname])

  const maxVisible = 5
  const hasMore = navItems.length > maxVisible

  // If more than 5 options: show first 4 directly + 1 "More" button = exactly 5 visible items
  const primaryItems = hasMore ? navItems.slice(0, maxVisible - 1) : navItems
  const overflowItems = hasMore ? navItems.slice(maxVisible - 1) : []

  // Check if any overflow option is currently active
  const isOverflowActive = overflowItems.some(item =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )

  return (
    <>
      <nav className="mobile-bottom-nav">
        {primaryItems.map(item => (
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

        {hasMore && (
          <button
            type="button"
            className={`bottom-nav-item bottom-nav-more-btn ${isOverflowActive || isMoreOpen ? 'active' : ''}`}
            onClick={() => setIsMoreOpen(prev => !prev)}
            aria-label="More navigation options"
            aria-expanded={isMoreOpen}
          >
            <Grid3x3 size={20} />
            <span>More</span>
          </button>
        )}
      </nav>

      {/* Slider Drawer for Overflow Options */}
      {hasMore && (
        <div
          className={`bottom-nav-sheet-backdrop ${isMoreOpen ? 'open' : ''}`}
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className={`bottom-nav-sheet ${isMoreOpen ? 'open' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="bottom-nav-sheet-handle-bar">
              <div className="bottom-nav-sheet-handle" />
            </div>

            <div className="bottom-nav-sheet-header">
              <span className="bottom-nav-sheet-title">More Options</span>
              <button
                type="button"
                className="bottom-nav-sheet-close"
                onClick={() => setIsMoreOpen(false)}
                aria-label="Close options"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bottom-nav-sheet-grid">
              {overflowItems.map(item => {
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`bottom-sheet-nav-card ${isActive ? 'active' : ''}`}
                    onClick={() => setIsMoreOpen(false)}
                  >
                    <div className="bottom-sheet-nav-icon">
                      <item.icon size={20} />
                    </div>
                    <div className="bottom-sheet-nav-info">
                      <span className="bottom-sheet-nav-label">{item.label}</span>
                    </div>
                    <ChevronRight size={16} className="bottom-sheet-nav-arrow" />
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Sidebar() {
  const { currentMonth, setCurrentMonth, monthOptions } = useApp()

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/accounts', icon: Users, label: 'Accounts' },
    { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { path: '/expenses', icon: Receipt, label: 'Expenses' },
    { path: '/verification', icon: ShieldCheck, label: 'Audit & Check' },
    { path: '/yearly', icon: TrendingUp, label: 'Yearly Report' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/logo.svg" alt="Accountize Logo" className="sidebar-logo-icon" />
          <div className="sidebar-logo-text">
            <h1>Accountize</h1>
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
  const [showYearlyReport, setShowYearlyReport] = useState(false)

  useEffect(() => {
    const handleOpen = () => setShowYearlyReport(true)
    window.addEventListener('accountize:open-yearly-report', handleOpen)
    return () => window.removeEventListener('accountize:open-yearly-report', handleOpen)
  }, [])

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
            <Route path="/yearly" element={<YearlyReport />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/security" element={<Navigate to="/settings" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Mobile-only bottom nav */}
      <BottomNav />
      <OnboardingWizard />
      <NetworkStatusBanner />
      <YearlyReportModal
        isOpen={showYearlyReport}
        onClose={() => setShowYearlyReport(false)}
      />
    </div>
  )
}

const ROUTE_TITLES = {
  '/': 'Accountize — Personal Finance Dashboard',
  '/accounts': 'Accountize — Accounts & Receivables',
  '/expenses': 'Accountize — Daily Expenses',
  '/transactions': 'Accountize — Transaction Ledger',
  '/verification': 'Accountize — Health & Fault Verification',
  '/yearly': 'Accountize — Financial Year Report',
  '/settings': 'Accountize — Preferences & Security',
  '/login': 'Accountize — Authentication'
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    const title = ROUTE_TITLES[pathname] || (pathname.startsWith('/shared/') ? 'Accountize — Shared Ledger' : 'Accountize — Personal Finance Tracker')
    document.title = title
    analytics.pageViewed(pathname, title)
  }, [pathname])

  // Active tab 2-minute heartbeat telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        analytics.heartbeat()
      }
    }, 2 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return null
}

function ReferralRedirect() {
  const { code } = useParams()
  useEffect(() => {
    if (code) {
      localStorage.setItem('accountize_ref_code', code)
    }
  }, [code])
  return <Navigate to={`/login?ref=${code || ''}&signup=true`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SystemConfigProvider>
        <AuthProvider>
          <NotificationProvider>
          <SubscriptionProvider>
            <DataStoreProvider>
              <Suspense fallback={
                <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                  <div className="auth-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
                </div>
              }>
                <Routes>
                  <Route path="/login" element={<LoginRoute />} />
                  <Route path="/ref/:code" element={<ReferralRedirect />} />
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
            </DataStoreProvider>
          </SubscriptionProvider>
          </NotificationProvider>
        </AuthProvider>
      </SystemConfigProvider>
    </BrowserRouter>
  )
}
