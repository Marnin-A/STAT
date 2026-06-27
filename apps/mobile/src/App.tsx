import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<div className="p-4">Dashboard (Phase 2)</div>} />
          <Route path="/triage" element={<div className="p-4">Triage List (Phase 3)</div>} />
          <Route path="/triage/:id" element={<div className="p-4">Triage Tracking (Phase 2)</div>} />
          <Route path="/triage/medical/:id" element={<div className="p-4">Medical Incident (Phase 3)</div>} />
          <Route path="/dispatch" element={<div className="p-4">Security Tactical (Phase 3)</div>} />
          <Route path="/dispatch/fire/:id" element={<div className="p-4">Fire Hazard (Phase 3)</div>} />
          <Route path="/dispatch/map" element={<div className="p-4">Dispatch Map (Phase 3)</div>} />
          <Route path="/hospital" element={<div className="p-4">Hospital Pre-Arrival (Phase 4)</div>} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
