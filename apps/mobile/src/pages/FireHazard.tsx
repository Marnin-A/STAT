import { BentoCard } from '../components/ui/BentoCard'
import { MapPlaceholder } from '../components/ui/MapPlaceholder'
import { ActionButton } from '../components/ui/ActionButton'

const IKEJA: { lat: number; lng: number } = { lat: 6.595, lng: 3.335 }

export function FireHazard() {
  return (
    <div className="flex flex-col gap-6 px-[var(--spacing-margin-mobile)] py-6">
      <div>
        <h2 className="text-xl font-extrabold text-on-surface">Fire — Chemical Fire</h2>
        <p className="text-sm text-on-surface-variant uppercase tracking-wider">
          Ikeja GRA — Critical — En Route
        </p>
      </div>

      <div className="p-4 bg-error-container border-2 border-primary rounded">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary">dangerous</span>
          <span className="text-sm font-bold uppercase text-primary">Hazmat Alert</span>
        </div>
        <p className="text-sm text-on-surface">Industrial chemical storage facility. Toxic fumes reported. Evacuation zone 500m.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BentoCard title="Wind" value="NE 15km/h" icon="air" subtitle="Spreading SW" />
        <BentoCard title="Temp" value="850°C" icon="thermostat" critical />
        <BentoCard title="Hydrants" value="2" icon="water_drop" subtitle="Nearest: 120m" />
        <BentoCard title="Units" value="3" icon="local_fire_department" subtitle="FIRE-07, FIRE-12, HAZMAT-1" />
      </div>

      <MapPlaceholder center={IKEJA} eta="6 min" className="h-48" />

      <div className="flex gap-3">
        <ActionButton icon="water_drop" className="flex-1">Request Water</ActionButton>
        <ActionButton icon="evacuation" variant="secondary" className="flex-1">Evacuate</ActionButton>
      </div>
    </div>
  )
}
