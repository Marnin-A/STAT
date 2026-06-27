import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  { to: '/triage', label: 'Triage', icon: 'assignment' },
  { to: '/dispatch/map', label: 'Dispatch', icon: 'map' },
  { to: '/hospital', label: 'Hospital', icon: 'local_hospital' },
]

export function BottomNavBar() {
  return (
    <nav
      role="navigation"
      className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 bg-surface-container-lowest border-t-2 border-outline-variant"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`
            }
          >
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
            <span className="text-xs font-semibold">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
