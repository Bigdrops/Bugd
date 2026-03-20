import { ChevronDown, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { InvoiceFieldEntry } from '@/domain/invoice'

interface InvoiceCustomBottomFieldsSectionProps {
  bottomFields: InvoiceFieldEntry[]
  setBottomFields: React.Dispatch<React.SetStateAction<InvoiceFieldEntry[]>>
  emptyStateText?: string
  placeholder?: string
}

function makeBottomFieldEntry(text: string = ''): InvoiceFieldEntry {
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text,
  }
}

export default function InvoiceCustomBottomFieldsSection({
  bottomFields,
  setBottomFields,
  emptyStateText = 'No footer fields yet.',
  placeholder = 'Footer text',
}: InvoiceCustomBottomFieldsSectionProps) {
  const addField = () => {
    setBottomFields((current) => [...current, makeBottomFieldEntry()])
  }

  const updateField = (id: string, text: string) => {
    setBottomFields((current) =>
      current.map((field) => (field.id === id ? { ...field, text } : field)),
    )
  }

  const removeField = (id: string) => {
    setBottomFields((current) => current.filter((field) => field.id !== id))
  }

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between border border-border bg-card px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-muted/30"
        >
          Footer Fields {bottomFields.length > 0 && `(${bottomFields.length})`}
          <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]_&]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 border border-t-0 border-border bg-card p-3">
          {bottomFields.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">{emptyStateText}</p>
          ) : (
            bottomFields.map((field) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  value={field.text || ''}
                  onChange={(e) => updateField(field.id, e.target.value)}
                  placeholder={placeholder}
                  className="h-7 flex-1 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-destructive"
                  onClick={() => removeField(field.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full gap-1 text-xs text-primary"
            onClick={addField}
          >
            <Plus className="h-3 w-3" />
            Add footer field
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
