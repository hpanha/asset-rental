'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  Printer,
  Download,
  Calendar,
  Shield,
  Building2,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileText,
  Boxes,
  Lock,
} from 'lucide-react'
import { Header } from '@/components/rental/Header'
import { Footer } from '@/components/rental/Footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function RentalPaymentReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data, isLoading, error } = useQuery({
    queryKey: ['payment-receipt', id],
    queryFn: async () => {
      const res = await fetch(`/api/me/rental-requests/${id}/payment-receipt`)
      if (!res.ok) {
        throw new Error('Payment receipt not found')
      }
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-muted-foreground">Loading payment receipt...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">Receipt Not Available</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Payment has not been completed or verified for this rental request.
          </p>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/rentals/my-requests">Return to My Requests</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  const receipt = data
  const b = receipt.breakdown

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background flex flex-col">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
            <Link href="/rentals/my-requests">
              <ArrowLeft className="h-3.5 w-3.5" />
              My Requests
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs bg-white"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Receipt
            </Button>
            <Button
              asChild
              size="sm"
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Link href="/rentals/my-requests">
                Step 06 Handover Next
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Printable Official Receipt Invoice */}
        <Card className="bg-white dark:bg-card border-border shadow-md overflow-hidden p-6 sm:p-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  AR
                </div>
                <span className="text-lg font-extrabold tracking-tight">
                  Asset <span className="text-emerald-600">Rental</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{receipt.company.legal_name}</p>
              <p className="text-xs text-muted-foreground">{receipt.company.address}</p>
              <p className="text-xs text-muted-foreground">{receipt.company.phone} • {receipt.company.email}</p>
            </div>

            <div className="text-left sm:text-right">
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 font-bold mb-1.5">
                PAYMENT CONFIRMED
              </Badge>
              <h2 className="font-mono text-base font-extrabold text-foreground">{receipt.receipt_no}</h2>
              <p className="text-xs text-muted-foreground">
                Issued on {new Date(receipt.issued_at).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Request Ref: <strong className="font-mono text-foreground">{receipt.request_no}</strong>
              </p>
            </div>
          </div>

          {/* Customer & Asset Summary Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-border text-xs">
            <div>
              <span className="font-bold text-foreground text-xs uppercase tracking-wider block mb-2">
                Billed To:
              </span>
              <p className="font-bold text-sm text-foreground">{receipt.customer.name}</p>
              <p className="text-muted-foreground">{receipt.customer.email}</p>
              <p className="text-muted-foreground">{receipt.customer.phone}</p>
              {receipt.customer.organization && (
                <p className="text-muted-foreground font-medium mt-0.5">{receipt.customer.organization}</p>
              )}
            </div>

            <div>
              <span className="font-bold text-foreground text-xs uppercase tracking-wider block mb-2">
                Payment Details:
              </span>
              <p className="text-muted-foreground">
                Method:{' '}
                <strong className="text-foreground">
                  {receipt.payment_method === 'CASH'
                    ? 'Cash Payment at Counter / Pickup'
                    : receipt.payment_method === 'BANK_TRANSFER'
                    ? 'Direct Bank Wire'
                    : receipt.payment_method === 'CARD'
                    ? 'Credit / Debit Card'
                    : receipt.payment_method}
                </strong>
              </p>
              {receipt.provider_reference && (
                <p className="text-muted-foreground font-mono text-[11px] truncate">
                  Reference: {receipt.provider_reference}
                </p>
              )}
              <p className="text-muted-foreground">
                Equipment: <strong className="text-foreground">{receipt.asset.name}</strong> ({receipt.asset.quantity} unit)
              </p>
              <p className="text-muted-foreground">
                Duration: {receipt.asset.rental_days} Day(s)
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-6 border-b border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-center">Days</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="py-3">
                    <p className="font-bold text-foreground">{receipt.asset.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Equipment rental service charge
                    </p>
                  </td>
                  <td className="py-3 text-center">{receipt.asset.rental_days}</td>
                  <td className="py-3 text-center">{receipt.asset.quantity}</td>
                  <td className="py-3 text-right font-semibold">
                    ${b.rental_subtotal.toFixed(2)}
                  </td>
                </tr>

                {b.delivery_fee > 0 && (
                  <tr>
                    <td className="py-3">Fulfillment & Delivery Fee</td>
                    <td className="py-3 text-center">—</td>
                    <td className="py-3 text-center">1</td>
                    <td className="py-3 text-right font-semibold">${b.delivery_fee.toFixed(2)}</td>
                  </tr>
                )}

                <tr>
                  <td className="py-3">
                    <p className="font-bold text-foreground flex items-center gap-1">
                      Refundable Security Deposit
                      <Shield className="h-3 w-3 text-emerald-600" />
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Held as customer liability; refunded upon inspection in Step 10
                    </p>
                  </td>
                  <td className="py-3 text-center">—</td>
                  <td className="py-3 text-center">{receipt.asset.quantity}</td>
                  <td className="py-3 text-right font-semibold">${b.refundable_deposit.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Total Row */}
            <div className="pt-4 flex flex-col items-end gap-1.5 text-xs">
              <div className="flex justify-between w-48 text-muted-foreground">
                <span>Subtotal Rental:</span>
                <span>${(b.rental_subtotal + b.delivery_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-48 text-muted-foreground">
                <span>Held Deposit:</span>
                <span>${b.refundable_deposit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-48 font-black text-sm pt-2 border-t border-border text-foreground">
                <span>Total Paid:</span>
                <span className="text-emerald-600">${b.total_captured.toFixed(2)} {b.currency}</span>
              </div>
            </div>
          </div>

          {/* Footer & Disclaimer */}
          <div className="pt-6 text-[11px] text-muted-foreground space-y-1.5 leading-relaxed">
            <p className="font-semibold text-foreground">Escrow & Refund Protocol:</p>
            <p>{receipt.legal_disclaimer}</p>
            <p className="text-[10px] text-muted-foreground/80 pt-2">
              This document serves as an official confirmation of financial capture for RentHub reservation management.
            </p>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
