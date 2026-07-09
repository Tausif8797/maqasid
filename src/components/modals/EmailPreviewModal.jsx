import { useState, useEffect } from 'react'

export default function EmailPreviewModal({ isOpen, onClose, onConfirm, memberId, memberName, memberEmail }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && memberId) {
      fetchPreview()
    }
  }, [isOpen, memberId])

  const fetchPreview = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('Fetching preview for memberId:', memberId)
      const { memberApi } = await import('../../api/memberApi.js')
      const result = await memberApi.previewContributionReminder(memberId)
      console.log('Preview result:', result)
      
      if (!result) {
        setError('No response from server')
        return
      }
      
      if (result.success && result.data) {
        setPreview(result.data.preview)
      } else if (result.success) {
        setPreview(result.preview)
      } else {
        setError(result.message || 'Failed to load email preview')
      }
    } catch (err) {
      console.error('Preview error details:', err)
      console.error('Error status:', err.status)
      console.error('Error message:', err.message)
      setError(`Error (${err.status || 'unknown'}): ${err.message || 'Failed to load email preview'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setSending(true)
    try {
      const { memberApi } = await import('../../api/memberApi.js')
      const result = await memberApi.sendContributionReminder(memberId)
      if (result.success) {
        onConfirm(result)
      } else {
        setError(result.message || 'Failed to send email')
      }
    } catch (err) {
      setError('Failed to send email')
      console.error('Send error:', err)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Email Preview</h2>
            <p className="text-sm text-slate-500">
              Sending to: <span className="font-medium">{memberEmail}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(90vh-180px)] overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {!loading && preview && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="mb-2">
                  <span className="text-xs font-semibold text-slate-500">TO:</span>
                  <span className="ml-2 text-sm text-slate-700">{preview.to}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500">SUBJECT:</span>
                  <span className="ml-2 text-sm font-medium text-slate-800">{preview.subject}</span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
                  <span className="text-xs font-semibold text-slate-600">EMAIL CONTENT</span>
                </div>
                <div
                  className="max-h-[500px] overflow-y-auto p-4"
                  dangerouslySetInnerHTML={{ __html: preview.html }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            disabled={sending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={sending || loading || !preview}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Sending...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
