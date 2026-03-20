// Quotation domain types

import type { ColumnConfig, InvoiceFieldEntry, InvoiceItem } from './invoice'

export interface Quotation {
  id?: string
  quotation_number: string
  po_number?: string
  client_id?: string
  client_name?: string
  issue_date?: string
  valid_until?: string
  status?: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted'
  quotation_title?: string
  notes?: string
  terms?: string
  workmanship?: number
  transportation?: number
  shipping?: number
  discount?: number
  vat?: number
  wht?: number
  amount_in_words?: string
  custom_fields?: Record<string, unknown>
}

export interface DbQuotation {
  id: string
  quotation_number: string
  po_number?: string | null
  client_id?: string | null
  client_name?: string | null
  issue_date?: string | null
  valid_until?: string | null
  status?: string | null
  quotation_title?: string | null
  notes?: string | null
  terms?: string | null
  workmanship?: number | null
  transportation?: number | null
  shipping?: number | null
  discount?: number | null
  vat?: number | null
  wht?: number | null
  subtotal?: number | null
  install_rate_total?: number | null
  total?: number | null
  amount_in_words?: string | null
  custom_fields?: string | null
  created_at?: string
  updated_at?: string
}

export interface DbQuotationItem {
  id: string
  quotation_id: string
  row_type: string
  group_id?: string | null
  group_name?: string | null
  description?: string | null
  sub_description?: string | null
  make?: string | null
  quantity?: number | null
  unit?: string | null
  unit_price?: number | null
  install_rate?: number | null
  install_rate_override?: boolean | null
  vat_rate?: number | null
  discount_rate?: number | null
  sort_order?: number | null
  image_url?: string | null
  custom_data?: string | null
}

export function getNextQuotationNumber(existing: Array<Pick<DbQuotation, 'quotation_number'>>): string {
  const prefix = 'QUO-'
  let maxNumber = 0

  existing.forEach((row) => {
    const match = row.quotation_number?.match(/QUO-(\d+)/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNumber) maxNumber = num
    }
  })

  const nextNumber = maxNumber + 1
  return `${prefix}${String(nextNumber).padStart(4, '0')}`
}

export function buildQuotationFormState(
  quotation: DbQuotation,
  items: DbQuotationItem[],
): {
  quotation: Quotation
  items: InvoiceItem[]
  columns: ColumnConfig[]
  headerFields: InvoiceFieldEntry[]
  bottomFields: InvoiceFieldEntry[]
  discountType: 'fixed' | 'percent'
  discountTiming: 'before' | 'after'
  whtType: 'fixed' | 'percent'
  notesTitle: string
  termsTitle: string
  mergeQtyUnit: boolean
  showItemImages: boolean
} {
  let customFields: Record<string, unknown> = {}
  try {
    customFields = quotation.custom_fields ? JSON.parse(quotation.custom_fields) : {}
  } catch {
    customFields = {}
  }

  const mappedItems: InvoiceItem[] = items.map((item, index) => {
    let customData: Record<string, unknown> = {}
    try {
      customData = item.custom_data ? JSON.parse(item.custom_data) : {}
    } catch {
      customData = {}
    }

    return {
      id: item.id,
      _uiKey: `item_${item.id}_${index}`,
      row_type: (item.row_type === 'group_header' ? 'group_header' : 'standard') as 'standard' | 'group_header',
      group_id: item.group_id || null,
      group_name: item.group_name || '',
      description: item.description || '',
      sub_description: item.sub_description || '',
      make: item.make || '',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      unit_price: item.unit_price || 0,
      install_rate: item.install_rate ?? null,
      install_rate_override: item.install_rate_override ?? false,
      vat_rate: item.vat_rate ?? null,
      discount_rate: item.discount_rate ?? null,
      sort_order: item.sort_order ?? index,
      image_url: item.image_url || '',
      custom_data: customData,
    }
  })

  return {
    quotation: {
      id: quotation.id,
      quotation_number: quotation.quotation_number,
      po_number: quotation.po_number || '',
      client_id: quotation.client_id || '',
      client_name: quotation.client_name || '',
      issue_date: quotation.issue_date || '',
      valid_until: quotation.valid_until || '',
      status: (quotation.status as Quotation['status']) || 'draft',
      quotation_title: quotation.quotation_title || '',
      notes: quotation.notes || '',
      terms: quotation.terms || '',
      workmanship: quotation.workmanship || 0,
      transportation: quotation.transportation || 0,
      shipping: quotation.shipping || 0,
      discount: quotation.discount || 0,
      vat: quotation.vat || 7.5,
      wht: quotation.wht || 0,
      amount_in_words: quotation.amount_in_words || '',
      custom_fields: customFields,
    },
    items: mappedItems,
    columns: (customFields.columnConfig as ColumnConfig[]) || [],
    headerFields: (customFields.header as InvoiceFieldEntry[]) || [],
    bottomFields: (customFields.bottom as InvoiceFieldEntry[]) || [],
    discountType: (customFields.discountType as 'fixed' | 'percent') || 'fixed',
    discountTiming: (customFields.discountTiming as 'before' | 'after') || 'after',
    whtType: (customFields.whtType as 'fixed' | 'percent') || 'percent',
    notesTitle: (customFields.notesTitle as string) || 'Notes',
    termsTitle: (customFields.termsTitle as string) || 'Terms and Conditions',
    mergeQtyUnit: (customFields.mergeQtyUnit as boolean) || false,
    showItemImages: (customFields.showItemImages as boolean) || false,
  }
}
