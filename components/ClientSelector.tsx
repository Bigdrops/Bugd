import { useState } from 'react'
import { ChevronDown, Search, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface ClientSelectorProps {
  clientId?: string
  clientName?: string
  isMobile?: boolean
  onClientChange: (clientId: string, clientName: string) => void
}

export default function ClientSelector({
  clientId,
  clientName,
  isMobile,
  onClientChange,
}: ClientSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // In a real app, this would fetch from Supabase
  const clients = [
    { id: '1', name: 'Acme Corporation' },
    { id: '2', name: 'Tech Solutions Ltd' },
    { id: '3', name: 'Global Industries' },
  ]

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-sm"
        >
          {clientName || 'Select client...'}
          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {filteredClients.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No clients found</p>
          ) : (
            filteredClients.map((client) => (
              <button
                key={client.id}
                type="button"
                className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onClientChange(client.id, client.name)
                  setOpen(false)
                }}
              >
                {client.name}
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add new client
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
