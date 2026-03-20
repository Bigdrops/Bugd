import { MoreHorizontal, GripVertical, ImagePlus, Trash2, ChevronUp, ChevronDown, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import UnitInput from '@/components/UnitInput'
import type { ColumnConfig, InvoiceItem } from '@/domain/invoice'

interface CompactItemRowProps {
  item: InvoiceItem
  index: number
  number: number
  computedAmount: number
  isVisible: (key: string) => boolean
  getColumn: (key: string) => ColumnConfig | undefined
  customColumns: ColumnConfig[]
  showItemImages: boolean
  isFirst?: boolean
  isLast?: boolean
  isGrouped?: boolean
  onUpdate: (index: number, field: string, value: unknown) => void
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onInsertBelow?: () => void
  onImageUpload?: (index: number) => void
}

export default function CompactItemRow({
  item,
  index,
  number,
  computedAmount,
  isVisible,
  customColumns,
  showItemImages,
  isFirst,
  isLast,
  isGrouped,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInsertBelow,
  onImageUpload,
}: CompactItemRowProps) {
  return (
    <div
      className={`group/row border-b border-border bg-card transition-colors hover:bg-muted/30 ${
        isGrouped ? 'border-l-2 border-l-primary/20 ml-3' : ''
      }`}
    >
      {/* Row Header - Description + Actions */}
      <div className="flex items-start gap-2 px-2.5 py-2">
        <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-medium text-muted-foreground">
          {number}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <Input
            value={item.description || ''}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
            placeholder="Item description"
            className="h-7 border-0 bg-transparent px-0 text-sm font-medium shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
          />
          <Input
            value={item.sub_description || ''}
            onChange={(e) => onUpdate(index, 'sub_description', e.target.value)}
            placeholder="Additional details..."
            className="h-6 border-0 bg-transparent px-0 text-xs text-muted-foreground shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
          />
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {showItemImages && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground/60 hover:text-foreground"
              onClick={() => onImageUpload?.(index)}
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground/60 opacity-0 transition-opacity group-hover/row:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {!isFirst && (
                <DropdownMenuItem onClick={() => onMoveUp(index)}>
                  <ChevronUp className="mr-2 h-3.5 w-3.5" />
                  Move up
                </DropdownMenuItem>
              )}
              {!isLast && (
                <DropdownMenuItem onClick={() => onMoveDown(index)}>
                  <ChevronDown className="mr-2 h-3.5 w-3.5" />
                  Move down
                </DropdownMenuItem>
              )}
              {onInsertBelow && (
                <DropdownMenuItem onClick={onInsertBelow}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Insert below
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRemove(index)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Compact Field Grid */}
      <div className="grid grid-cols-3 gap-1.5 px-2.5 pb-2">
        {/* Qty */}
        <div>
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
            Qty
          </label>
          <Input
            type="number"
            min="0"
            value={item.quantity || 0}
            onChange={(e) => onUpdate(index, 'quantity', Number(e.target.value))}
            className="h-7 text-sm"
          />
        </div>

        {/* Unit Rate */}
        <div>
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
            Rate
          </label>
          <Input
            type="number"
            min="0"
            value={item.unit_price || 0}
            onChange={(e) => onUpdate(index, 'unit_price', Number(e.target.value))}
            className="h-7 text-sm"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
            Amount
          </label>
          <div className="flex h-7 items-center rounded-md border border-input bg-muted/50 px-2 text-sm font-semibold text-foreground">
            ₦{Number(computedAmount || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Secondary Fields Row */}
      <div className="grid grid-cols-3 gap-1.5 border-t border-dashed border-border/50 px-2.5 py-1.5">
        {isVisible('unit') && (
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Unit
            </label>
            <UnitInput
              value={item.unit || ''}
              onChange={(value: string) => onUpdate(index, 'unit', value)}
              className="h-6 text-xs"
            />
          </div>
        )}

        {isVisible('install_rate') && (
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Install
            </label>
            <Input
              type="number"
              min="0"
              value={item.install_rate_override ? item.install_rate ?? '' : ''}
              onChange={(e) =>
                onUpdate(index, '__install_rate_override', {
                  install_rate_override: e.target.value !== '',
                  install_rate: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              placeholder="—"
              className="h-6 text-xs placeholder:text-muted-foreground/40"
            />
          </div>
        )}

        {isVisible('make') && (
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Make
            </label>
            <Input
              value={item.make || ''}
              onChange={(e) => onUpdate(index, 'make', e.target.value)}
              placeholder="Brand..."
              className="h-6 text-xs placeholder:text-muted-foreground/40"
            />
          </div>
        )}

        {/* Custom columns */}
        {customColumns.map((column) => (
          <div key={column.key}>
            <label className="mb-0.5 block truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              {column.label}
            </label>
            <Input
              type={column.type === 'number' ? 'number' : 'text'}
              value={(item.custom_data || {})[column.key] || ''}
              onChange={(e) =>
                onUpdate(index, 'custom_data', {
                  ...(item.custom_data || {}),
                  [column.key]: column.type === 'number' ? Number(e.target.value || 0) : e.target.value,
                })
              }
              className="h-6 text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
