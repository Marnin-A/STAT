import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import App from '../App';
import { ApiProvider } from '../api/ApiProvider';
import { DemoProvider } from './DemoProvider';

vi.mock('../hooks/useDeviceId', () => ({ useDeviceId: () => 'demo-test-device' }));
vi.mock('../hooks/useHaptics', () => ({ useHaptics: () => ({ impactHeavy: async () => { }, notificationSuccess: async () => { } }) }));
beforeEach(() => { sessionStorage.clear(); window.history.replaceState(null, '', '/'); });
function app() {
  return render(<DemoProvider enabled>
    <ApiProvider>
      <App />
    </ApiProvider>
  </DemoProvider>);
}
async function openTools() {
  if (!screen.queryByRole('dialog', { name: 'Demo tools' })) await userEvent.click(screen.getByRole('button', { name: 'Demo tools' }));
}
async function select(role: string) {
  await openTools();
  await waitFor(() => expect(screen.getByLabelText('Demo persona')).toBeEnabled());
  await userEvent.selectOptions(screen.getByLabelText('Demo persona'), role);
}
async function clickIn(container: HTMLElement, name: string) {
  const button = await within(container).findByRole('button', { name });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
}
it('completes a new SOS by switching all five accounts through the actual app', async () => {
  app();
  await userEvent.click(screen.getByRole('button', { name: 'Request medical help' }));
  expect(await screen.findByText('No responder has been assigned yet.')).toBeInTheDocument();
  const id = window.location.pathname.split('/').slice(-1)[0];
  await userEvent.click(screen.getByText('Optional response questions'));
  await userEvent.click(within(screen.getByRole('group', { name: 'Is the patient conscious?' })).getByLabelText('Yes'));
  await userEvent.click(within(screen.getByRole('group', { name: 'Is the patient breathing normally?' })).getByLabelText('Yes'));
  await userEvent.click(within(screen.getByRole('group', { name: 'Is there severe bleeding?' })).getByLabelText('No'));
  await userEvent.click(screen.getByRole('button', { name: 'Send answers' }));
  expect(await screen.findByText('Answers received. Protocol result: stable')).toBeInTheDocument();
  await select('dispatcher');
  const card = await screen.findByRole('article', { name: `Request ${id}` });
  await clickIn(card, 'Assign DEMO AMB-02');
  expect(await within(card).findByText('Awaiting responder acceptance')).toBeInTheDocument();
  await select('responder');
  const response = await screen.findByRole('article', { name: `Request ${id}` });
  await clickIn(response, 'Accept assignment');
  await clickIn(response, 'Arrived on scene');
  await userEvent.type(within(response).getByLabelText('Handoff note'), 'Synthetic handoff: patient conscious.');
  await clickIn(response, 'Save handoff note');
  await userEvent.type(await within(response).findByLabelText('Heart rate (bpm)'), '88');
  await userEvent.type(within(response).getByLabelText('SpO2 (%)'), '97');
  await clickIn(response, 'Save sample vitals');
  await clickIn(response, 'Select Demo Mainland Care Centre');
  await clickIn(response, 'Alert receiving hospital');
  await select('hospital_staff');
  const hospital = await screen.findByRole('article', { name: `Request ${id}` });
  expect(within(hospital).getByText('88 bpm · SpO2 97%')).toBeInTheDocument();
  await userEvent.click(within(hospital).getByText(/Shared incident timeline/));
  expect(within(hospital).getByText('Synthetic handoff: patient conscious.')).toBeVisible();
  await clickIn(hospital, 'Confirm hospital ready');
  await waitFor(() => expect(within(hospital).getByText('Hospital ready')).toBeInTheDocument());
  await select('responder');
  const transport = await screen.findByRole('article', { name: `Request ${id}` });
  await clickIn(transport, 'Start transport');
  await clickIn(transport, 'Arrived at hospital');
  await select('hospital_staff');
  await clickIn(await screen.findByRole('article', { name: `Request ${id}` }), 'Complete patient handoff');
  await waitFor(() => expect(screen.queryByRole('article', { name: `Request ${id}` })).not.toBeInTheDocument());
  await select('admin');
  expect(await within(screen.getByRole('region', { name: 'Action audit' })).findByText(/Patient received; hospital handoff completed/)).toBeInTheDocument();
  const fleet = screen.getByRole('region', { name: 'Demo fleet' });
  expect(within(fleet).getByRole('button', { name: 'Take DEMO AMB-02 out of service' })).toBeInTheDocument();
  await select('citizen');
  await userEvent.click(screen.getByRole('link', { name: 'Activity' }));
  await userEvent.click(screen.getByRole('link', { name: 'Open your request' }));
  expect(await screen.findByRole('heading', { name: 'Request ended.' })).toBeInTheDocument();
  expect(screen.getByText('resolved')).toBeInTheDocument();
}, 30000);

