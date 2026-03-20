// Calculation engine for quotations/invoices

import type { InvoiceItem } from '@/domain/invoice'

export interface CalculationInputs {
  vatPercent: number
  discountValue: number
  discountType: 'fixed' | 'percent'
  discountTiming: 'before' | 'after'
  whtValue: number
  whtType: 'fixed' | 'percent'
}

export interface ItemCalculation {
  line_subtotal: number
  vat: number
  discount: number
  net: number
}

export interface GroupCalculation {
  group_id: string
  subtotal: number
  vat: number
  discount: number
}

export interface DocumentTotals {
  subtotal: number
  installRateTotal: number
  vat: number
  discount: number
  wht: number
  totalPayable: number
  items: ItemCalculation[]
  groups: GroupCalculation[]
}

export function computeDocument({
  items,
  document,
  cf,
}: {
  items: InvoiceItem[]
  document: {
    workmanship?: number
    transportation?: number
    shipping?: number
    vat?: number
    discount?: number
    wht?: number
  }
  cf: {
    calculationInputs: CalculationInputs
  }
}): DocumentTotals {
  const { calculationInputs } = cf
  const { vatPercent, discountValue, discountType, discountTiming, whtValue, whtType } = calculationInputs

  let subtotal = 0
  let installRateTotal = 0
  const itemCalculations: ItemCalculation[] = []
  const groupTotals = new Map<string, { subtotal: number; vat: number; discount: number }>()

  // Calculate line items
  items.forEach((item) => {
    if (item.row_type === 'group_header') {
      itemCalculations.push({ line_subtotal: 0, vat: 0, discount: 0, net: 0 })
      return
    }

    const lineSubtotal = (item.quantity || 0) * (item.unit_price || 0)
    const lineInstallRate = item.install_rate_override && item.install_rate
      ? (item.quantity || 0) * item.install_rate
      : 0

    subtotal += lineSubtotal
    installRateTotal += lineInstallRate

    const itemVatRate = item.vat_rate ?? vatPercent
    const lineVat = lineSubtotal * (itemVatRate / 100)

    const itemDiscountRate = item.discount_rate ?? 0
    const lineDiscount = lineSubtotal * (itemDiscountRate / 100)

    const net = lineSubtotal + lineVat - lineDiscount

    itemCalculations.push({
      line_subtotal: lineSubtotal,
      vat: lineVat,
      discount: lineDiscount,
      net,
    })

    // Aggregate group totals
    if (item.group_id) {
      const existing = groupTotals.get(item.group_id) || { subtotal: 0, vat: 0, discount: 0 }
      groupTotals.set(item.group_id, {
        subtotal: existing.subtotal + lineSubtotal,
        vat: existing.vat + lineVat,
        discount: existing.discount + lineDiscount,
      })
    }
  })

  // Add additional costs
  const additionalCosts = (document.workmanship || 0) + (document.transportation || 0) + (document.shipping || 0)
  subtotal += additionalCosts

  // Calculate document-level VAT
  const documentVat = subtotal * (vatPercent / 100)

  // Calculate document-level discount
  let documentDiscount = 0
  if (discountType === 'fixed') {
    documentDiscount = discountValue
  } else {
    const baseForDiscount = discountTiming === 'before' ? subtotal : subtotal + documentVat
    documentDiscount = baseForDiscount * (discountValue / 100)
  }

  // Calculate WHT
  let whtAmount = 0
  if (whtType === 'fixed') {
    whtAmount = whtValue
  } else {
    whtAmount = subtotal * (whtValue / 100)
  }

  // Calculate total
  const totalPayable = subtotal + documentVat + installRateTotal - documentDiscount - whtAmount

  return {
    subtotal,
    installRateTotal,
    vat: documentVat,
    discount: documentDiscount,
    wht: whtAmount,
    totalPayable: Math.max(0, totalPayable),
    items: itemCalculations,
    groups: Array.from(groupTotals.entries()).map(([group_id, totals]) => ({
      group_id,
      ...totals,
    })),
  }
}
