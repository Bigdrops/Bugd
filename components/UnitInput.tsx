import { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface UnitInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const COMMON_UNITS = ['PCS', 'SET', 'LOT', 'M', 'KG', 'L', 'BOX', 'ROLL', 'UNIT', 'EACH']

export default function UnitInput({ value, onChange, className }: UnitInputProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Unit"
          className={className}
          onFocus={() => setOpen(true)}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[160px] p-1" align="start">
        <div className="grid grid-cols-2 gap-1">
          {COMMON_UNITS.map((unit) => (
            <button
              key={unit}
              type="button"
              className="rounded px-2 py-1 text-left text-xs hover:bg-muted"
              onClick={() => {
                onChange(unit)
                setOpen(false)
              }}
            >
              {unit}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
