import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, beforeEach } from 'vitest';
import { DemoProvider } from './DemoProvider';
import { DemoTools } from './DemoTools';

beforeEach(() => sessionStorage.clear());
function renderTools(enabled = true) {
  return render(<DemoProvider enabled={enabled}><MemoryRouter><DemoTools /></MemoryRouter></DemoProvider>);
}
it('hides demo controls until opened, closes on Escape and restores focus', async () => {
  renderTools();
  const launcher = screen.getByRole('button', { name: 'Demo tools' });
  expect(screen.queryByLabelText('Demo persona')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Next demo step' })).not.toBeInTheDocument();
  await userEvent.click(launcher);
  expect(screen.getByRole('dialog', { name: 'Demo tools' })).toBeInTheDocument();
  expect(screen.getByLabelText('Demo persona')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close demo tools' })).toHaveFocus();
  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  expect(screen.getByRole('button', { name: 'Reset demo data' })).toHaveFocus();
  await userEvent.keyboard('{Tab}');
  expect(screen.getByRole('button', { name: 'Close demo tools' })).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(launcher).toHaveFocus();
});
it('closes on account switch and keeps the selected account when reopened', async () => {
  renderTools();
  await userEvent.click(screen.getByRole('button', { name: 'Demo tools' }));
  await userEvent.selectOptions(screen.getByLabelText('Demo persona'), 'responder');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Demo tools' }));
  expect(screen.getByLabelText('Demo persona')).toHaveValue('responder');
});
it('does not show a floating demo launcher outside demo mode', () => {
  renderTools(false);
  expect(screen.queryByRole('button', { name: 'Demo tools' })).not.toBeInTheDocument();
});
