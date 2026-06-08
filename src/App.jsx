
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Expenses from './pages/Expenses'
import Verification from './pages/Verification'
import {
  LayoutDashboard, Users, Receipt, ShieldCheck,
  Wallet, Calendar
} from 'lucide-react'

function TopBar() {
  const { currentMonth, setCurrentMonth, monthOptions } = useApp()

  return (
    <header className="mobile-header">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Wallet size={18} color="white" />
        </div>
        <div className="sidebar-logo-text">
          <h1>Accountify</h1>
          <p>Personal Finance</p>
        </div>
      </div>
      <div className="mobile-month-select">
        <Calendar size={14} color="var(--text-secondary)" />
        <select
          value={currentMonth}
          onChange={e => setCurrentMonth(e.target.value)}
        >
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </header>
  )
}

function BottomNav() {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/accounts', icon: Users, label: 'Accounts' },
    { path: '/expenses', icon: Receipt, label: 'Expenses' },
    { path: '/verification', icon: ShieldCheck, label: 'Verification' },
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
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Wallet size={20} color="white" />
          </div>
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
        <label>Active Month</label>
        <select
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
      {/* Mobile-only header */}
      <TopBar />

      {/* Desktop-only sidebar */}
      <Sidebar />

      {/* Main content page area */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/verification" element={<Verification />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Mobile-only bottom nav */}
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </BrowserRouter>
  )
}
