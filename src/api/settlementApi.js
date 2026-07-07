import { apiRequest } from './client.js'

/** Settlement management endpoints. */
export const settlementApi = {
  /** Preview settlement calculation for a member. */
  preview: (memberId) =>
    apiRequest(`/settlements/${memberId}/preview`).then((r) => r.data),

  /** Execute a member settlement. */
  execute: (memberId, data = {}) =>
    apiRequest(`/settlements/${memberId}/execute`, {
      method: 'POST',
      body: data,
    }).then((r) => r.data),

  /** List all settlements. */
  list: (params = {}) =>
    apiRequest(`/settlements?${new URLSearchParams(params)}`).then((r) => r.data),
}