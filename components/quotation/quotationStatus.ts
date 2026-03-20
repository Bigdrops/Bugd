export const QUOTATION_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
  'converted',
] as const

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number]

export function formatQuotationStatus(status: string): string {
  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    accepted: 'Accepted',
    rejected: 'Rejected',
    expired: 'Expired',
    converted: 'Converted',
  }
  return statusLabels[status] || status
}
