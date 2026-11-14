import {
  MockApiClient,
  type Role,
  type Incident,
  type Unit,
  type Hospital,
  type Dispatch,
} from "@stat/shared";

export interface DemoUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  details: [string, string][];
}
export const roleLabels: Record<Role, string> = {
  citizen: "Citizen",
  responder: "Responder",
  dispatcher: "Dispatcher",
  hospital_staff: "Hospital staff",
  admin: "Administrator",
};
const at = "2026-11-01T09:20:00.000Z";
export function createDemoData() {
  // Entirely fictional. Contact identifiers intentionally cannot be dialled.
  const users: DemoUser[] = [
    {
      id: "demo-citizen",
      role: "citizen",
      name: "Amara Bello",
      email: "amara.bello@example.test",
      details: [
        ["Date of birth", "18 April 1992"],
        ["Sex", "Female"],
        ["Area", "Surulere, Lagos — sample area"],
        ["Languages", "English, Yoruba"],
        ["Blood group", "O positive — self-reported"],
        ["Allergies", "Penicillin — sample allergy"],
        ["Conditions", "Asthma — sample history"],
        ["Medications", "Prescribed inhaler — sample entry, no dosing advice"],
        [
          "Emergency contact",
          "Tunde Bello · Brother · DEMO-CONTACT-01 (not dialable)",
        ],
        [
          "Secondary contact",
          "Zainab Bello · Sister · DEMO-CONTACT-02 (not dialable)",
        ],
        ["Insurance", "Demo Care Plan · DEMO-POLICY-1001"],
        ["Sharing", "OFF — no actual consent or sharing integration"],
      ],
    },
    {
      id: "demo-responder",
      role: "responder",
      name: "Chidi Nwosu",
      email: "chidi.nwosu@example.test",
      details: [
        ["Agency", "Demo Lagos Medical Response"],
        ["Position", "Lead paramedic"],
        ["Staff ID", "DEMO-STAFF-R01"],
        ["Credential", "DEMO-PARAMEDIC-001 · synthetic, not a real licence"],
        ["Unit", "Demo crew · DEMO AMB-01 / DEMO AMB-02"],
        ["Shift", "08:00–20:00 WAT · sample shift"],
        ["Station", "Demo Surulere response base"],
        ["Equipment", "Oxygen, defibrillator, stretcher — synthetic inventory"],
        ["Contact", "DEMO-RADIO-R01 (not dialable)"],
        ["Assignment", "Open role workspace for current assignments"],
        ["Location sharing", "Not connected — no device tracking"],
      ],
    },
    {
      id: "demo-dispatcher",
      role: "dispatcher",
      name: "Bisola Akinwale",
      email: "bisola.akinwale@example.test",
      details: [
        ["Agency", "Demo Lagos Medical Response"],
        ["Position", "Medical dispatch coordinator"],
        ["Staff ID", "DEMO-STAFF-D01"],
        ["Desk", "Demo dispatch desk 03"],
        ["Shift", "08:00–20:00 WAT · sample shift"],
        ["Jurisdiction", "Demo Lagos Central medical zone"],
        ["Contact", "DEMO-DESK-D01 (not dialable)"],
        ["Queue", "Open role workspace for the current request queue"],
        ["Dispatch authority", "Human approval required — demo scenario"],
      ],
    },
    {
      id: "demo-hospital",
      role: "hospital_staff",
      name: "Dr. Nneka Adeyemi",
      email: "nneka.adeyemi@example.test",
      details: [
        ["Hospital", "Demo Mainland Care Centre"],
        ["Position", "Emergency department coordinator"],
        ["Staff ID", "DEMO-STAFF-H01"],
        ["Credential", "DEMO-CLINICIAN-001 · synthetic, not a real licence"],
        ["Department", "Emergency receiving unit"],
        ["Shift", "08:00–20:00 WAT · sample shift"],
        ["Contact", "DEMO-DESK-H01 (not dialable)"],
        ["Capacity", "4 beds — synthetic snapshot, not live availability"],
        ["Incoming case", "Open role workspace for incoming alerts"],
        [
          "Preparation",
          "Confirm readiness and complete handoff in the role workspace",
        ],
      ],
    },
    {
      id: "demo-admin",
      role: "admin",
      name: "Musa Danjuma",
      email: "musa.danjuma@example.test",
      details: [
        ["Organisation", "Demo STAT Operations"],
        ["Position", "Agency administrator"],
        ["Staff ID", "DEMO-STAFF-A01"],
        ["Managed agency", "Demo Lagos Medical Response"],
        ["Memberships", "5 synthetic personas; no real account provisioning"],
        ["Fleet", "2 synthetic ambulance units"],
        ["Facilities", "1 synthetic receiving hospital"],
        ["Contact", "DEMO-ADMIN-A01 (not dialable)"],
        ["Audit", "Open role workspace for the attributed action audit"],
      ],
    },
  ];
  const base: Incident = {
    id: "demo-medical-active",
    agencyId: "demo-agency-medical",
    type: "medical",
    priority: "serious",
    status: "en_route",
    location: { lat: 6.5, lng: 3.35 },
    assignedUnitIds: ["demo-ambulance-01"],
    hospitalId: "demo-hospital-01",
    hospitalAlerted: true,
    riskScore: 0,
    flagged: false,
    notes: [
      {
        id: "demo-note-01",
        actorId: "demo-dispatcher",
        text: "Synthetic case: medical response approved; DEMO AMB-01 assigned.",
        at: "2026-11-01T09:10:00.000Z",
      },
      {
        id: "demo-note-02",
        actorId: "demo-responder",
        text: "Synthetic case: assignment accepted; travelling to sample incident area. No live GPS.",
        at: "2026-11-01T09:15:00.000Z",
      },
    ],
    version: 5,
    createdAt: "2026-11-01T09:00:00.000Z",
    updatedAt: at,
  };
  const incidents: Incident[] = [
    base,
    {
      ...base,
      id: "demo-medical-awaiting",
      status: "created",
      priority: "critical",
      assignedUnitIds: [],
      hospitalId: null,
      hospitalAlerted: false,
      notes: [],
      version: 1,
      createdAt: "2026-11-01T09:18:00.000Z",
    },
    {
      ...base,
      id: "demo-medical-completed",
      status: "resolved",
      priority: "stable",
      assignedUnitIds: [],
      notes: [
        {
          id: "demo-note-03",
          actorId: "demo-hospital",
          text: "Synthetic previous visit: handoff completed; no clinical outcome inferred.",
          at: "2026-10-30T12:00:00.000Z",
        },
      ],
      version: 9,
      createdAt: "2026-10-30T10:00:00.000Z",
      updatedAt: "2026-10-30T12:00:00.000Z",
    },
  ];
  const units: Unit[] = [
    {
      id: "demo-ambulance-01",
      agencyId: "demo-agency-medical",
      type: "ambulance",
      callSign: "DEMO AMB-01",
      status: "assigned",
      location: { lat: 6.51, lng: 3.36 },
      capabilities: ["oxygen", "defibrillator", "stretcher"],
      updatedAt: at,
    },
    {
      id: "demo-ambulance-02",
      agencyId: "demo-agency-medical",
      type: "ambulance",
      callSign: "DEMO AMB-02",
      status: "available",
      location: { lat: 6.52, lng: 3.37 },
      capabilities: ["oxygen", "stretcher"],
      updatedAt: at,
    },
  ];
  const hospitals: Hospital[] = [
    {
      id: "demo-hospital-01",
      name: "Demo Mainland Care Centre",
      location: { lat: 6.53, lng: 3.38 },
      capabilities: ["emergency", "trauma"],
      availableBeds: 4,
      updatedAt: at,
    },
  ];
  const dispatches: Dispatch[] = [
    {
      id: "demo-dispatch-01",
      incidentId: base.id,
      unitId: "demo-ambulance-01",
      dispatcherId: "demo-dispatcher",
      status: "accepted",
      dispatchedAt: "2026-11-01T09:10:00.000Z",
      acceptedAt: "2026-11-01T09:15:00.000Z",
    },
  ];
  return { users, incidents, units, hospitals, dispatches };
}
export function createDemoApi() {
  return new MockApiClient(createDemoData());
}
