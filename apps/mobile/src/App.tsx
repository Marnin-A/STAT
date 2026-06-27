import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { TriageList } from './pages/TriageList'
import { TriageTracking } from './pages/TriageTracking'
import { MedicalIncident } from './pages/MedicalIncident'
import { SecurityTactical } from './pages/SecurityTactical'
import { FireHazard } from './pages/FireHazard'
import { DispatchMap } from './pages/DispatchMap'
import { HospitalPreArrival } from './pages/HospitalPreArrival'

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/triage" element={<TriageList />} />
          <Route path="/triage/:id" element={<TriageTracking />} />
          <Route path="/triage/medical/:id" element={<MedicalIncident />} />
          <Route path="/dispatch" element={<SecurityTactical />} />
          <Route path="/dispatch/fire/:id" element={<FireHazard />} />
          <Route path="/dispatch/map" element={<DispatchMap />} />
          <Route path="/hospital" element={<HospitalPreArrival />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
