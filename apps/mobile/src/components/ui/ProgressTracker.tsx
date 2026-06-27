interface ProgressTrackerProps {
  currentStep: number
}

const steps = ['Dispatched', 'En Route', 'Arriving']

export function ProgressTracker({ currentStep }: ProgressTrackerProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface-container-lowest border-2 border-outline-variant rounded">
      {steps.map((step, index) => (
        <div key={step} className="flex flex-col items-center gap-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            index <= currentStep ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
          }`}>
            {index + 1}
          </div>
          <span className={`text-xs font-semibold ${index <= currentStep ? 'text-primary' : 'text-on-surface-variant'}`}>
            {step}
          </span>
        </div>
      ))}
    </div>
  )
}
