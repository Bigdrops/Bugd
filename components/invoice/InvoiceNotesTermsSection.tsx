import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface InvoiceNotesTermsSectionProps {
  invoice: {
    notes?: string
    terms?: string
  }
  updateInvoice: (field: string, value: unknown) => void
  notesTitle: string
  setNotesTitle: (value: string) => void
  termsTitle: string
  setTermsTitle: (value: string) => void
}

export default function InvoiceNotesTermsSection({
  invoice,
  updateInvoice,
  notesTitle,
  setNotesTitle,
  termsTitle,
  setTermsTitle,
}: InvoiceNotesTermsSectionProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between border border-border bg-card px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-muted/30"
        >
          Notes & Terms
          <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]_&]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 border border-t-0 border-border bg-card p-3">
          {/* Notes */}
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Section Title
              </Label>
              <Input
                value={notesTitle}
                onChange={(e) => setNotesTitle(e.target.value)}
                placeholder="Notes"
                className="h-6 max-w-[140px] text-xs"
              />
            </div>
            <Textarea
              value={invoice.notes || ''}
              onChange={(e) => updateInvoice('notes', e.target.value)}
              placeholder="Add notes for the client..."
              className="min-h-[60px] resize-y text-sm"
            />
          </div>

          {/* Terms */}
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Section Title
              </Label>
              <Input
                value={termsTitle}
                onChange={(e) => setTermsTitle(e.target.value)}
                placeholder="Terms and Conditions"
                className="h-6 max-w-[180px] text-xs"
              />
            </div>
            <Textarea
              value={invoice.terms || ''}
              onChange={(e) => updateInvoice('terms', e.target.value)}
              placeholder="Add terms and conditions..."
              className="min-h-[60px] resize-y text-sm"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
