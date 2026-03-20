import { ChevronDown, MoreHorizontal, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface CompactGroupHeaderProps {
  groupId: string
  groupName: string
  showSubtotal: boolean
  subtotal: number
  itemCount: number
  onNameChange: (name: string) => void
  onToggleSubtotal: () => void
  onDelete: () => void
  onAddItem: () => void
  children: React.ReactNode
}

export default function CompactGroupHeader({
  groupId,
  groupName,
  showSubtotal,
  subtotal,
  itemCount,
  onNameChange,
  onToggleSubtotal,
  onDelete,
  onAddItem,
  children,
}: CompactGroupHeaderProps) {
  return (
    <Collapsible defaultOpen className="border border-border bg-card">
      {/* Group Header Bar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-2 py-1.5">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
            <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=closed]_&]:-rotate-90" />
          </Button>
        </CollapsibleTrigger>

        <div className="h-4 w-0.5 rounded-full bg-primary" />

        <Input
          value={groupName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Group name"
          className="h-6 flex-1 border-0 bg-transparent px-1 text-sm font-semibold shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
        />

        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </span>

        {showSubtotal && (
          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
            ₦{Number(subtotal || 0).toLocaleString()}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onAddItem}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleSubtotal}>
              {showSubtotal ? (
                <>
                  <EyeOff className="mr-2 h-3.5 w-3.5" />
                  Hide subtotal
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  Show subtotal
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Group Items */}
      <CollapsibleContent>
        <div className="divide-y divide-border/50">
          {children}
        </div>

        {/* Add Item to Group Button */}
        <button
          type="button"
          onClick={onAddItem}
          className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-border py-1.5 text-xs font-medium text-primary/70 transition-colors hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="h-3 w-3" />
          Add to group
        </button>
      </CollapsibleContent>
    </Collapsible>
  )
}
