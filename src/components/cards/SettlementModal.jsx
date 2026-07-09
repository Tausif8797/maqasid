import { useState, useEffect } from 'react'
import { FiAlertTriangle, FiCheck, FiX } from 'react-icons/fi'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { settlementApi } from '../../api/settlementApi.js'
import { formatCurrency } from '../../utils/format.js'

/** Settlement modal for member exit processing. */
export default function SettlementModal({ open, onClose, member, onSettled }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [settlementData, setSettlementData] = useState(null)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && member && member.id) {
      fetchSettlementPreview()
    }
  }, [open, member?.id])

  const fetchSettlementPreview = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await settlementApi.preview(member.id)
      setSettlementData(data)
      setPayoutAmount(String(data.suggestedPayout))
    } catch (err) {
      setError(err.message || 'Failed to load settlement preview')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!payoutAmount || Number(payoutAmount) < 0) {
      setError('Please enter a valid payout amount')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const result = await settlementApi.execute(member.id, {
        payoutAmount: Number(payoutAmount),
      })
      onSettled?.(result)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to process settlement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSettlementData(null)
    setPayoutAmount('')
    setError('')
    setLoading(false)
    setSubmitting(false)
    onClose()
  }

  if (!open || !member) return null

  const hasActiveLoans = settlementData?.hasActiveLoans
  const canSettle = !hasActiveLoans

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Process Exit & Settlement"
      size="sm"
      footer={
        canSettle ? (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || loading}>
              {submitting ? 'Processing...' : 'Process Settlement'}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        )
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : hasActiveLoans ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <FiX className="h-5 w-5 flex-shrink-0 text-red-600" />
            <p className="text-sm font-medium text-red-900">
              Cannot Process Settlement
            </p>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-900">Active Loans Found:</p>
            <ul className="mt-2 list-inside list-disc text-sm text-red-700">
              {settlementData.activeLoans?.map((loan, idx) => (
                <li key={idx}>
                  Loan #{loan.loanNumber}: {formatCurrency(loan.remaining)} remaining
                  <span className="text-xs text-red-600"> (Due: {loan.dueDate})</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-red-700">
              Please close all active loans before processing settlement.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose()
                window.location.href = `/admin/members/${member.id}`
              }}
            >
              View Member Details
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <FiCheck className="h-5 w-5 flex-shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-900">
              No Active Loans - Ready for Settlement
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Member Information</h3>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-slate-600">
                <span className="font-medium">Name:</span> {member.name}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Email:</span> {member.email}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Mobile:</span> {member.mobile}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Financial Summary</h3>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Contributions:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(settlementData?.totalContributions || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Active Loans:</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(settlementData?.activeLoans || 0)}
                </span>
              </div>
              <div className="border-t border-slate-300 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-900">Suggested Payout:</span>
                  <span className="font-bold text-brand-600">
                    {formatCurrency(settlementData?.suggestedPayout || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Payout Amount (₹)
            </label>
            <input
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Enter payout amount"
              min="0"
              max={settlementData?.totalContributions || 0}
            />
            <p className="mt-1 text-xs text-slate-500">
              Maximum: {formatCurrency(settlementData?.totalContributions || 0)}
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <FiAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Important:</p>
                <ul className="mt-1 list-inside list-disc space-y-1">
                  <li>This action cannot be undone</li>
                  <li>Member will no longer be able to login</li>
                  <li>All historical data will be preserved</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}