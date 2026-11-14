import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { TriageList } from "./pages/TriageList";
import { TriageTracking } from "./pages/TriageTracking";
import { MedicalIncident } from "./pages/MedicalIncident";
import { SecurityTactical } from "./pages/SecurityTactical";
import { FireHazard } from "./pages/FireHazard";
import { DispatchMap } from "./pages/DispatchMap";
import { HospitalPreArrival } from "./pages/HospitalPreArrival";
import { Profile } from "./pages/Profile";
import { Activity } from "./pages/Activity";
import { DemoWorkspace } from "./demo/DemoWorkspace";
import { useDemo } from "./demo/DemoProvider";
function Home() {
  const demo = useDemo();
  return demo && demo.user.role !== "citizen" ? <DemoWorkspace /> : <Dashboard />;
}
function StaffPage({ children }: { children: React.ReactNode; }) {
  return useDemo() ? <DemoWorkspace /> : children;
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/demo" element={<DemoWorkspace />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/triage" element={<StaffPage>
            <TriageList />
          </StaffPage>} />
          <Route path="/triage/:id" element={<TriageTracking />} />
          <Route path="/triage/medical/:id" element={<MedicalIncident />} />
          <Route path="/dispatch" element={<StaffPage>
            <SecurityTactical />
          </StaffPage>} />
          <Route path="/dispatch/fire/:id" element={<FireHazard />} />
          <Route path="/dispatch/map" element={<DispatchMap />} />
          <Route path="/hospital" element={<StaffPage>
            <HospitalPreArrival />
          </StaffPage>} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