it('restores the selected account, active request, and scenario after remount; reset clears new cases', async () => {
  let view = app();
  await userEvent.click(screen.getByRole('button', { name: 'Request medical help' }));
  await screen.findByText('No responder has been assigned yet.');
  const id = window.location.pathname.split('/').slice(-1)[0];
  await select('dispatcher');
  await clickIn(await screen.findByRole('article', { name: `Request ${id}` }), 'Assign DEMO AMB-02');
  await waitFor(() => expect(screen.queryByText('Saving demo action…')).not.toBeInTheDocument());
  view.unmount();
  view = app();
  await openTools();
  expect(screen.getByLabelText('Demo persona')).toHaveValue('dispatcher');
  await userEvent.click(screen.getByRole('button', { name: 'Close demo tools' }));
  expect(within(await screen.findByRole('article', { name: `Request ${id}` })).getByText('Awaiting responder acceptance')).toBeInTheDocument();
  await select('citizen');
  await userEvent.click(screen.getByRole('link', { name: 'Activity' }));
  await userEvent.click(screen.getByRole('link', { name: 'Open your request' }));
  expect(window.location.pathname).toBe('/triage/' + id);
  await openTools();
  await userEvent.click(screen.getByRole('button', { name: 'Reset demo data' }));
  await openTools();
  await userEvent.click(screen.getByRole('link', { name: 'Role scenario' }));
  await userEvent.click(screen.getByText('Background sample cases · read-only'));
  expect(screen.queryByRole('article', { name: `Request ${id}` })).not.toBeInTheDocument();
  expect(screen.getByRole('article', { name: 'Request demo-medical-active' })).toBeInTheDocument();
}, 15000);

it('reports memory-only operation when browser storage is blocked', async () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
  try {
    app();
    await openTools();
    expect(await screen.findByRole('alert')).toHaveTextContent('Demo storage unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Close demo tools' }));
    await userEvent.click(screen.getByRole('button', { name: 'Request medical help' }));
    expect(await screen.findByText('No responder has been assigned yet.')).toBeInTheDocument();
  } finally { storage.mockRestore(); }
});

it('recovers from a malformed saved scenario instead of crashing', () => {
  sessionStorage.setItem('stat_demo_emergency_v1', JSON.stringify({ schema: 1, role: 'citizen', scenario: { data: { incidents: [], units: [], hospitals: [] }, ready: {} } }));
  app();
  expect(screen.getByRole('button', { name: 'Request medical help' })).toBeInTheDocument();
});

it('guides account switches through the popup and leaves only current actions on the page', async () => {
  app();
  expect(screen.queryByRole('region', { name: 'Next demo step' })).not.toBeInTheDocument();
  await openTools();
  expect(screen.getByRole('region', { name: 'Next demo step' })).toHaveTextContent('Request medical help');
  await userEvent.click(screen.getByRole('link', { name: 'Open current task' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Request medical help' }));
  await screen.findByText('No responder has been assigned yet.');
  await openTools();
  await userEvent.click(await screen.findByRole('button', { name: /Switch to Dispatcher/ }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Assign DEMO AMB-02' }));
  await openTools();
  await userEvent.click(await screen.findByRole('button', { name: /Switch to Responder/ }));
  const accept = screen.getByRole('button', { name: 'Accept assignment' });
  expect(accept).toHaveAccessibleDescription(/accept before travelling/);
  await userEvent.click(accept);
  const scene = await screen.findByRole('button', { name: 'Arrived on scene' });
  await waitFor(() => expect(scene).toBeEnabled());
  await userEvent.click(scene);
  await screen.findByLabelText('Heart rate (bpm)');
  expect(screen.queryByRole('button', { name: 'Select Demo Mainland Care Centre' })).not.toBeInTheDocument();
  await openTools();
  expect(screen.getByRole('region', { name: 'Next demo step' })).toHaveTextContent('Save sample vitals');
  await userEvent.keyboard('{Escape}');
  expect(screen.getByRole('button', { name: 'Demo tools' })).toHaveFocus();
}, 15000);
