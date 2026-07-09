import { useState, useEffect, useCallback } from 'react'
import { FiDollarSign, FiRefreshCw } from 'react-icons/fi'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Card, { CardBody } from '../../components/ui/Card.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { settlementApi } from '../../api/settlementApi.js'
import { formatCurrency, formatDate } from '../../utils/format.js'

/** Admin settlements list page - simplified view. */
export default function Settlements() {
  const [settlements, setSettlements] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const fetchSettlements = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await settlementApi.list({ page, limit: 20 })
      setSettlements(result.settlements || [])
      setPagination(result.pagination)
    } catch (err) {
      setError(err.message || 'Failed to load settlements')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchSettlements()
  }, [fetchSettlements])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settlements"
        description="Member exit settlements"
        icon={<FiDollarSign className="h-6 w-6 text-brand-600" />}
      >
        <Button variant="outline" size="sm" onClick={fetchSettlements} aria-label="Refresh">
          <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      <Card>
        <CardBody className="p-0">
          {error && (
            <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : settlements.length === 0 ? (
            <EmptyState title="No settlements yet" message="Settled members will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Member</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-700">Contributions</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-700">Loan</th>
                    <th className="px-5 py-3 text-right font-semibold text-slate-700">Payout</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Settled At</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-700">Settled By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">{s.member?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">{s.member?.email}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-green-600">
                        {formatCurrency(s.totalContributions)}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-red-600">
                        {formatCurrency(s.activeLoans)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-800">
                        {formatCurrency(s.payoutAmount)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(s.settledAt)}</td>
                      <td className="px-5 py-4 text-slate-600">{s.settledBy?.name || 'Unknown'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {!loading && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{pagination.total} total</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span>Page {pagination.page} of {pagination.pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}