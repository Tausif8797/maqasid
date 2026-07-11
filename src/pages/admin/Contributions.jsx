import { useMemo, useState, useEffect, useCallback } from 'react'
import { FiSearch, FiCheck, FiX, FiDollarSign, FiRefreshCw, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Card, { CardBody } from '../../components/ui/Card.jsx'
import Input from '../../components/ui/Input.jsx'
import Select from '../../components/ui/Select.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Table, { THead, TBody, TR, TH, TD } from '../../components/ui/Table.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import StatCard from '../../components/cards/StatCard.jsx'
import { useData } from '../../hooks/useData.js'
import { useSettings } from '../../hooks/useSettings.js'
import { contributionApi } from '../../api/contributionApi.js'
import { formatCurrency, formatDate, getInitials } from '../../utils/format.js'

/**
 * Admin contribution management with month selection.
 * Supports viewing and managing contributions for any month (past, current, or future).
 */
export default function Contributions() {
  const {
    selectedMonth,
    setSelectedMonth,
    selectedMonthContributions,
    members,
    contributions,
    setContributions,
    currentMonthStr,
  } = useData()
  const { monthlyAmount } = useSettings()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [generating, setGenerating] = useState(false)
  const [generateMessage, setGenerateMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmState, setConfirmState] = useState({
    open: false,
    row: null,
    newStatus: null,
    blocked: false,
  })
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return selectedMonthContributions.filter((row) => {
      const matchesQuery =
        !q ||
        row.member.name.toLowerCase().includes(q) ||
        row.member.mobile.includes(q)
      const matchesFilter = filter === 'all' || row.status === filter
      return matchesQuery && matchesFilter
    })
  }, [selectedMonthContributions, query, filter])

  const paidCount = selectedMonthContributions.filter(
    (r) => r.status === 'paid',
  ).length
  const unpaidCount = selectedMonthContributions.length - paidCount
  const collected = paidCount * monthlyAmount

  // Navigate to previous/next month
  const navigateMonth = useCallback((direction) => {
    setSelectedMonth((prev) => {
      if (!prev) return prev
      const [y, m] = prev.split('-').map(Number)
      const date = new Date(y, m - 1 + direction, 1)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    })
  }, [setSelectedMonth])

  // Build a label for the selected month
  const monthLabel = useMemo(() => {
    if (!selectedMonth) return ''
    const [year, month] = selectedMonth.split('-')
    return new Date(`${year}-${month}-01`).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    })
  }, [selectedMonth])

  const isCurrentMonth = selectedMonth === currentMonthStr

  const toggleSelection = (memberId) => {
    setSelectedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    )
  }

  const toggleSelectAll = () => {
    const memberIds = rows.map(row => row.member.id || row.member._id)
    const allSelected = memberIds.length > 0 &&
      memberIds.every(id => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(memberIds)
    }
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  const handleBulkAction = async (newStatus) => {
    if (selectedIds.length === 0) return

    setBulkActionLoading(true)
    setErrorMessage('')
    try {
      const selectedRows = rows.filter((row) => {
        const memberId = row.member.id || row.member._id
        return selectedIds.includes(memberId)
      })

      const inactiveMembers = selectedRows.filter((row) => row.member.status === 'inactive')
      if (inactiveMembers.length > 0) {
        setErrorMessage(
          `${inactiveMembers.length} inactive member(s) cannot be updated. Please deselect them.`,
        )
        setBulkActionLoading(false)
        return
      }

      const missingContribution = selectedRows.some((row) => !row.contribution?.id)
      if (missingContribution) {
        if (!selectedMonth) return
        await contributionApi.generate(selectedMonth)
      }

      if (!selectedMonth) return
      const data = await contributionApi.list({ month: selectedMonth, limit: 100 })
      const fresh = data.contributions || []
      setContributions(fresh)

      const contribByMember = new Map(fresh.map((c) => [String(c.memberId), c.id]))

      const contributionIds = selectedRows
        .map((row) => {
          const memberId = row.member.id || row.member._id
          return row.contribution?.id || contribByMember.get(String(memberId))
        })
        .filter(Boolean)

      if (contributionIds.length === 0) {
        setErrorMessage('No contribution records available to update.')
        setBulkActionLoading(false)
        return
      }

      const result = await contributionApi.bulkUpdate(contributionIds, newStatus)

      const refreshed = await contributionApi.list({ month: selectedMonth, limit: 100 })
      setContributions(refreshed.contributions || [])

      setSelectedIds([])

      const updated = result.updated ?? contributionIds.length
      const failed = result.failed ?? 0

      if (failed > 0) {
        setGenerateMessage(`Updated ${updated} contribution(s) (${failed} failed)`)
      } else {
        setGenerateMessage(`Successfully updated ${updated} contribution(s) to ${newStatus}`)
      }
      setTimeout(() => setGenerateMessage(''), 5000)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update contributions')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const toggle = async (row, forcedStatus = null) => {
    setErrorMessage('')

    if (row.member.status === 'inactive') {
      setConfirmState({
        open: true,
        row,
        newStatus: null,
        blocked: true,
      })
      setErrorMessage('Inactive members cannot be marked as paid or unpaid.')
      return
    }

    const newStatus = forcedStatus || (row.status === 'paid' ? 'unpaid' : 'paid')

    if (!row.contribution) {
      setErrorMessage(`Contribution not generated for ${row.member.name}. Please click "Generate Monthly Contributions" button first.`)
      return
    }

    try {
      await contributionApi.updateStatus(row.contribution.id, newStatus)
      setContributions((prev) =>
        prev.map((c) =>
          c.id === row.contribution.id
            ? {
                ...c,
                status: newStatus,
                paymentDate: newStatus === 'paid' ? new Date().toISOString().slice(0, 10) : null,
              }
            : c,
        ),
      )
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update contribution status')
    }
  }

  const requestToggle = (row) => {
    if (row.member.status === 'inactive') {
      setErrorMessage('Inactive members cannot be marked as paid or unpaid.')
    } else {
      setErrorMessage('')
    }

    const newStatus = row.status === 'paid' ? 'unpaid' : 'paid'
    setConfirmState({
      open: true,
      row,
      newStatus,
      blocked: row.member.status === 'inactive',
    })
  }

  const closeConfirm = () => {
    setConfirmState({ open: false, row: null, newStatus: null, blocked: false })
  }

  const confirmToggle = async () => {
    if (!confirmState.row || !confirmState.newStatus) return closeConfirm()
    const row = confirmState.row
    const newStatus = confirmState.newStatus
    closeConfirm()
    await toggle(row, newStatus)
  }

  const handleGenerate = async () => {
    if (!selectedMonth) return
    setGenerating(true)
    setGenerateMessage('')
    try {
      const result = await contributionApi.generate(selectedMonth)
      const data = await contributionApi.list({ month: selectedMonth, limit: 100 })
      setContributions(data.contributions || [])
      setGenerateMessage(result.message || 'Contributions generated successfully')
      setTimeout(() => setGenerateMessage(''), 5000)
    } catch {
      // Error handled by API client
    } finally {
      setGenerating(false)
    }
  }

  const allMemberIds = rows.map(row => row.member.id || row.member._id)
  const isAllSelected = allMemberIds.length > 0 && selectedIds.length === allMemberIds.length
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < allMemberIds.length

  return (
    <div>
      <PageHeader
        title="Contribution Management"
        description={`Track monthly contributions for ${monthLabel || 'selected month'}.`}
      />

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Month Selector */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                icon={FiChevronLeft}
                onClick={() => navigateMonth(-1)}
              >
                Previous
              </Button>
              <span className="min-w-[180px] text-center text-lg font-semibold text-slate-800">
                {monthLabel}
              </span>
              <Button
                variant="outline"
                size="sm"
                icon={FiChevronRight}
                onClick={() => navigateMonth(1)}
                disabled={isCurrentMonth}
              >
                Next
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={`Collected in ${monthLabel}`}
          value={formatCurrency(collected)}
          icon={FiDollarSign}
          tone="green"
        />
        <StatCard
          label="Paid Members"
          value={paidCount}
          icon={FiCheck}
          tone="brand"
        />
        <StatCard
          label="Pending Members"
          value={unpaidCount}
          icon={FiX}
          tone="amber"
        />
      </div>

      <div className="mb-6">
        <Button
          icon={FiRefreshCw}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Generating...' : `Generate for ${monthLabel}`}
        </Button>
        <p className="mt-2 text-xs text-slate-500">
          This creates contribution records for all active members for {monthLabel}.
        </p>
        {generateMessage && (
          <div className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            {generateMessage}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <Card className="mb-4 border-brand-200 bg-brand-50">
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-brand-900">
                  {selectedIds.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  icon={FiTrash2}
                >
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="success"
                  icon={FiCheck}
                  onClick={() => handleBulkAction('paid')}
                  disabled={bulkActionLoading}
                >
                  {bulkActionLoading ? 'Updating...' : 'Mark as Paid'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={FiX}
                  onClick={() => handleBulkAction('unpaid')}
                  disabled={bulkActionLoading}
                >
                  Mark as Unpaid
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              name="search"
              icon={FiSearch}
              placeholder="Search by name or mobile"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Select
              name="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="sm:w-44"
              options={[
                { value: 'all', label: 'All' },
                { value: 'paid', label: 'Paid' },
                { value: 'unpaid', label: 'Unpaid' },
              ]}
            />
          </div>
        </CardBody>

        {rows.length === 0 ? (
          <EmptyState title="No members match your filters" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate
                    }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </TH>
                <TH>Member Name</TH>
                <TH>Status ({monthLabel})</TH>
                <TH>Paid Date</TH>
                <TH className="text-right">Action</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => {
                const memberId = row.member.id || row.member._id
                const isSelected = selectedIds.includes(memberId)
                const isInactive = row.member.status === 'inactive'

                return (
                  <TR key={row.member.id || row.member._id}>
                    <TD>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(memberId)}
                        disabled={isInactive}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                      />
                    </TD>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: row.member.avatarColor || '#3563ff' }}
                        >
                          {getInitials(row.member.name)}
                        </span>
                        <div>
                          <p className="font-medium text-slate-800">
                            {row.member.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {row.member.mobile}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge>{row.status}</Badge>
                    </TD>
                    <TD>{formatDate(row.contribution?.paymentDate)}</TD>
                    <TD className="text-right">
                      {row.status === 'paid' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={FiX}
                          onClick={() => requestToggle(row)}
                        >
                          Mark Unpaid
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="success"
                          icon={FiCheck}
                          onClick={() => requestToggle(row)}
                        >
                          Mark as Paid
                        </Button>
                      )}
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={confirmState.open}
        onClose={closeConfirm}
        title={confirmState.blocked ? 'Action Blocked' : 'Confirm Contribution Update'}
        size="sm"
        footer={
          confirmState.blocked ? (
            <Button variant="secondary" onClick={closeConfirm}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeConfirm}>
                Cancel
              </Button>
              <Button onClick={confirmToggle}>Confirm</Button>
            </>
          )
        }
      >
        {confirmState.blocked ? (
          <p className="text-sm text-slate-600">
            {confirmState.row?.member?.name} is inactive and cannot be marked as paid or unpaid.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Mark contribution for {confirmState.row?.member?.name} as{' '}
            <span className="font-semibold text-slate-800">{confirmState.newStatus}</span>?
          </p>
        )}
      </Modal>
    </div>
  )
}