import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { DemoNextStep } from './DemoNextStep';
import { DemoPanel } from './DemoPanel';
import { useDemo } from './DemoProvider';

export function DemoTools() {
  const demo = useDemo();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!demo || location.hash !== '#demo-next-action') return;
    const frame = requestAnimationFrame(() => document.getElementById('demo-next-action')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash, demo?.scope]);
  useEffect(() => {
    if (!open) return;
    const app = document.querySelector('.app');
    const wasInert = app?.hasAttribute('inert');
    const overflow = document.body.style.overflow;
    app?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('summary, a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled])') ?? []).filter(el => el.tagName === 'SUMMARY' || !el.closest('details:not([open])'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      if (!wasInert) app?.removeAttribute('inert');
      document.body.style.overflow = overflow;
      launcher.current?.focus();
    };
  }, [open]);
  if (!demo) return null;
  const { step } = demo.api.journey();
  return <>
    <span className="sr-only" id="demo-next-instruction">{step.help}</span>
    <button ref={launcher} className="demo-launcher" aria-label="Demo tools" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'demo-tools-popup' : undefined} onClick={() => setOpen(true)}>
      Demo <span aria-hidden="true">{step.id === 'complete' ? '✓' : `${step.number}/11`}</span>
    </button>
    {open && createPortal(
      <div className="demo-popup-backdrop" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div ref={dialog} id="demo-tools-popup" role="dialog" aria-modal="true" aria-labelledby="demo-tools-title" className="demo-popup">
          <header className="demo-popup-header"><h2 id="demo-tools-title">Demo tools</h2><button ref={close} className="secondary-action" aria-label="Close demo tools" onClick={() => setOpen(false)}>Close</button></header>
          <div className="demo-popup-content"
            onChange={event => { if ((event.target as HTMLElement).tagName === 'SELECT') setOpen(false); }}
            onClick={event => {
              const control = (event.target as HTMLElement).closest('a,button');
              if (!control) return;
              setOpen(false);
              if (control.getAttribute('href')?.includes('#demo-next-action')) requestAnimationFrame(() => document.getElementById('demo-next-action')?.focus());
            }}>
            <DemoNextStep />
            <DemoPanel />
          </div>
        </div>
      </div>, document.body)}
  </>;
}
