'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Boxes, UserCheck, ArrowLeft, Sparkles, UserPlus, Mail, Lock, User, Phone, Clock } from 'lucide-react'

function CustomerLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/rentals'
  const isExpired = searchParams.get('expired') === '1'

  const [mode, setMode] = useState<'login' | 'register'>('login')

  // Login form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Registration form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [showRegPw, setShowRegPw] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e?: React.FormEvent, directUsername?: string, directPassword?: string) => {
    if (e) e.preventDefault()
    setError('')
    setLoading(true)

    const identityToUse = directUsername || username
    const passwordToUse = directPassword || password

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: identityToUse,
          password: passwordToUse || 'RenterPassword123!',
        }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push(from)
        router.refresh()
      } else {
        setError(data.error || 'Invalid credentials. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please check your network and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push(from)
        router.refresh()
      } else {
        setError(data.error || 'Registration failed. Please try again.')
      }
    } catch {
      setError('Something went wrong during registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = (email: string, pw = 'RenterPassword123!') => {
    setUsername(email)
    setPassword(pw)
    setMode('login')
    handleLogin(undefined, email, pw)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans">
      {/* ── LEFT HALF — white with customer equipment illustration ── */}
      <div className="hidden md:flex w-1/2 h-full bg-white flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-10 pt-10 pb-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#0d4a2e] text-white flex items-center justify-center shadow">
              <Boxes className="h-5 w-5" />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-slate-800">
              Asset <span className="text-[#16a34a]">Rental</span>
            </span>
          </Link>
        </div>

        {/* Illustration centered */}
        <div className="flex-1 flex items-center justify-center px-12">
          <div className="w-full max-w-md">
            <div className="relative">
              <div className="absolute inset-[-8%] rounded-[50%] bg-[#eaf6ee] blur-2xl opacity-80 pointer-events-none" />
              <img
                src="/customer-login-illustration.jpg"
                alt="Rent equipment, cameras, drones and camping gear"
                className="relative z-10 w-full rounded-3xl object-cover shadow-xl border border-slate-100"
              />
            </div>
            <p className="text-center text-slate-700 text-sm font-semibold mt-6">
              Rent Anything. Own Nothing.
            </p>
            <p className="text-center text-slate-400 text-xs mt-1">
              Explore cameras, drones, laptops, and outdoor equipment on demand.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-10 pb-8 text-[11px] text-slate-400">
          <p>© 2026 Asset Rental · Customer Portal</p>
          <Link href="/admin/login" className="text-slate-400 hover:text-emerald-700 transition">
            Admin Portal →
          </Link>
        </div>
      </div>

      {/* ── RIGHT HALF — dark green matching brand aesthetic ── */}
      <div className="w-full md:w-1/2 h-full bg-[#0d4a2e] flex flex-col justify-center px-8 sm:px-12 lg:px-20 relative overflow-y-auto">
        {/* Subtle decorative circles */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#16a34a]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-[#16a34a]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm mx-auto py-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 md:hidden">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Boxes className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-bold text-base">Asset Rental</span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-black/20 p-1 mb-6 border border-white/10">
            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-[#16a34a] text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-[#16a34a] text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {mode === 'login' ? 'Client Portal Login' : 'Create a Client Account'}
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-1">
              {mode === 'login'
                ? 'Sign in as a client to browse assets, request rentals, and manage bookings'
                : 'Join RentHub to explore and rent high-demand equipment'}
            </p>
          </div>

          {isExpired && !error && (
            <div className="mb-5 text-xs text-amber-200 bg-amber-500/15 border border-amber-400/30 rounded-xl px-4 py-3 flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-amber-300" />
              <span>Your session has expired. Please sign in again to continue.</span>
            </div>
          )}

          {mode === 'login' ? (
            /* ── SIGN IN FORM ── */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <input
                    id="customer-identity"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. you@renthub.app"
                    required
                    autoComplete="email"
                    className="w-full rounded-xl bg-[#0b3d25] border border-white/10 text-white placeholder:text-white/25 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/60 focus:border-[#16a34a]/40 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="customer-password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl bg-[#0b3d25] border border-white/10 text-white placeholder:text-white/25 px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/60 focus:border-[#16a34a]/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-3.5 py-2">
                  {error}
                </p>
              )}

              <button
                id="customer-login-btn"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-lg shadow-black/20 mt-1"
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          ) : (
            /* ── REGISTER FORM ── */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Sokha Meng"
                  required
                  className="w-full rounded-xl bg-[#0b3d25] border border-white/10 text-white placeholder:text-white/25 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/60 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-xl bg-[#0b3d25] border border-white/10 text-white placeholder:text-white/25 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/60 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+855 12 345 678"
                  className="w-full rounded-xl bg-[#0b3d25] border border-white/10 text-white placeholder:text-white/25 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/60 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showRegPw ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a secure password"
                    required
                    minLength={6}
                    className="w-full rounded-xl bg-[#0b3d25] border border-white/10 text-white placeholder:text-white/25 px-4 py-2 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/60 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition"
                    tabIndex={-1}
                  >
                    {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Confirm Password
                </label>
                <input
                  type={showRegPw ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="w-full rounded-xl bg-[#0b3d25] border border-white/10 text-white placeholder:text-white/25 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/60 transition"
                />
              </div>

              {error && (
                <p className="text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-3.5 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-lg shadow-black/20 mt-1"
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {loading ? 'Creating Account…' : 'Complete Registration'}
              </button>
            </form>
          )}

          {/* Quick 1-click Demo logins for test convenience */}
          {mode === 'login' && (
            <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
              <p className="text-[11px] text-white/40 text-center uppercase tracking-wider font-semibold">
                Quick 1-Click Demo Login
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('you@renthub.app', 'RenterPassword123!')}
                  disabled={loading}
                  className="py-2 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-[11px] font-medium transition border border-white/10 text-center truncate flex items-center justify-center gap-1"
                >
                  <Sparkles className="h-3 w-3 text-amber-300 shrink-0" />
                  <span>You (Demo)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('sokha.renter@gmail.com', 'RenterPassword123!')}
                  disabled={loading}
                  className="py-2 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-[11px] font-medium transition border border-white/10 text-center truncate flex items-center justify-center gap-1"
                >
                  <Sparkles className="h-3 w-3 text-emerald-300 shrink-0" />
                  <span>Sokha Meng</span>
                </button>
              </div>
            </div>
          )}

          {/* Back to browse */}
          <div className="mt-5 text-center">
            <Link
              href="/rentals"
              className="inline-flex items-center gap-1.5 text-xs text-[#16a34a] hover:text-emerald-300 transition font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Continue browsing assets without signing in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CustomerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d4a2e] flex items-center justify-center text-white">
          <span className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <CustomerLoginForm />
    </Suspense>
  )
}
