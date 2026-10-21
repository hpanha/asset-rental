'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  ShieldCheck,
  Search,
  RefreshCw,
  ExternalLink,
  Eye,
  Check,
  X,
  Building,
  User,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Banknote,
} from 'lucide-react'
import { toast } from 'sonner'

interface PaymentOrder {
  id: string
  requestId: string
  currency: string
  rentalAmount: number
  tax: number
  deliveryFee: number
  depositAmount: number
  totalDue: number
  status: string
  dueAt: string
  paidAt?: string
  createdAt: string
  request: {
    id: string
    requestNumber: string
    renterName: string
    renterEmail: string
    renterPhone: string
    startDate: string
    endDate: string
    totalDays: number
    status: string
    asset: {
      id: string
      name: string
      primaryImageUrl?: string
    }
    inventoryHolds?: Array<{
      id: string
      status: string
      expiresAt: string
    }>
    depositLedger?: {
      id: string
      collected: number
      held: number
      deducted: number
      refunded: number
      liabilityBalance: number
    }
  }
  attempts: Array<{
    id: string
    method: string
    provider: string
    providerReference?: string
    status: string
    amount: number
    currency: string
    createdAt: string
  }>
  receipt?: {
    id: string
    receiptNo: string
    capturedAmount: number
    issuedAt: string
  }
}

