import { X, GripVertical, Plus, RotateCcw } from 'lucide-react'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { ColumnConfig } from '@/domain/invoice'

interface ColumnManagerProps {
  columns: ColumnConfig[]
  onUpdate: (key: string, updates: Partial<ColumnConfig>) => void
  onToggle: (key: string) => void
  onAddCustom: (column: ColumnConfig) => void
  onRemoveCustom: (key: string) => void
  onReset: () => void
  onMove: (fromIndex: number, toIndex: number) => void
  onClose: () => void
  vat: number
  setVat: (value: number) => void
  wht: number
  setWht: (value: number) => void
  whtType: 'fixed' | 'percent'
  setWhtType: (value: 'fixed' | 'percent') => void
}

export default function ColumnManager({
  columns,
  onUpdate,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  onReset,
  onMove,
  onClose,
  vat,
  setVat,
  wht,
  setWht,
  whtType,
  setWhtType,
}: ColumnManagerProps) {
  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full max-w-sm overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-sm font-semibold">Table & Tax Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Column Visibility */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Column Visibility
            </h3>
            <div className="space-y-2">
              {columns.map((column) => (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center justify-between rounded border border-border px-3 py-2"
                >
                  <span className="text-sm">{column.label}</span>
                  <Switch
                    checked={column.visible}
                    onCheckedChange={() => onToggle(column.key)}
                    disabled={column.required}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Tax Settings */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tax Defaults
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Default VAT %
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={vat}
                  onChange={(e) => setVat(Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  WHT
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={wht}
                  onChange={(e) => setWht(Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="mt-2">
              <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                WHT Type
              </Label>
              <Select value={whtType} onValueChange={setWhtType}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              onClick={onReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button type="button" size="sm" className="flex-1" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
