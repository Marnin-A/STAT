/**
 * View-model shapes that never cross the network.
 *
 * `@stat/shared` is the wire contract and holds only what the API actually
 * sends. These are presentation types the screens assemble locally — keeping
 * them here stops UI concerns from leaking into the contract.
 */

/** A vital sign formatted for display. Derived from `TelemetrySample.payload`. */
export interface Vital {
  label: string
  value: string | number
  unit: string
  trend: 'up' | 'down' | 'flat'
  critical?: boolean
}

/**
 * A message in the incident channel.
 *
 * There is no chat backend yet (see the roadmap's open questions) — screens
 * hold these in local state, so nothing here is persisted or delivered.
 */
export interface ChatMessage {
  id: string
  incidentId: string
  senderId: string
  senderName: string
  message: string
  timestamp: string
  isOwn: boolean
}
