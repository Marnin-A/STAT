export function TopAppBar() {
  return (
    <header
      role="banner"
      className="safe-area-top sticky top-0 z-50 bg-surface-container-lowest border-b-2 border-outline-variant px-[var(--spacing-margin-mobile)] py-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl font-bold">emergency</span>
          <h1 className="text-xl font-extrabold tracking-tight text-on-surface">STAT</h1>
        </div>
        <a
          href="tel:911"
          className="touch-target flex items-center gap-2 bg-primary text-on-primary px-4 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-lg">call</span>
          Call Dispatch
        </a>
      </div>
    </header>
  )
}
