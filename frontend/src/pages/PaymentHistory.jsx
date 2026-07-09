import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CreditCard, FileText, RotateCcw } from 'lucide-react'
import api from '../api/axios'
import { getApiErrorMessage } from '../api/errors'
import { formatDateTime, localizedClass } from '../utils/classUi'
import { useTranslation } from '../utils/i18n'

export default function PaymentHistory() {
  const [searchParams] = useSearchParams()
  const pendingId = searchParams.get('pending')
  const qc = useQueryClient()
  const { language, t } = useTranslation()

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
        <span className="eyebrow">{t('payments')}</span>
        <h1>{t('paymentsTitle')}</h1>
        <p>{t('paymentsDescription')}</p>
      </section>

      {pendingId && (
        <div className="page-card payment-banner">
          <div>
            <span className="eyebrow">{t('sandboxCheckout')}</span>
            <h2>{t('completeDemoPayment')}</h2>
            <p className="muted">{t('sandboxHint')}</p>
          </div>
          <button className="button button-primary" disabled={completePayment.isPending} onClick={() => completePayment.mutate(pendingId)}>
            <CheckCircle2 size={18} /> {completePayment.isPending ? t('completing') : t('markPaid')}
          </button>
        </div>
      )}

      {isError && <div className="alert alert-error">{getApiErrorMessage(error, t('couldNotLoadPayments'))}</div>}
      {completePayment.isError && <div className="alert alert-error">{getApiErrorMessage(completePayment.error, t('couldNotCompletePayment'))}</div>}
      {completePayment.isSuccess && <div className="alert alert-success">{t('paymentCompleted')}</div>}

      {data.length === 0 ? (
        <div className="empty-state empty-state-action">
          <CreditCard size={24} />
          <strong>{t('noTransactions')}</strong>
          <span>{t('paymentEmptyHint')}</span>
          <Link className="button button-dark" to="/classes">{t('browseClasses')}</Link>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>{t('classColumn')}</th>
                <th>{t('amount')}</th>
                <th>{t('status')}</th>
                <th>{t('created')}</th>
                <th>{t('invoice')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.class ? localizedClass(item.class, language).title : t('deletedClass')}</strong>
                    <span>{item.providerRef}</span>
                  </td>
                  <td><strong>{Number(item.amount).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {item.currency}</strong></td>
                  <td><span className={item.status === 'paid' ? 'status-badge success' : 'status-badge'}>{item.status}</span></td>
                  <td><strong>{formatDateTime(item.createdAt)}</strong></td>
                  <td>
                    {item.invoice ? (
                      <button className="button button-secondary button-small" type="button" onClick={() => openInvoice(item.invoice._id)}>
                        <FileText size={16} /> PDF
                      </button>
                    ) : item.status === 'pending' ? (
                      <button className="button button-secondary button-small" disabled={completePayment.isPending} onClick={() => completePayment.mutate(item._id)}>
                        <RotateCcw size={16} /> {t('complete')}
                      </button>
                    ) : (
                      <span className="muted">{t('notAvailable')}</span>
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
