import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CreditCard, FileText, RotateCcw } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { formatDateTime } from '../utils/classUi'

export default function PaymentHistory() {
  const [searchParams] = useSearchParams()
  const pendingId = searchParams.get('pending')
  const qc = useQueryClient()

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ['payments', 'my'],
    queryFn: () => api.get('/payments/my').then((r) => r.data)
  })

  const completePayment = useMutation({
    mutationFn: (id) => api.post(`/payments/${id}/simulate-success`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', 'my'] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
      qc.invalidateQueries({ queryKey: ['classes'], exact: false, refetchType: 'all' })
    }
  })

  async function openInvoice(invoiceId) {
    const response = await api.get(`/payments/invoices/${invoiceId}.pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  if (isLoading) return <div className="page-card skeleton-card tall" />

  return (
    <div className="stack">
      <section className="section-heading">
        <span className="eyebrow">Payments</span>
        <h1>Transaction History</h1>
        <p>Review class payments and download invoice PDFs after successful payment.</p>
      </section>

      {pendingId && (
        <div className="page-card payment-banner">
          <div>
            <span className="eyebrow">Sandbox checkout</span>
            <h2>Complete demo payment</h2>
            <p className="muted">VNPay credentials are not configured, so this dev checkout can mark the transaction as paid.</p>
          </div>
          <button className="button button-primary" disabled={completePayment.isPending} onClick={() => completePayment.mutate(pendingId)}>
            <CheckCircle2 size={18} /> {completePayment.isPending ? 'Completing...' : 'Mark Paid'}
          </button>
        </div>
      )}

      {isError && <div className="alert alert-error">{getApiErrorMessage(error, 'Could not load payments')}</div>}
      {completePayment.isError && <div className="alert alert-error">{getApiErrorMessage(completePayment.error, 'Could not complete payment')}</div>}
      {completePayment.isSuccess && <div className="alert alert-success">Payment completed and invoice generated.</div>}

      {data.length === 0 ? (
        <div className="empty-state empty-state-action">
          <CreditCard size={24} />
          <strong>No transactions yet</strong>
          <span>Pay for a class with VNPay and your payment history will appear here.</span>
          <Link className="button button-dark" to="/classes">Browse Classes</Link>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.class?.title || 'Deleted class'}</strong>
                    <span>{item.providerRef}</span>
                  </td>
                  <td><strong>{Number(item.amount).toLocaleString('vi-VN')} {item.currency}</strong></td>
                  <td><span className={item.status === 'paid' ? 'status-badge success' : 'status-badge'}>{item.status}</span></td>
                  <td><strong>{formatDateTime(item.createdAt)}</strong></td>
                  <td>
                    {item.invoice ? (
                      <button className="button button-secondary button-small" type="button" onClick={() => openInvoice(item.invoice._id)}>
                        <FileText size={16} /> PDF
                      </button>
                    ) : item.status === 'pending' ? (
                      <button className="button button-secondary button-small" disabled={completePayment.isPending} onClick={() => completePayment.mutate(item._id)}>
                        <RotateCcw size={16} /> Complete
                      </button>
                    ) : (
                      <span className="muted">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
