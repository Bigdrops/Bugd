import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface TotalsPanelProps {
  totals: {
    subtotal: number
    installRateTotal: number
    vat: number
    discount: number
    wht: number
    totalPayable: number
  }
  quotation: {
    vat: number
    discount: number
    wht: number
  }
  discountType: 'fixed' | 'percent'
  discountTiming: 'before' | 'after'
  whtType: 'fixed' | 'percent'
  mergeQtyUnit: boolean
  showItemImages: boolean
  useGlobalVatInput: boolean
  useGlobalDiscountInput: boolean
  onUpdateQuotation: <K extends string>(field: K, value: unknown) => void
  onSetDiscountType: (value: 'fixed' | 'percent') => void
  onSetDiscountTiming: (value: 'before' | 'after') => void
  onSetWhtType: (value: 'fixed' | 'percent') => void
  onSetMergeQtyUnit: (value: boolean) => void
  onSetShowItemImages: (value: boolean) => void
}

export default function TotalsPanel({
  totals,
  quotation,
  discountType,
  discountTiming,
  whtType,
  mergeQtyUnit,
  showItemImages,
  useGlobalVatInput,
  useGlobalDiscountInput,
  onUpdateQuotation,
  onSetDiscountType,
  onSetDiscountTiming,
  onSetWhtType,
  onSetMergeQtyUnit,
  onSetShowItemImages,
}: TotalsPanelProps) {
  const formatCurrency = (value: number) => `₦${Number(value || 0).toLocaleString()}`

  return (
    <div className="space-y-3">
      {/* Main Totals */}
      <div className="border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-3 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Totals
          </h3>
        </div>
        <div className="divide-y divide-border text-sm">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.installRateTotal > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-muted-foreground">Install Rate</span>
              <span className="font-medium">{formatCurrency(totals.installRateTotal)}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-muted-foreground">VAT</span>
            <span className="font-medium text-emerald-600">+{formatCurrency(totals.vat)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium text-red-600">-{formatCurrency(totals.discount)}</span>
            </div>
          )}
          {totals.wht > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-muted-foreground">WHT</span>
              <span className="font-medium text-amber-600">-{formatCurrency(totals.wht)}</span>
            </div>
          )}
          <div className="flex items-center justify-between bg-primary/5 px-3 py-2">
            <span className="font-semibold text-foreground">Total Payable</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(totals.totalPayable)}</span>
          </div>
        </div>
      </div>

      {/* Tax & Discount Settings */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between border border-border bg-card px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-muted/30"
          >
            Tax & Discount Settings
            <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]_&]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 border border-t-0 border-border bg-card p-3">
            {/* VAT */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Global VAT %
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={quotation.vat || 0}
                  onChange={(e) => onUpdateQuotation('vat', Number(e.target.value))}
                  className="h-7 text-sm"
                  disabled={!useGlobalVatInput}
                />
                {!useGlobalVatInput && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Using row-level VAT</p>
                )}
              </div>
              <div>
                <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  WHT
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={quotation.wht || 0}
                  onChange={(e) => onUpdateQuotation('wht', Number(e.target.value))}
                  className="h-7 text-sm"
                />
              </div>
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Discount
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={quotation.discount || 0}
                  onChange={(e) => onUpdateQuotation('discount', Number(e.target.value))}
                  className="h-7 text-sm"
                  disabled={!useGlobalDiscountInput}
                />
                {!useGlobalDiscountInput && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Using row-level discount</p>
                )}
              </div>
              <div>
                <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Discount Type
                </Label>
                <Select value={discountType} onValueChange={onSetDiscountType}>
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="percent">Percent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timing & WHT Type */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Discount Timing
                </Label>
                <Select value={discountTiming} onValueChange={onSetDiscountTiming}>
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="after">After Tax</SelectItem>
                    <SelectItem value="before">Before Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  WHT Type
                </Label>
                <Select value={whtType} onValueChange={onSetWhtType}>
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Output Settings */}
      <div className="border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-3 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Output Settings
          </h3>
        </div>
        <div className="divide-y divide-border">
          <label className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted/30">
            <div>
              <p className="text-sm font-medium text-foreground">Merge Qty + Unit</p>
              <p className="text-[11px] text-muted-foreground">Combine in generated output</p>
            </div>
            <Switch checked={mergeQtyUnit} onCheckedChange={onSetMergeQtyUnit} />
          </label>
          <label className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted/30">
            <div>
              <p className="text-sm font-medium text-foreground">Show Item Images</p>
              <p className="text-[11px] text-muted-foreground">Include in document output</p>
            </div>
            <Switch checked={showItemImages} onCheckedChange={onSetShowItemImages} />
          </label>
        </div>
      </div>
    </div>
  )
}
