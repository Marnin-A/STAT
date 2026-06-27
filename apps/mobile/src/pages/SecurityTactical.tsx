import { BentoCard } from '../components/ui/BentoCard'
import { MapPlaceholder } from '../components/ui/MapPlaceholder'
import { ActionButton } from '../components/ui/ActionButton'

const LAGOS: { lat: number; lng: number } = { lat: 6.4541, lng: 3.3947 }

export function SecurityTactical() {
  return (
    <div className="flex flex-col gap-6 px-[var(--spacing-margin-mobile)] py-6">
      <div>
        <h2 className="text-xl font-extrabold text-on-surface">Security — Armed Robbery</h2>
        <p className="text-sm text-on-surface-variant uppercase tracking-wider">
          Lekki Phase 1 — Serious — Dispatched
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BentoCard title="Threat Level" value="HIGH" icon="gpp_bad" critical />
        <BentoCard title="Suspects" value="3" icon="group" subtitle="2 armed, 1 driver" />
        <BentoCard title="Weapons" value="Firearms" icon="security" critical />
        <BentoCard title="Units" value="2" icon="local_police" subtitle="POL-14, POL-22" />
      </div>

      <MapPlaceholder center={LAGOS} eta="4 min" className="h-48" />

      <div className="p-4 bg-surface-container-lowest border-2 border-outline-variant rounded">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary">videocam</span>
          <span className="text-sm font-bold text-on-surface">Body Cam — Unit 14</span>
        </div>
        <div className="h-32 bg-surface-container rounded flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">videocam_off</span>
        </div>
        <p className="text-xs text-on-surface-variant mt-2">Camera feed available on scene arrival</p>
      </div>

      <div className="flex gap-3">
        <ActionButton icon="call" className="flex-1">Call Unit 14</ActionButton>
        <ActionButton icon="map" variant="secondary" className="flex-1">Navigate</ActionButton>
      </div>
    </div>
  )
}
