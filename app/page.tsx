'use client'

import { useState, useMemo } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  FileSpreadsheet,
  Layers,
  Plus,
  Settings2,
} from 'lucide-react'
import CompactItemRow from '@/components/quotation/CompactItemRow'
import CompactGroupHeader from '@/components/quotation/CompactGroupHeader'
import TotalsPanel from '@/components/quotation/TotalsPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

// Demo data types
interface InvoiceItem {
  id: string
  _uiKey: string
  row_type: 'standard' | 'group_header'
  group_id: string | null
  group_name: string
  description: string
  sub_description?: string
  make?: string
  quantity: number
  unit?: string
  unit_price: number
  install_rate?: number | null
  install_rate_override?: boolean
  sort_order: number
  custom_data?: Record<string, unknown>
}

interface GroupState {
  id: string
  name: string
  showSubtotal: boolean
}

// Demo starting data
const initialItems: InvoiceItem[] = [
  {
    id: '1',
    _uiKey: 'item_1',
    row_type: 'group_header',
    group_id: 'grp_electrical',
    group_name: 'Electrical Works',
    description: '',
    quantity: 0,
    unit_price: 0,
    sort_order: 0,
  },
  {
    id: '2',
    _uiKey: 'item_2',
    row_type: 'standard',
    group_id: 'grp_electrical',
    group_name: '',
    description: 'Industrial Cable 16mm²',
    sub_description: 'XLPE insulated, copper conductor',
    make: 'Nexans',
    quantity: 500,
    unit: 'M',
    unit_price: 2500,
    install_rate: 150,
    install_rate_override: true,
    sort_order: 1,
  },
  {
    id: '3',
    _uiKey: 'item_3',
    row_type: 'standard',
    group_id: 'grp_electrical',
    group_name: '',
    description: 'Circuit Breaker 100A',
    sub_description: '3-pole, 50kA breaking capacity',
    make: 'ABB',
    quantity: 12,
    unit: 'PCS',
    unit_price: 45000,
    sort_order: 2,
  },
  {
    id: '4',
    _uiKey: 'item_4',
    row_type: 'standard',
    group_id: null,
    group_name: '',
    description: 'Site Survey & Assessment',
    sub_description: 'Initial technical evaluation',
    quantity: 1,
    unit: 'LOT',
    unit_price: 150000,
    sort_order: 3,
  },
  {
    id: '5',
    _uiKey: 'item_5',
    row_type: 'standard',
    group_id: null,
    group_name: '',
    description: 'Project Management',
    sub_description: 'Coordination and oversight',
    quantity: 1,
    unit: 'LOT',
    unit_price: 200000,
    sort_order: 4,
  },
]

const initialGroups: GroupState[] = [
  { id: 'grp_electrical', name: 'Electrical Works', showSubtotal: true },
]

