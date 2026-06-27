import { ReactNode } from 'react'
import { TopAppBar } from './TopAppBar'
import { BottomNavBar } from './BottomNavBar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopAppBar />
      <main className="pb-20">
        {children}
      </main>
      <BottomNavBar />
    </div>
  )
}
