'use client'

import { Providers } from '@/components/rental/Providers'
import { Header } from '@/components/rental/Header'
import { Footer } from '@/components/rental/Footer'
import { HomeSection } from '@/components/rental/HomeSection'
import { DashboardSection } from '@/components/rental/DashboardSection'
import { AddListingSection } from '@/components/rental/AddListingSection'
import { AssetDetailDialog } from '@/components/rental/AssetDetailDialog'
import { useStore } from '@/lib/store'

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
