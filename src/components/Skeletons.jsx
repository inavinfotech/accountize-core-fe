import React from 'react'

/**
 * DashboardSkeleton
 * Matches the layout of Dashboard.jsx (Page header, 5 stat cards, charts & activities grid)
 */
export function DashboardSkeleton() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Skeleton */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton skeleton-title" style={{ width: 180 }} />
          <div className="skeleton skeleton-text" style={{ width: 240 }} />
        </div>
        <div className="skeleton skeleton-pill" style={{ width: 120, height: 36 }} />
      </div>

      {/* 5 Stats Cards Grid */}
      <div className="stats-grid">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="skeleton skeleton-text" style={{ width: 90 }} />
              <div className="skeleton skeleton-circle" style={{ width: 36, height: 36 }} />
            </div>
            <div className="skeleton skeleton-title" style={{ width: 130, height: 28, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: 100, height: 14 }} />
          </div>
        ))}
      </div>

      {/* Main Grid Section (Charts & Recent Activity) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Net Balance Chart Skeleton */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="skeleton skeleton-title" style={{ width: 140 }} />
            <div className="skeleton skeleton-pill" style={{ width: 80, height: 24 }} />
          </div>
          <div className="skeleton" style={{ width: '100%', height: 220, borderRadius: 12 }} />
        </div>

        {/* Recent Transactions List Skeleton */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="skeleton skeleton-title" style={{ width: 160 }} />
            <div className="skeleton skeleton-text" style={{ width: 60 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="skeleton skeleton-circle" style={{ width: 38, height: 38 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="skeleton skeleton-text" style={{ width: 120 }} />
                    <div className="skeleton skeleton-text" style={{ width: 80, height: 10 }} />
                  </div>
                </div>
                <div className="skeleton skeleton-pill" style={{ width: 70, height: 20 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * AccountsSkeleton
 * Matches Accounts.jsx (Page header, filter tabs, summary balance banner, accounts grid)
 */
export function AccountsSkeleton() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton skeleton-title" style={{ width: 160 }} />
          <div className="skeleton skeleton-text" style={{ width: 220 }} />
        </div>
        <div className="skeleton skeleton-pill" style={{ width: 130, height: 40 }} />
      </div>

      {/* Tabs Filter Bar */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton skeleton-pill" style={{ width: 100, height: 36, flexShrink: 0 }} />
        ))}
      </div>

      {/* Summary Card */}
      <div className="card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton skeleton-text" style={{ width: 110 }} />
          <div className="skeleton skeleton-title" style={{ width: 160, height: 32 }} />
        </div>
        <div className="skeleton skeleton-circle" style={{ width: 44, height: 44 }} />
      </div>

      {/* Account Cards List / Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="skeleton skeleton-circle" style={{ width: 40, height: 40 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="skeleton skeleton-text" style={{ width: 110 }} />
                  <div className="skeleton skeleton-pill" style={{ width: 60, height: 16 }} />
                </div>
              </div>
              <div className="skeleton skeleton-circle" style={{ width: 24, height: 24 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
              <div className="skeleton skeleton-text" style={{ width: 70 }} />
              <div className="skeleton skeleton-title" style={{ width: 100, height: 24 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * ExpensesSkeleton
 * Matches Expenses.jsx (Header, summary stats banner, categories filter, daily grouped expenses)
 */
export function ExpensesSkeleton() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton skeleton-title" style={{ width: 170 }} />
          <div className="skeleton skeleton-text" style={{ width: 230 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skeleton skeleton-pill" style={{ width: 130, height: 38 }} />
        </div>
      </div>

      {/* Summary Stat Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton skeleton-text" style={{ width: 100 }} />
            <div className="skeleton skeleton-title" style={{ width: 120, height: 26 }} />
          </div>
        ))}
      </div>

      {/* Category Pills Filter */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton skeleton-pill" style={{ width: 90, height: 32, flexShrink: 0 }} />
        ))}
      </div>

      {/* Grouped Daily Expenses Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2].map(group => (
          <div key={group} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
              <div className="skeleton skeleton-text" style={{ width: 130 }} />
              <div className="skeleton skeleton-pill" style={{ width: 80, height: 18 }} />
            </div>
            {[1, 2, 3].map(item => (
              <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="skeleton skeleton-circle" style={{ width: 34, height: 34 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="skeleton skeleton-text" style={{ width: 140 }} />
                    <div className="skeleton skeleton-text" style={{ width: 90, height: 10 }} />
                  </div>
                </div>
                <div className="skeleton skeleton-pill" style={{ width: 75, height: 22 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * TransactionsSkeleton
 * Matches Transactions.jsx (Header, filters toolbar, data table skeleton)
 */
export function TransactionsSkeleton() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton skeleton-title" style={{ width: 190 }} />
          <div className="skeleton skeleton-text" style={{ width: 250 }} />
        </div>
        <div className="skeleton skeleton-pill" style={{ width: 120, height: 38 }} />
      </div>

      {/* Filter Controls Bar */}
      <div className="card" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div className="skeleton" style={{ flex: 1, minWidth: 200, height: 38, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 130, height: 38, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 130, height: 38, borderRadius: 8 }} />
        <div className="skeleton skeleton-pill" style={{ width: 90, height: 38 }} />
      </div>

      {/* Table Skeleton */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
          <div className="skeleton skeleton-text" style={{ width: 80 }} />
          <div className="skeleton skeleton-text" style={{ width: 120 }} />
          <div className="skeleton skeleton-text" style={{ width: 140 }} />
          <div className="skeleton skeleton-text" style={{ width: 80 }} />
          <div className="skeleton skeleton-text" style={{ width: 90 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
              <div className="skeleton skeleton-text" style={{ width: 90 }} />
              <div className="skeleton skeleton-text" style={{ width: 110 }} />
              <div className="skeleton skeleton-text" style={{ width: 150 }} />
              <div className="skeleton skeleton-pill" style={{ width: 70, height: 20 }} />
              <div className="skeleton skeleton-pill" style={{ width: 80, height: 22 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * VerificationSkeleton
 * Matches Verification.jsx (Header, summary metrics cards, audit form, settle section)
 */
export function VerificationSkeleton() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton skeleton-title" style={{ width: 180 }} />
          <div className="skeleton skeleton-text" style={{ width: 260 }} />
        </div>
        <div className="skeleton skeleton-pill" style={{ width: 140, height: 38 }} />
      </div>

      {/* Metrics Cards */}
      <div className="stats-grid">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="stat-card">
            <div className="skeleton skeleton-text" style={{ width: 90, marginBottom: 8 }} />
            <div className="skeleton skeleton-title" style={{ width: 120, height: 26 }} />
          </div>
        ))}
      </div>

      {/* Form Verification Card */}
      <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton skeleton-title" style={{ width: 160 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton skeleton-text" style={{ width: 100 }} />
            <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 8 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton skeleton-text" style={{ width: 100 }} />
            <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 8 }} />
          </div>
        </div>
        <div className="skeleton skeleton-pill" style={{ width: 140, height: 42, alignSelf: 'flex-start' }} />
      </div>
    </div>
  )
}

/**
 * SettingsSkeleton
 * Matches Settings.jsx (Header, section tabs, profile & preferences cards)
 */
export function SettingsSkeleton() {
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div className="skeleton skeleton-title" style={{ width: 140 }} />
        <div className="skeleton skeleton-text" style={{ width: 220 }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton skeleton-pill" style={{ width: 90, height: 34 }} />
        ))}
      </div>

      {/* Settings Card */}
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="skeleton skeleton-circle" style={{ width: 64, height: 64 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton skeleton-title" style={{ width: 160 }} />
            <div className="skeleton skeleton-text" style={{ width: 200 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton skeleton-text" style={{ width: 100 }} />
            <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 8 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton skeleton-text" style={{ width: 100 }} />
            <div className="skeleton" style={{ width: '100%', height: 40, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    </div>
  )
}
