'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Printer,
  FileText,
  ShieldCheck,
  Package,
  Phone,
  Mail,
  User,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Tag,
  Building,
} from 'lucide-react'
import { toast } from 'sonner'

export default function BookingConfirmationPage() {
  const params = useParams()
  const id = params?.id as string

  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBooking() {
      try {
        setLoading(true)
        const res = await fetch(`/api/me/reservations/${id}`)
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to load booking')
        }
        const data = await res.json()
        setBooking(data)
      } catch (err: any) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadBooking()
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading booking confirmation...</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md w-full shadow-sm">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Booking Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            We could not find a confirmed reservation with reference "{id}".
          </p>
          <Link
            href="/rentals/my-requests"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to My Rentals
          </Link>
        </div>
      </div>
    )
  }

  const isReady = booking.status === 'READY_FOR_HANDOVER'

  return (
    <div className="min-h-screen bg-[#f8fafc] py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/rentals/my-requests"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to My Rental Requests
          </Link>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition print:hidden"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Confirmation
          </button>
        </div>

        {/* Status Confirmation Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/25">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wide uppercase mb-1">
                  Step 06 Inventory Committed
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">Booking Confirmed & Asset Reserved</h1>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Your reservation is officially secured. Equipment has been assigned and scheduled for pickup.
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-left md:text-right shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 block">
                Booking Reference
              </span>
              <span className="text-xl font-mono font-black tracking-tight text-white">{booking.booking_no}</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Asset & Equipment Details (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Asset Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  Reserved Asset Information
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {booking.status === 'READY_FOR_HANDOVER' ? 'Ready for Handover' : 'Reserved in Warehouse'}
                </span>
              </div>

              <div className="flex gap-4 items-start">
                {booking.asset.cover_image && (
                  <img
                    src={booking.asset.cover_image}
                    alt={booking.asset.name}
                    className="w-20 h-20 rounded-xl object-cover border border-slate-100 shrink-0"
                  />
                )}
                <div className="flex-1">
                  <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">
                    {booking.asset.category || 'Rental Equipment'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{booking.asset.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Model Code: {booking.asset.code}</p>
                  <p className="text-xs text-slate-600 mt-2 font-medium">
                    Quantity: <span className="font-bold text-slate-900">{booking.asset.quantity} unit</span> • Duration:{' '}
                    <span className="font-bold text-slate-900">{booking.asset.rental_days} days</span>
                  </p>
                </div>
              </div>

              {/* Allocated Units List */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2">Committed Equipment Tag(s):</span>
                {booking.allocated_equipment.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                    Generic pool capacity reserved. Exact unit barcode assigned at counter.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {booking.allocated_equipment.map((eq: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-emerald-600" />
                          <div>
                            <span className="font-mono font-bold text-slate-900">{eq.tag}</span>
                            <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              Condition: {eq.condition}
                            </span>
                          </div>
                        </div>
                        {eq.accessories && (
                          <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            Kit: {eq.accessories}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Interval */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Pickup Scheduled
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {new Date(booking.start_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">From 09:00 AM</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Expected Return
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {new Date(booking.end_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">Before 06:00 PM</p>
                </div>
              </div>
            </div>

            {/* Handover & Collection Instructions */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Info className="h-4 w-4 text-emerald-600" />
                Handover & Collection Instructions (Step 07 Handoff)
              </h2>
              <div className="p-4 bg-amber-50/60 border border-amber-200/60 rounded-xl space-y-2 text-xs text-amber-950">
                <p className="font-semibold text-amber-900">What to bring to pickup:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                  <li>Original National ID Card or Valid Passport for identity verification.</li>
                  <li>This Booking Confirmation document (printed or mobile QR code).</li>
                  <li>Authorization letter if collecting on behalf of an organization.</li>
                </ul>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {booking.fulfillment.pickup_instructions}
              </p>
            </div>
          </div>

          {/* Right Column: Location & Payment Receipt Link (1 col) */}
          <div className="space-y-6">
            {/* Pickup Location Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Fulfillment Location
              </h3>
              {booking.location ? (
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-slate-900 text-sm">{booking.location.name}</p>
                  <p className="text-slate-600 leading-relaxed">{booking.location.address}</p>
                  <p className="text-slate-500 font-medium">{booking.location.city}, Cambodia</p>
                  <div className="pt-2 text-[11px] text-slate-400">
                    Timezone: <span className="font-mono text-slate-600">{booking.location.timezone}</span>
                  </div>
                </div>
              ) : booking.delivery_address ? (
                <div className="space-y-2 text-xs">
                  <span className="font-semibold text-emerald-700">Doorstep Delivery</span>
                  <p className="text-slate-700 font-medium">{booking.delivery_address.addressLine1}</p>
                  <p className="text-slate-500">{booking.delivery_address.city}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Main Facility, Phnom Penh</p>
              )}
            </div>

            {/* Financial Settlement Link Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Payment & Deposit
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Total Paid:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    ${booking.payment.total_paid?.toFixed(2)} {booking.payment.currency}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-indigo-600 font-medium">Security Deposit Held:</span>
                  <span className="font-bold text-indigo-700">${booking.payment.deposit_liability?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Official Receipt:</span>
                  <span className="font-mono font-bold text-slate-700">{booking.payment.receipt_no}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Link
                  href={`/rentals/requests/${id}/receipt`}
                  target="_blank"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition border border-slate-200/80"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  View Tax Invoice Receipt
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Renter Contact */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2 text-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <User className="h-4 w-4 text-emerald-600" />
                Primary Contact
              </h3>
              <p className="font-bold text-slate-900">{booking.renter.name}</p>
              <p className="text-slate-500 flex items-center gap-1.5">
                <Mail className="h-3 w-3 text-slate-400" />
                {booking.renter.email}
              </p>
              <p className="text-slate-500 flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-slate-400" />
                {booking.renter.phone}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