export default function QuotationFormDemo() {
  const [items, setItems] = useState<InvoiceItem[]>(initialItems)
  const [groups, setGroups] = useState<GroupState[]>(initialGroups)
  const [quotation, setQuotation] = useState({
    quotation_number: 'QUO-0042',
    po_number: '',
    client_name: 'Acme Corporation',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    status: 'draft' as const,
    quotation_title: 'Industrial Electrical Installation',
    vat: 7.5,
    discount: 0,
    wht: 0,
  })

  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountTiming, setDiscountTiming] = useState<'before' | 'after'>('after')
  const [whtType, setWhtType] = useState<'fixed' | 'percent'>('percent')
  const [mergeQtyUnit, setMergeQtyUnit] = useState(false)
  const [showItemImages, setShowItemImages] = useState(false)

  // Column visibility
  const isVisible = (key: string) => ['make', 'unit', 'install_rate'].includes(key)
  const getColumn = (key: string) => ({ key, label: key, visible: isVisible(key) })

  // Calculate totals
  const totals = useMemo(() => {
    let subtotal = 0
    let installRateTotal = 0
    const itemCalcs: Array<{ line_subtotal: number }> = []
    const groupTotals = new Map<string, number>()

    items.forEach((item) => {
      if (item.row_type === 'group_header') {
        itemCalcs.push({ line_subtotal: 0 })
        return
      }

      const lineSubtotal = item.quantity * item.unit_price
      const lineInstall = item.install_rate_override && item.install_rate
        ? item.quantity * item.install_rate
        : 0

      subtotal += lineSubtotal
      installRateTotal += lineInstall
      itemCalcs.push({ line_subtotal: lineSubtotal })

      if (item.group_id) {
        groupTotals.set(item.group_id, (groupTotals.get(item.group_id) || 0) + lineSubtotal)
      }
    })

    const vat = subtotal * (quotation.vat / 100)
    const discount = discountType === 'percent'
      ? (discountTiming === 'before' ? subtotal : subtotal + vat) * (quotation.discount / 100)
      : quotation.discount
    const wht = whtType === 'percent' ? subtotal * (quotation.wht / 100) : quotation.wht
    const totalPayable = subtotal + vat + installRateTotal - discount - wht

    return {
      subtotal,
      installRateTotal,
      vat,
      discount,
      wht,
      totalPayable: Math.max(0, totalPayable),
      items: itemCalcs,
      groups: Array.from(groupTotals.entries()).map(([group_id, subtotal]) => ({
        group_id,
        subtotal,
      })),
    }
  }, [items, quotation, discountType, discountTiming, whtType])

  const computedGroups = new Map(totals.groups.map((g) => [g.group_id, g]))

  // Handlers
  const updateItem = (index: number, field: string, value: unknown) => {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, i) => i !== index))
  }

  const moveItemBy = (index: number, direction: number) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= items.length) return
    setItems((current) => {
      const next = [...current]
      ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
      return next
    })
  }

  const addItem = (groupId: string | null = null) => {
    const newItem: InvoiceItem = {
      id: `item_${Date.now()}`,
      _uiKey: `item_${Date.now()}`,
      row_type: 'standard',
      group_id: groupId,
      group_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      sort_order: items.length,
    }
    setItems((current) => [...current, newItem])
  }

  const addGroup = () => {
    const groupId = `grp_${Date.now()}`
    const newGroup: GroupState = {
      id: groupId,
      name: `Group ${groups.length + 1}`,
      showSubtotal: false,
    }
    const newHeader: InvoiceItem = {
      id: `header_${Date.now()}`,
      _uiKey: `header_${Date.now()}`,
      row_type: 'group_header',
      group_id: groupId,
      group_name: newGroup.name,
      description: '',
      quantity: 0,
      unit_price: 0,
      sort_order: items.length,
    }
    setGroups((current) => [...current, newGroup])
    setItems((current) => [...current, newHeader])
  }

  const updateGroupName = (groupId: string, name: string) => {
    setGroups((current) =>
      current.map((g) => (g.id === groupId ? { ...g, name } : g)),
    )
    setItems((current) =>
      current.map((item) =>
        item.row_type === 'group_header' && item.group_id === groupId
          ? { ...item, group_name: name }
          : item,
      ),
    )
  }

  const toggleGroupSubtotal = (groupId: string) => {
    setGroups((current) =>
      current.map((g) => (g.id === groupId ? { ...g, showSubtotal: !g.showSubtotal } : g)),
    )
  }

  const deleteGroup = (groupId: string) => {
    setGroups((current) => current.filter((g) => g.id !== groupId))
    setItems((current) =>
      current
        .filter((item) => !(item.row_type === 'group_header' && item.group_id === groupId))
        .map((item) =>
          item.group_id === groupId ? { ...item, group_id: null, group_name: '' } : item,
        ),
    )
  }

  // Render mobile items
  const renderItems = () => {
    let itemNumber = 0

    return items.map((item, index) => {
      if (item.row_type === 'group_header') {
        const group = groups.find((g) => g.id === item.group_id)
        if (!group) return null

        const groupItems = items.filter(
          (i) => i.row_type === 'standard' && i.group_id === group.id,
        )
        const groupSubtotal = computedGroups.get(group.id)?.subtotal || 0

        return (
          <CompactGroupHeader
            key={item._uiKey}
            groupId={group.id}
            groupName={group.name}
            showSubtotal={group.showSubtotal}
            subtotal={groupSubtotal}
            itemCount={groupItems.length}
            onNameChange={(name) => updateGroupName(group.id, name)}
            onToggleSubtotal={() => toggleGroupSubtotal(group.id)}
            onDelete={() => deleteGroup(group.id)}
            onAddItem={() => addItem(group.id)}
          >
            {groupItems.map((groupItem, groupIndex) => {
              itemNumber += 1
              const itemIndex = items.indexOf(groupItem)

              return (
                <CompactItemRow
                  key={groupItem._uiKey}
                  item={groupItem}
                  index={itemIndex}
                  number={itemNumber}
                  computedAmount={totals.items[itemIndex]?.line_subtotal || 0}
                  isVisible={isVisible}
                  getColumn={getColumn}
                  customColumns={[]}
                  showItemImages={showItemImages}
                  isFirst={groupIndex === 0}
                  isLast={groupIndex === groupItems.length - 1}
                  isGrouped
                  onUpdate={updateItem}
                  onRemove={removeItem}
                  onMoveUp={(i) => moveItemBy(i, -1)}
                  onMoveDown={(i) => moveItemBy(i, 1)}
                  onInsertBelow={() => addItem(group.id)}
                />
              )
            })}
          </CompactGroupHeader>
        )
      }

      if (item.row_type !== 'standard' || item.group_id) return null

      itemNumber += 1
      return (
        <CompactItemRow
          key={item._uiKey}
          item={item}
          index={index}
          number={itemNumber}
          computedAmount={totals.items[index]?.line_subtotal || 0}
          isVisible={isVisible}
          getColumn={getColumn}
          customColumns={[]}
          showItemImages={showItemImages}
          isFirst={itemNumber === 1}
          isLast={index === items.length - 1}
          onUpdate={updateItem}
          onRemove={removeItem}
          onMoveUp={(i) => moveItemBy(i, -1)}
          onMoveDown={(i) => moveItemBy(i, 1)}
          onInsertBelow={() => addItem()}
        />
      )
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-2 pb-20 pt-3 sm:px-4 sm:pt-4">
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">New Quotation</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-5 text-[10px] font-medium uppercase">
                Draft
              </Badge>
              <span className="text-xs text-muted-foreground">#{quotation.quotation_number}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* Main Content */}
        <div className="space-y-3">
          {/* Client & Details */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between border border-border bg-card px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-muted/30"
              >
                Client & Details
                <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]_&]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 border border-t-0 border-border bg-card p-3">
                <div>
                  <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Client
                  </Label>
                  <Input
                    value={quotation.client_name}
                    onChange={(e) => setQuotation((q) => ({ ...q, client_name: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Issue Date
                    </Label>
                    <Input
                      type="date"
                      value={quotation.issue_date}
                      onChange={(e) => setQuotation((q) => ({ ...q, issue_date: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Valid Until
                    </Label>
                    <Input
                      type="date"
                      value={quotation.valid_until}
                      onChange={(e) => setQuotation((q) => ({ ...q, valid_until: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Quote #
                    </Label>
                    <Input
                      value={quotation.quotation_number}
                      onChange={(e) => setQuotation((q) => ({ ...q, quotation_number: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </Label>
                    <Select
                      value={quotation.status}
                      onValueChange={(value) => setQuotation((q) => ({ ...q, status: value as typeof q.status }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Scope Title
                  </Label>
                  <Input
                    value={quotation.quotation_title}
                    onChange={(e) => setQuotation((q) => ({ ...q, quotation_title: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Scope of Work */}
          <div className="border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Scope of Work
              </h2>
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                  <Settings2 className="h-3 w-3" />
                  Settings
                </Button>
                <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                  <FileSpreadsheet className="h-3 w-3" />
                  Import
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-primary"
                  onClick={addGroup}
                >
                  <Layers className="h-3 w-3" />
                  Group
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-primary"
                  onClick={() => addItem()}
                >
                  <Plus className="h-3 w-3" />
                  Item
                </Button>
              </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-border">{renderItems()}</div>

            {/* Add Buttons */}
            <div className="flex gap-1 border-t border-border p-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 flex-1 gap-1 text-xs text-primary"
                onClick={() => addItem()}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 flex-1 gap-1 text-xs"
                onClick={addGroup}
              >
                <Layers className="h-3.5 w-3.5" />
                Add Group
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar - Totals */}
        <div className="space-y-3">
          <TotalsPanel
            totals={totals}
            quotation={quotation}
            discountType={discountType}
            discountTiming={discountTiming}
            whtType={whtType}
            mergeQtyUnit={mergeQtyUnit}
            showItemImages={showItemImages}
            useGlobalVatInput={true}
            useGlobalDiscountInput={true}
            onUpdateQuotation={(field, value) => setQuotation((q) => ({ ...q, [field]: value }))}
            onSetDiscountType={setDiscountType}
            onSetDiscountTiming={setDiscountTiming}
            onSetWhtType={setWhtType}
            onSetMergeQtyUnit={setMergeQtyUnit}
            onSetShowItemImages={setShowItemImages}
          />

          {/* Save Actions */}
          <div className="sticky bottom-4 space-y-2">
            <Button className="w-full">Create Quotation</Button>
            <Button variant="outline" className="w-full">
              Save as Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
