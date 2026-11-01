import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { it, expect, vi } from 'vitest'
import { Activity } from './Activity'
it('keeps Home reachable when browser storage is unavailable', () => {
 const read = vi.spyOn(Storage.prototype,'getItem').mockImplementation(() => {throw new Error('blocked')})
 try {
  render(<MemoryRouter><Activity/></MemoryRouter>)
  expect(screen.getByRole('link',{name:'Go to Home'})).toHaveAttribute('href','/')
 } finally {read.mockRestore()}
})
