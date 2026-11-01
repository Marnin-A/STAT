import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createDemoData, createDemoApi, type DemoUser } from "./fixtures";
import type { MockApiClient, Role } from "@stat/shared";
interface DemoContextValue {
  user: DemoUser;
  users: DemoUser[];
  api: MockApiClient;
  scope: string;
  select: (role: Role) => void;
  reset: () => void;
}
const DemoContext = createContext<DemoContextValue | null>(null);
function clearDemoRequest() {
  try {
    sessionStorage.removeItem("stat_pending_medical_sos");
    sessionStorage.setItem("stat_active_incident_id", "demo-medical-active");
  } catch {
    /* Storage is optional for an in-memory synthetic demo. */
  }
}
export function DemoProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const synthetic = enabled && !import.meta.env.VITE_API_URL;
  const [users] = useState(() => createDemoData().users);
  const [role, setRole] = useState<Role>("citizen");
  const [api, setApi] = useState(createDemoApi);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (synthetic) clearDemoRequest();
  }, [synthetic, api]);
  if (!synthetic) return <>{children}</>;
  return (
    <DemoContext.Provider
      value={{
        user: users.find((user) => user.role === role)!,
        users,
        api,
        scope: role + ":" + generation,
        select: (next) => {
          clearDemoRequest();
          setRole(next);
        },
        reset: () => {
          clearDemoRequest();
          setApi(createDemoApi());
          setGeneration((value) => value + 1);
        },
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  return useContext(DemoContext);
}
