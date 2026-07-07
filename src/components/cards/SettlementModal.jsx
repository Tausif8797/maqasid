import { useState, useEffect } from 'react'
import { FiDollarSign, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { settlementApi } from '../../api/settlementApi.js'
import { formatCurrency } from '../../utils/format.js'

/**
 * Settlement preview & confirmation modal for member exit.
 * @param {{ memberId: string, memberName: string, open: boolean, onClose: () => void, onSettled: () => void }} props
 */
export default function SettlementModal({ memberId, memberName, open, onClose, onSettled }) {
  const [preview, setPreview] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !memberId) return
    let active = true
    setLoading(true)
    setError('')
    settlementApi
      .preview(memberId)
      .then((data) => {
        if (active) setPreview(data)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load settlement preview')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [open, memberId])

  const handleExecute = async () => {
    setExecuting(true)
    setError('')
    try {
      await settlementApi.execute(memberId, { notes: notes.trim() })
      onSettled()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to process settlement')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Member Settlement"
      size="md"
      footer={
        preview && !loading ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={executing}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleExecute} disabled={executing}>
              {executing ? 'Processing...' : 'Confirm & Settle'}
            </Button>
          </>
        ) : null
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : preview ? (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Final settlement for <strong>{memberName}</strong>. This action will close all active loans and mark the member as exited.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-green-50 px-4 py-3">
              <p className="text-xs text-green-600">Total Contributions</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(preview.totalContributions)}</p>
            </div>
            <div className="rounded-lg bg-red-50 px-4 py-3">
              <p className="text-xs text-red-600">Remaining Loan</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(preview.remainingLoan)}</p>
            </div>
          </div>

          <div
            className={`rounded-lg px-4 py-4 ${
              preview.direction === 'pay_to_member'
                ? 'bg-green-50'
                : preview.direction === 'collect_from_member'
                  ? 'bg-red-50'
                  : 'bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              {preview.direction === 'pay_to_member' ? (
                <FiCheckCircle className="h-6 w-6 text-green-600" />
              ) : preview.direction === 'collect_from_member' ? (
                <FiAlertCircle className="h-6 w-6 text-red-600" />
              ) : (
                <FiDollarSign className="h-6 w-6 text-slate-600" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {preview.direction === 'pay_to_member'
                    ? 'Pay to Member'
                    : preview.direction === 'collect_from_member'
                      ? 'Collect from Member'
                      : 'Zero Settlement'}
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(Math.abs(preview.netAmount))}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Reason for exit, remarks..."
            />
          </div>
        </div>
      ) : null}
    </Modal>
  )
}