'use client'

import { Providers } from '@/components/rental/Providers'

export default function RentalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Providers>{children}</Providers>
}
