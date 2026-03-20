// Invoice domain types - these should match your existing data model

export interface ColumnConfig {
  key: string
  label: string
  visible: boolean
  type?: 'text' | 'number'
  required?: boolean
}

export interface InvoiceFieldEntry {
  id: string
  label?: string
  value?: string
  text?: string
}

export interface InvoiceItem {
  id?: string
  _uiKey?: string
  row_type: 'standard' | 'group_header'
  group_id: string | null
  group_name: string
  description: string
  sub_description?: string
  make?: string
  quantity: number
  unit?: string
  unit_price: number
  install_rate?: number | null
  install_rate_override?: boolean
  vat_rate?: number | null
  discount_rate?: number | null
  sort_order: number
  image_url?: string
  custom_data?: Record<string, unknown>
}

export interface Invoice {
  id?: string
  invoice_number?: string
  po_number?: string
  client_id?: string
  client_name?: string
  issue_date?: string
  due_date?: string
  status?: string
  invoice_title?: string
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

export function toDbItem(item: InvoiceItem, documentId: string, sortOrder: number): Record<string, unknown> {
  return {
    invoice_id: documentId,
    row_type: item.row_type,
    group_id: item.group_id,
    group_name: item.group_name,
    description: item.description,
    sub_description: item.sub_description || null,
    make: item.make || null,
    quantity: item.quantity,
    unit: item.unit || null,
    unit_price: item.unit_price,
    install_rate: item.install_rate ?? null,
    install_rate_override: item.install_rate_override ?? false,
    vat_rate: item.vat_rate ?? null,
    discount_rate: item.discount_rate ?? null,
    sort_order: sortOrder,
    image_url: item.image_url || null,
    custom_data: item.custom_data ? JSON.stringify(item.custom_data) : null,
  }
}
