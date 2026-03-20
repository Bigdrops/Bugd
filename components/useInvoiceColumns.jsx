import { useState, useCallback } from 'react'

const DEFAULT_COLUMNS = [
  { key: 'description', label: 'Description', visible: true, required: true },
  { key: 'make', label: 'Make/Brand', visible: true },
  { key: 'quantity', label: 'Quantity', visible: true, required: true },
  { key: 'unit', label: 'Unit', visible: true },
  { key: 'unit_price', label: 'Unit Price', visible: true, required: true },
  { key: 'install_rate', label: 'Install Rate', visible: false },
  { key: 'vat_rate', label: 'VAT %', visible: false },
  { key: 'discount_rate', label: 'Discount %', visible: false },
  { key: 'amount', label: 'Amount', visible: true, required: true },
]

export function makeEmptyItem() {
  return {
    id: undefined,
    _uiKey: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    row_type: 'standard',
    group_id: null,
    group_name: '',
    description: '',
    sub_description: '',
    make: '',
    quantity: 1,
    unit: '',
    unit_price: 0,
    install_rate: null,
    install_rate_override: false,
    vat_rate: null,
    discount_rate: null,
    sort_order: 0,
    image_url: '',
    custom_data: {},
  }
}

export function makeEmptyGroup() {
  return {
    id: `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    showSubtotal: false,
  }
}

export function makeFieldEntry({ label = '', value = '', text = '' } = {}) {
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label,
    value,
    text,
  }
}

export function buildCalculationInputs({ invoice, discountType, discountTiming, whtType }) {
  return {
    vatPercent: invoice.vat || 0,
    discountValue: invoice.discount || 0,
    discountType: discountType || 'fixed',
    discountTiming: discountTiming || 'after',
    whtValue: invoice.wht || 0,
    whtType: whtType || 'percent',
  }
}

export function inferLegacyCalculationState({ invoice, items, customFields }) {
  // Check if any items have row-level VAT overrides
  const hasRowVat = items.some((item) => item.vat_rate != null && item.row_type === 'standard')
  const hasRowDiscount = items.some((item) => item.discount_rate != null && item.row_type === 'standard')

  return {
    useGlobalVatInput: !hasRowVat,
    useGlobalDiscountInput: !hasRowDiscount,
    vatEnabled: (invoice.vat || 0) > 0 || hasRowVat,
    discountEnabled: (invoice.discount || 0) > 0 || hasRowDiscount,
  }
}

export function useInvoiceColumns(initialColumns = DEFAULT_COLUMNS) {
  const [columns, setColumns] = useState(initialColumns)

  const isVisible = useCallback(
    (key) => columns.find((col) => col.key === key)?.visible ?? false,
    [columns],
  )

  const getColumn = useCallback(
    (key) => columns.find((col) => col.key === key),
    [columns],
  )

  const toggleVisible = useCallback((key) => {
    setColumns((current) =>
      current.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col)),
    )
  }, [])

  const updateColumn = useCallback((key, updates) => {
    setColumns((current) =>
      current.map((col) => (col.key === key ? { ...col, ...updates } : col)),
    )
  }, [])

  const addCustomColumn = useCallback((column) => {
    setColumns((current) => [...current, { ...column, visible: true }])
  }, [])

  const removeCustomColumn = useCallback((key) => {
    setColumns((current) => current.filter((col) => col.key !== key))
  }, [])

  const resetColumns = useCallback(() => {
    setColumns(DEFAULT_COLUMNS)
  }, [])

  const moveColumn = useCallback((fromIndex, toIndex) => {
    setColumns((current) => {
      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const customColumns = columns.filter(
    (col) => !DEFAULT_COLUMNS.some((def) => def.key === col.key),
  )

  return {
    columns,
    setColumns,
    isVisible,
    getColumn,
    toggleVisible,
    updateColumn,
    addCustomColumn,
    removeCustomColumn,
    resetColumns,
    moveColumn,
    customColumns,
  }
}
