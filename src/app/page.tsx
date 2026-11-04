'use client'

import dynamic from 'next/dynamic'
import { Providers } from '@/components/rental/Providers'
import { Header } from '@/components/rental/Header'
import { Footer } from '@/components/rental/Footer'
import { HomeSection } from '@/components/rental/HomeSection'
import { useStore } from '@/lib/store'

const DashboardSection = dynamic(
  () => import('@/components/rental/DashboardSection').then((m) => m.DashboardSection),
  { ssr: false }
)

const AddListingSection = dynamic(
  () => import('@/components/rental/AddListingSection').then((m) => m.AddListingSection),
  { ssr: false }
)

const AssetDetailDialog = dynamic(
  () => import('@/components/rental/AssetDetailDialog').then((m) => m.AssetDetailDialog),
  { ssr: false }
)

function CurrentView() {
  const view = useStore((s) => s.view)
  if (view === 'dashboard') return <DashboardSection />
  if (view === 'add-listing') return <AddListingSection />
  return <HomeSection />
}

export default function Home() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          <CurrentView />
        </main>
        <Footer />
        <AssetDetailDialog />
      </div>
    </Providers>
  )
}
