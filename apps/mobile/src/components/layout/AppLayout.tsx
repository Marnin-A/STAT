import { type ReactNode } from 'react'
import { TopAppBar } from './TopAppBar'
import { BottomNavBar } from './BottomNavBar'
import { OfflineBanner } from './OfflineBanner'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopAppBar />
      <OfflineBanner />
      <main className="pb-20">
        {children}
      </main>
      <BottomNavBar />
    </div>
  )
}
