# Accountize — Personal Finance Tracker

A React app built to replicate and digitize the logic from your `Accounts.xlsx` Excel spreadsheet, using **Supabase** as the database (direct frontend interaction).

## Features

| Feature | Excel Equivalent |
|---|---|
| **People Accounts** (Receivable/Payable) | Rows 1-17 (Robin, Papa, etc.) & Rows 22-30 (Other's Money) |
| **Multi-transaction tracking** per account | Columns B, C, D, E per person |
| **Net balance auto-calculation** | Column F = `SUM(B:E)` |
| **Cash & Online tracking** | Rows 18-19 |
| **Daily Expense logging** | Rows 32-49 (expense section) |
| **Per Day Average & Month Estimate** | H50 & K51 formulas |
| **Estimate Finder** (custom budget target) | K45-K48 section |
| **Available Balance** | F31 = `F20 - SUM(F22:F30)` |
| **Fault Detection** (No Fault / Fault) | I31 = `IF(F31=H31, "No Fault", "Fault")` |
| **Monthly view switching** | Sheet tabs (Jan 26, Feb 26, etc.) |

## Setup

### 1. Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open **SQL Editor** and paste the contents of `supabase-schema.sql`
3. Run the SQL — this creates all tables and seeds sample data

> **Important:** In your Supabase Dashboard → Settings → API, disable RLS (Row Level Security) on all 4 tables for now, or create appropriate policies.

### 2. Environment Variables

```bash
cd frontend
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in: Supabase Dashboard → Settings → API

### 3. Run the App

```bash
cd frontend
npm install
npm run dev
```

## Pages

- **Dashboard** — Overview stats, charts, expense analytics
- **Accounts** — Manage receivable/payable/self accounts with transactions
- **Expenses** — Track daily expenses with trend charts and estimate finder
- **Verification** — Fault detection cross-check (matches Excel Row 31 logic)

## Tech Stack

- **React 19** + Vite
- **Supabase** (PostgreSQL) — direct frontend queries
- **Recharts** — bar, pie, area charts
- **Lucide React** — icons
- **React Router** — navigation
