import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createDemoData, type DemoUser } from './fixtures';
import { DemoApiClient, type DemoSnapshot } from './emergency';
import type { Role } from '@stat/shared';

const storageKey = 'stat_demo_emergency_v1';
interface SavedDemo { schema: 1; role: Role; scenario: DemoSnapshot; }
function load() {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedDemo;
    if (saved.schema !== 1 || !createDemoData().users.some(u => u.role === saved.role) || !Array.isArray(saved.scenario?.data?.incidents) || !Array.isArray(saved.scenario?.data?.units) || !Array.isArray(saved.scenario?.data?.hospitals)) throw new Error('Invalid saved demo');
    if (![saved.scenario.requests, saved.scenario.ready, saved.scenario.arrived, saved.scenario.audit].every(Array.isArray)) throw new Error('Invalid saved demo');
    const restored = new DemoApiClient(saved.scenario).snapshot();
    if (!restored.data.incidents.every(i => i && typeof i.id === 'string' && Array.isArray(i.notes) && Array.isArray(i.assignedUnitIds))) throw new Error('Invalid saved cases');
    return saved;
  } catch { return null; }
}
interface DemoContextValue {
  user: DemoUser; users: DemoUser[]; api: DemoApiClient; scope: string; revision: number;
  storageWarning: boolean; select: (role: Role) => void; reset: () => void;
}
const DemoContext = createContext<DemoContextValue | null>(null);
function clearPending() {
  try { sessionStorage.removeItem('stat_pending_medical_sos'); } catch { /* memory-only */ }
}
export function DemoProvider({ enabled, children }: { enabled: boolean; children: ReactNode; }) {
  const synthetic = enabled && !import.meta.env.VITE_API_URL;
  const [initial] = useState(() => synthetic ? load() : null);
  const [users] = useState(() => createDemoData().users);
  const [role, setRole] = useState<Role>(initial?.role ?? 'citizen');
  const [api, setApi] = useState(() => {
    const client = new DemoApiClient(initial?.scenario);
    client.setRole(initial?.role ?? 'citizen');
    return client;
  });
  const [generation, setGeneration] = useState(0);
  const [storageWarning, setStorageWarning] = useState(false);
  const revision = useSyncExternalStore(api.subscribe, api.getRevision);
  useEffect(() => {
    if (!synthetic || api.busy) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ schema: 1, role, scenario: api.snapshot() }));
      if (!sessionStorage.getItem('stat_active_incident_id')) sessionStorage.setItem('stat_active_incident_id', 'demo-medical-active');
      setStorageWarning(false);
    } catch { setStorageWarning(true); }
  }, [synthetic, api, revision, role]);
  if (!synthetic) return <>{children}</>;
  return <DemoContext.Provider value={{
    user: users.find(u => u.role === role)!, users, api, revision, storageWarning,
    scope: role + ':' + generation,
    select: next => { if (api.busy) return; clearPending(); api.setRole(next); setRole(next); },
    reset: () => {
      if (api.busy) return;
      clearPending();
      try { sessionStorage.setItem('stat_active_incident_id', 'demo-medical-active'); } catch { /* memory-only */ }
      const fresh = new DemoApiClient(); fresh.setRole(role); setApi(fresh); setGeneration(v => v + 1);
    },
  }}>{children}</DemoContext.Provider>;
}
export function useDemo() { return useContext(DemoContext); }