interface PaymentStats {
  totalRevenue: number
  totalDepositHeld: number
  pendingVerificationCount: number
  paidCount: number
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentOrder[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalDepositHeld: 0,
    pendingVerificationCount: 0,
    paidCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ALL' | 'PROCESSING' | 'PAID' | 'UNPAID' | 'REQUIRES_REVIEW'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [verifyModalOrder, setVerifyModalOrder] = useState<PaymentOrder | null>(null)
  const [verifyNotes, setVerifyNotes] = useState('')
  const [submittingVerify, setSubmittingVerify] = useState(false)

  const [rejectModalOrder, setRejectModalOrder] = useState<PaymentOrder | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [submittingReject, setSubmittingReject] = useState(false)

  const [detailModalOrder, setDetailModalOrder] = useState<PaymentOrder | null>(null)

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/payments')
      if (!res.ok) throw new Error('Failed to load payments')
      const data = await res.json()
      setPayments(data.payments || [])
      setStats(
        data.stats || {
          totalRevenue: 0,
          totalDepositHeld: 0,
          pendingVerificationCount: 0,
          paidCount: 0,
        }
      )
    } catch (err: any) {
      toast.error(err.message || 'Error fetching payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const handleVerifyManual = async () => {
    if (!verifyModalOrder) return
    try {
      setSubmittingVerify(true)
      const res = await fetch(`/api/admin/payments/${verifyModalOrder.id}/verify-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankReference: verifyModalOrder.attempts[0]?.providerReference || 'BANK-TRANSFER',
          notes: verifyNotes,
          verifiedBy: 'Vannak Chen (Finance)',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')

      toast.success(`Payment verified! Receipt issued: ${data.receiptNo}`)
      setVerifyModalOrder(null)
      setVerifyNotes('')
      fetchPayments()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingVerify(false)
    }
  }

  const handleRejectProof = async () => {
    if (!rejectModalOrder) return
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason')
      return
    }
    try {
      setSubmittingReject(true)
      const res = await fetch(`/api/admin/payments/${rejectModalOrder.id}/reject-manual-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: rejectReason,
          verifiedBy: 'Vannak Chen (Finance)',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rejection failed')

      toast.success('Manual transfer proof rejected. Renter can retry.')
      setRejectModalOrder(null)
      setRejectReason('')
      fetchPayments()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingReject(false)
    }
  }

  // Filtered list
  const filteredPayments = payments.filter((p) => {
    // Tab filter
    if (activeTab === 'PROCESSING' && p.status !== 'PROCESSING') return false
    if (activeTab === 'PAID' && p.status !== 'PAID') return false
    if (activeTab === 'UNPAID' && p.status !== 'UNPAID') return false
    if (activeTab === 'REQUIRES_REVIEW' && !['REQUIRES_REVIEW', 'FAILED'].includes(p.status)) return false

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const reqNum = p.request.requestNumber.toLowerCase()
      const renter = p.request.renterName.toLowerCase()
      const asset = p.request.asset.name.toLowerCase()
      const ref = (p.attempts[0]?.providerReference || '').toLowerCase()
      const rec = (p.receipt?.receiptNo || '').toLowerCase()
      return reqNum.includes(q) || renter.includes(q) || asset.includes(q) || ref.includes(q) || rec.includes(q)
    }
    return true
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Step 05 Finance Center
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Rental Payments & Security Deposits
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time financial reconciliation, deposit liability ledger, and manual bank transfer settlement.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Rental Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settled Revenue</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">
              ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-xs text-emerald-600 font-medium mt-1">Rental charges + delivery fees captured</p>
          </div>
        </div>

        {/* Card 2: Security Deposit Liability */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Deposits Held (Liability)</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-indigo-900">
              ${stats.totalDepositHeld.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="text-xs text-indigo-600 font-medium mt-1">Held in escrow (owed back to renters)</p>
          </div>
        </div>

        {/* Card 3: Pending Verification */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Awaiting Verification</span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">{stats.pendingVerificationCount}</span>
            <p className="text-xs text-amber-600 font-medium mt-1">Manual bank wire proofs submitted</p>
          </div>
        </div>

        {/* Card 4: Paid Orders */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settled Orders</span>
            <div className="h-9 w-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">{stats.paidCount}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Completed payment orders</p>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Controls: Tabs & Search */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
            {(
              [
                { id: 'ALL', label: 'All Orders' },
                { id: 'PROCESSING', label: `Pending Wire (${stats.pendingVerificationCount})` },
                { id: 'PAID', label: 'Paid & Settled' },
                { id: 'UNPAID', label: 'Unpaid' },
                { id: 'REQUIRES_REVIEW', label: 'Exceptions' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by request #, renter, ref..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-5">Request & Renter</th>
                <th className="py-3.5 px-5">Asset</th>
                <th className="py-3.5 px-5">Financial Breakdown</th>
                <th className="py-3.5 px-5">Method / Reference</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading financial orders...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No payment orders match this filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const latestAttempt = p.attempts[0]
                  const isPendingWire = (p.status === 'PROCESSING' || p.status === 'REQUIRES_REVIEW') && latestAttempt?.method === 'BANK_TRANSFER'
                  const isPendingCash = (p.status === 'PROCESSING' || p.status === 'REQUIRES_REVIEW') && latestAttempt?.method === 'CASH'

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      {/* Column 1: Request & Renter */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{p.request.requestNumber}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            {p.id.slice(-6)}
                          </span>
                        </div>
                        <div className="text-slate-600 font-medium mt-0.5">{p.request.renterName}</div>
                        <div className="text-[11px] text-slate-400">{p.request.renterPhone}</div>
                      </td>

                      {/* Column 2: Asset & Period */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-800">{p.request.asset.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(p.request.startDate).toLocaleDateString()} — {new Date(p.request.endDate).toLocaleDateString()} ({p.request.totalDays}d)
                        </div>
                      </td>

                      {/* Column 3: Financial Breakdown */}
                      <td className="py-4 px-5">
                        <div className="font-extrabold text-slate-900 text-sm">
                          ${p.totalDue.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">{p.currency}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Rental: ${(p.rentalAmount + p.tax + p.deliveryFee).toFixed(2)}</span>
                          <span>•</span>
                          <span className="text-indigo-600 font-medium bg-indigo-50 px-1 rounded">
                            Deposit: ${p.depositAmount.toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* Column 4: Method & Ref */}
                      <td className="py-4 px-5">
                        {latestAttempt ? (
                          <div>
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              {latestAttempt.method === 'KHQR' ? (
                                'KHQR / Bakong'
                              ) : latestAttempt.method === 'CARD' ? (
                                'Credit / Debit Card'
                              ) : latestAttempt.method === 'BANK_TRANSFER' ? (
                                'Bank Wire Transfer'
                              ) : latestAttempt.method === 'CASH' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                  <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                                  Cash at Counter
                                </span>
                              ) : (
                                latestAttempt.method
                              )}
                            </span>
                            {latestAttempt.providerReference && (
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-[150px]">
                                {latestAttempt.providerReference}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No attempt recorded</span>
                        )}
                      </td>

                      {/* Column 5: Status */}
                      <td className="py-4 px-5">
                        {p.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            PAID
                          </span>
                        ) : isPendingCash ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <Banknote className="h-3 w-3 text-emerald-600" />
                            Awaiting Cash
                          </span>
                        ) : isPendingWire ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3" />
                            Awaiting Wire
                          </span>
                        ) : p.status === 'REQUIRES_REVIEW' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <AlertCircle className="h-3 w-3" />
                            Review Required
                          </span>
                        ) : p.status === 'FAILED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <X className="h-3 w-3" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            UNPAID
                          </span>
                        )}
                      </td>

                      {/* Column 6: Actions */}
                      <td className="py-4 px-5 text-right space-x-2">
                        {isPendingWire && (
                          <>
                            <button
                              onClick={() => {
                                setVerifyModalOrder(p)
                                setVerifyNotes(`Verified against bank statement for ${p.request.renterName}`)
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition inline-flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Verify Bank Wire
                            </button>
                            <button
                              onClick={() => {
                                setRejectModalOrder(p)
                                setRejectReason('Wire transaction reference not found on bank statement')
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-[11px] transition inline-flex items-center gap-1"
                            >
                              <X className="h-3 w-3" />
                              Reject
                            </button>
                          </>
                        )}

                        {isPendingCash && (
                          <button
                            onClick={() => {
                              setVerifyModalOrder(p)
                              setVerifyNotes(`Physical cash received and counted at logistics counter for ${p.request.renterName}`)
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition inline-flex items-center gap-1"
                          >
                            <Banknote className="h-3 w-3" />
                            Confirm Cash Received
                          </button>
                        )}

                        {p.status === 'PAID' && (
                          <Link
                            href={`/rentals/requests/${p.requestId}/receipt`}
                            target="_blank"
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition inline-flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            Receipt
                          </Link>
                        )}

                        <button
                          onClick={() => setDetailModalOrder(p)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-[11px] transition inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Details
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Verify Manual Wire Transfer */}
      {verifyModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  {verifyModalOrder.attempts[0]?.method === 'CASH' ? (
                    <Banknote className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {verifyModalOrder.attempts[0]?.method === 'CASH'
                    ? 'Confirm Cash Payment at Counter'
                    : 'Verify Bank Wire Transfer'}
                </h3>
              </div>
              <button
                onClick={() => setVerifyModalOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Request #:</span>
                  <span className="font-bold text-slate-800">{verifyModalOrder.request.requestNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Renter:</span>
                  <span className="font-medium text-slate-800">{verifyModalOrder.request.renterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    {verifyModalOrder.attempts[0]?.method === 'CASH' ? 'Payment Method:' : 'Customer Wire Ref:'}
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {verifyModalOrder.attempts[0]?.method === 'CASH'
                      ? 'Cash Payment at Counter / Pickup'
                      : verifyModalOrder.attempts[0]?.providerReference || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-2 font-bold text-slate-900 text-sm">
                  <span>Total To Confirm:</span>
                  <span>${verifyModalOrder.totalDue.toFixed(2)} USD</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-900 text-[11px] leading-relaxed">
                <strong>Accounting Note:</strong> ${verifyModalOrder.depositAmount.toFixed(2)} of this total will be booked to the refundable security deposit liability ledger. The remaining ${(verifyModalOrder.rentalAmount + verifyModalOrder.tax + verifyModalOrder.deliveryFee).toFixed(2)} will be recognized as rental revenue.
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {verifyModalOrder.attempts[0]?.method === 'CASH'
                    ? 'Cash Drawer / Counter Notes:'
                    : 'Bank Reconciliation Notes / Statement Ref:'}
                </label>
                <textarea
                  rows={3}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder={
                    verifyModalOrder.attempts[0]?.method === 'CASH'
                      ? 'e.g., Physical cash counted and placed into Register #1 upon pickup'
                      : 'e.g., Matched ABA Bank statement line #49281 on Oct 22'
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVerifyModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingVerify}
                onClick={handleVerifyManual}
                className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {submittingVerify
                  ? 'Settling Payment...'
                  : verifyModalOrder.attempts[0]?.method === 'CASH'
                  ? 'Confirm Cash Received & Issue Receipt'
                  : 'Confirm Settle & Issue Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject Manual Proof */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Reject Bank Transfer Proof</h3>
              </div>
              <button
                onClick={() => setRejectModalOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Rejecting proof will set the attempt as failed and notify the renter to submit a valid wire or pay with a card.
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Rejection Reason:
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Bank reference not found on bank feed; amount sent was insufficient"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReject}
                onClick={handleRejectProof}
                className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {submittingReject ? 'Rejecting...' : 'Reject Proof'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full Order & Deposit Ledger Details */}
      {detailModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Financial Audit & Ledger</h3>
                <p className="text-xs text-slate-500">
                  Order #{detailModalOrder.id.slice(-8)} • Request {detailModalOrder.request.requestNumber}
                </p>
              </div>
              <button
                onClick={() => setDetailModalOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  Renter Information
                </span>
                <p className="font-semibold text-slate-900">{detailModalOrder.request.renterName}</p>
                <p className="text-slate-500">{detailModalOrder.request.renterEmail}</p>
                <p className="text-slate-500">{detailModalOrder.request.renterPhone}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  Asset & Hold Status
                </span>
                <p className="font-semibold text-slate-900">{detailModalOrder.request.asset.name}</p>
                <p className="text-slate-500">
                  Hold Status:{' '}
                  <span className="font-semibold text-emerald-600">
                    {detailModalOrder.request.inventoryHolds?.[0]?.status || 'CONSUMED'}
                  </span>
                </p>
                <p className="text-slate-400 text-[10px]">
                  Expires: {detailModalOrder.request.inventoryHolds?.[0]?.expiresAt ? new Date(detailModalOrder.request.inventoryHolds[0].expiresAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Deposit Ledger Breakdown */}
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  Refundable Security Deposit Liability Ledger
                </span>
                <span className="text-[10px] font-semibold uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                  Liability Account
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="bg-white p-3 rounded-lg border border-indigo-100/60">
                  <span className="text-[10px] text-slate-400 block font-medium">Collected</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ${(detailModalOrder.request.depositLedger?.collected || detailModalOrder.depositAmount).toFixed(2)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-indigo-100/60">
                  <span className="text-[10px] text-slate-400 block font-medium">Held Liability</span>
                  <span className="font-bold text-indigo-600 text-sm">
                    ${(detailModalOrder.request.depositLedger?.held || (detailModalOrder.status === 'PAID' ? detailModalOrder.depositAmount : 0)).toFixed(2)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-indigo-100/60">
                  <span className="text-[10px] text-slate-400 block font-medium">Refunded to Date</span>
                  <span className="font-bold text-slate-700 text-sm">
                    ${(detailModalOrder.request.depositLedger?.refunded || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Attempts History */}
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 block">Payment Attempt History</span>
              {detailModalOrder.attempts.length === 0 ? (
                <p className="text-slate-400 italic">No attempts logged yet.</p>
              ) : (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {detailModalOrder.attempts.map((att, idx) => (
                    <div key={att.id || idx} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {att.method} ({att.provider})
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Ref: {att.providerReference || 'N/A'} • {new Date(att.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">${att.amount.toFixed(2)}</span>
                        <div className="mt-0.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              att.status === 'SUCCEEDED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : att.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {att.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOrder(null)}
                className="px-5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
