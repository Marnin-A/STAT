import { afterEach, expect, it } from 'vitest'
import stylesheet from '../../index.css?raw'

afterEach(() => { document.querySelectorAll('[data-spacing-check]').forEach(node => node.remove()) })
it.each(['Refresh status', 'Try refresh', 'Send answers'])('%s has padded, wrapping, full-width secondary-action styling', label => {
  const rule = stylesheet.match(/\.secondary-action\s*\{[^}]*\}/)?.[0]
  expect(rule).toBeTruthy()
  const style = document.createElement('style')
  style.dataset.spacingCheck = ''
  style.textContent = rule!
  document.head.append(style)
  const button = document.createElement('button')
  button.dataset.spacingCheck = ''
  button.className = 'secondary-action'
  button.textContent = label
  document.body.append(button)
  const computed = getComputedStyle(button)
  expect(parseFloat(computed.paddingLeft)).toBeGreaterThanOrEqual(20)
  expect(parseFloat(computed.paddingRight)).toBeGreaterThanOrEqual(20)
  expect(parseFloat(computed.paddingTop)).toBeGreaterThanOrEqual(12)
  expect(parseFloat(computed.minHeight)).toBeGreaterThanOrEqual(48)
  expect(computed.width).toBe('100%')
  expect(computed.whiteSpace).toBe('normal')
})
