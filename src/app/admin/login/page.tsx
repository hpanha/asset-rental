'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Boxes, Lock, Clock } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/admin'
  const isExpired = searchParams.get('expired') === '1'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(from)
        router.refresh()
      } else {
        setError(data.error || 'Invalid username or password. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans">

      {/* ── LEFT HALF — white ── */}
      <div className="hidden md:flex w-1/2 h-full bg-white flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-10 pt-10 pb-0">
          <div className="h-9 w-9 rounded-xl bg-[#0d4a2e] text-white flex items-center justify-center shadow">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-slate-800">
            Asset <span className="text-[#16a34a]">Rental</span>
          </span>
        </div>

        {/* Illustration centered */}
        <div className="flex-1 flex items-center justify-center px-12">
          <div className="w-full max-w-md">
            <div className="relative">
              {/* soft green blob behind image */}
              <div className="absolute inset-[-8%] rounded-[50%] bg-[#eaf6ee] blur-2xl opacity-80 pointer-events-none" />
              <img
                src="/admin-login-illustration.jpg"
                alt="Admin workspace"
                className="relative z-10 w-full rounded-3xl object-cover shadow-xl"
              />
            </div>
            <p className="text-center text-slate-500 text-sm font-medium mt-6">
              Your rental operations hub
            </p>
            <p className="text-center text-slate-400 text-xs mt-1">
              Manage assets, inventory, and more — all in one place.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-slate-300 px-10 pb-8">
          © 2025 Asset Rental · Admin Portal
        </p>
      </div>

      {/* ── RIGHT HALF — dark green ── */}
      <div className="w-full md:w-1/2 h-full bg-[#0d4a2e] flex flex-col justify-center px-12 lg:px-20 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#16a34a]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-[#16a34a]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm mx-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Boxes className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-bold text-base">Asset Rental</span>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Admin Console</h1>
            <p className="text-sm text-white/50 mt-1.5">Sign in with authorized administrator credentials</p>
          </div>

          {isExpired && !error && (
            <div className="mb-5 text-xs text-amber-200 bg-amber-500/15 border border-amber-400/30 rounded-xl px-4 py-3 flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-amber-300" />
              <span>Your admin session has expired. Please log in again to continue.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
                className="w-full rounded-xl bg-[#0b3d25] border border-white/10 text-white placeholder:text-white/25 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/60 focus:border-[#16a34a]/40 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-[#0b3d25] border border-white/10 text-white placeholder:text-white/25 px-4 py-3.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/60 focus:border-[#16a34a]/40 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <span className="text-[12px] text-white/35 hover:text-white/60 cursor-pointer transition">
                  Forgot Password?
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-[13px] text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-black/20 mt-2"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {loading ? 'Signing in…' : 'Login to Admin'}
            </button>
          </form>

          {/* Credentials hint */}
          <div className="mt-8 pt-5 border-t border-white/10 text-center space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setUsername('admin@renthub.app')
                setPassword('AdminPassword123!')
              }}
              className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-medium transition border border-white/10"
            >
              Fill Admin Demo Credentials
            </button>
            <p className="text-[12px] text-white/40 font-mono">
              admin@renthub.app / AdminPassword123!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

