import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase'
import {
  ArrowLeft,
  ChevronDown,
  FileSpreadsheet,
  Layers,
  Plus,
  Settings2,
  Upload,
} from 'lucide-react'
import ClientSelector from '@/components/ClientSelector'
import ColumnManager from '@/components/ColumnManager'
import CompactItemRow from '@/components/quotation/CompactItemRow'
import CompactGroupHeader from '@/components/quotation/CompactGroupHeader'
import TotalsPanel from '@/components/quotation/TotalsPanel'
import UnitInput from '@/components/UnitInput'
import InvoiceNotesTermsSection from '@/components/invoice/InvoiceNotesTermsSection'
import InvoiceCustomBottomFieldsSection from '@/components/invoice/InvoiceCustomBottomFieldsSection'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  buildCalculationInputs,
  inferLegacyCalculationState,
  makeEmptyItem,
  makeEmptyGroup,
  makeFieldEntry,
  useInvoiceColumns,
} from '@/components/useInvoiceColumns.jsx'
import { toDbItem } from '@/domain/invoice'
import { computeDocument } from '@/lib/Calculations'
import type { ColumnConfig, InvoiceFieldEntry, InvoiceItem } from '@/domain/invoice'
import {
  buildQuotationFormState,
  getNextQuotationNumber,
  type DbQuotation,
  type DbQuotationItem,
  type Quotation,
} from '@/domain/quotation'
import { QUOTATION_STATUSES, formatQuotationStatus } from './quotationStatus'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function makeQuotationGroupId() {
  return `quo_group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function toGroupMetaMap(groups: Array<{ id: string; name: string; showSubtotal?: boolean }>) {
  return Object.fromEntries(
    groups.map((group) => [group.id, { name: group.name, showSubtotal: !!group.showSubtotal }]),
  )
}

function normalizeQuotationGrouping(
  items: InvoiceItem[],
  groupMeta: Record<string, { name?: string; showSubtotal?: boolean }> = {},
) {
  const headerOrder: string[] = []
  const headerById = new Map<string, { id: string; name: string; showSubtotal: boolean }>()
  const rawToCanonical = new Map<string, string>()
  const seenCanonical = new Set<string>()

  items.forEach((item) => {
    if (item.row_type !== 'group_header') return
    const rawId = String(item.group_id || '').trim()
    let canonicalId = rawId && !seenCanonical.has(rawId) ? rawId : makeQuotationGroupId()

    while (seenCanonical.has(canonicalId)) {
      canonicalId = makeQuotationGroupId()
    }

    seenCanonical.add(canonicalId)
    if (rawId && !rawToCanonical.has(rawId)) rawToCanonical.set(rawId, canonicalId)

    const meta = (rawId && groupMeta[rawId]) || groupMeta[canonicalId] || {}
    const name =
      String(item.group_name || '').trim() ||
      String(meta.name || '').trim() ||
      `Group ${headerOrder.length + 1}`

    headerOrder.push(canonicalId)
    headerById.set(canonicalId, {
      id: canonicalId,
      name,
      showSubtotal: !!meta.showSubtotal,
    })
  })

  const normalizedItems = items.map((item, index) => {
    if (item.row_type === 'group_header') {
      const rawId = String(item.group_id || '').trim()
      const canonicalId =
        (rawId && rawToCanonical.get(rawId)) ||
        headerOrder.find((groupId) => {
          const group = headerById.get(groupId)
          return group && group.name === item.group_name
        }) ||
        makeQuotationGroupId()
      const group = headerById.get(canonicalId) || {
        id: canonicalId,
        name: String(item.group_name || '').trim() || `Group ${index + 1}`,
        showSubtotal: false,
      }

      return {
        ...item,
        row_type: 'group_header' as const,
        group_id: canonicalId,
        group_name: group.name,
        sort_order: index,
      }
    }

    const rawId = String(item.group_id || '').trim()
    const canonicalId = rawId ? rawToCanonical.get(rawId) : null

    return {
      ...item,
      row_type: 'standard' as const,
      group_id: canonicalId || null,
      group_name: canonicalId ? item.group_name || '' : '',
      sort_order: index,
    }
  })

  return {
    items: normalizedItems,
    groups: headerOrder.map((groupId) => headerById.get(groupId)).filter(Boolean) as Array<{
      id: string
      name: string
      showSubtotal: boolean
    }>,
  }
}

function buildCustomFields({
  quotation,
  columns,
  headerFields,
  bottomFields,
  discountType,
  discountTiming,
  whtType,
  notesTitle,
  termsTitle,
  mergeQtyUnit,
  showItemImages,
  groups,
}: {
  quotation: Quotation
  columns: ColumnConfig[]
  headerFields: InvoiceFieldEntry[]
  bottomFields: InvoiceFieldEntry[]
  discountType: 'fixed' | 'percent'
  discountTiming: 'before' | 'after'
  whtType: 'fixed' | 'percent'
  notesTitle: string
  termsTitle: string
  mergeQtyUnit: boolean
  showItemImages: boolean
  groups: Array<{ id: string; name: string; showSubtotal?: boolean }>
}) {
  const groupMeta = toGroupMetaMap(groups)

  return {
    quotationTitle: quotation.quotation_title || '',
    clientName: quotation.client_name || '',
    notesHtml: quotation.notes || '',
    termsHtml: quotation.terms || '',
    header: headerFields.filter((field) => field.label && field.value),
    bottom: bottomFields.filter((field) => field.text),
    columnConfig: columns,
    notesTitle,
    termsTitle,
    mergeQtyUnit,
    showItemImages,
    discountType,
    discountTiming,
    whtType,
    groupMeta,
    calculationInputs: buildCalculationInputs({
      invoice: quotation,
      discountType,
      discountTiming,
      whtType,
    }),
  }
}

function toQuotationItem(item: InvoiceItem, quotationId: string, sortOrder: number) {
  const row = toDbItem(item, quotationId, sortOrder) as Record<string, unknown>
  delete row.invoice_id
  return { ...row, quotation_id: quotationId }
}

type QuotationGroupState = { id: string; name: string; showSubtotal: boolean }

export default function QuotationForm({ mode, quotationId }: { mode: 'new' | 'edit'; quotationId?: string }) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isEdit = mode === 'edit'
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [showCSVNote, setShowCSVNote] = useState(false)
  const [csvTab, setCSVTab] = useState('Upload File')
  const [pasteCSV, setPasteCSV] = useState('')
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [quotation, setQuotation] = useState<Quotation>({
    quotation_number: '',
    po_number: '',
    client_id: '',
    client_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    status: 'draft',
    quotation_title: '',
    notes: '',
    terms: '',
    workmanship: 0,
    transportation: 0,
    shipping: 0,
    discount: 0,
    vat: 7.5,
    wht: 0,
  })
  const [headerFields, setHeaderFields] = useState<InvoiceFieldEntry[]>([])
  const [bottomFields, setBottomFields] = useState<InvoiceFieldEntry[]>([])
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountTiming, setDiscountTiming] = useState<'before' | 'after'>('after')
  const [whtType, setWhtType] = useState<'fixed' | 'percent'>('percent')
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')
  const [mergeQtyUnit, setMergeQtyUnit] = useState(false)
  const [showItemImages, setShowItemImages] = useState(false)
  const [groups, setGroups] = useState<QuotationGroupState[]>([])
  const [items, setItems] = useState<InvoiceItem[]>([
    { ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' },
  ])
  const itemsRef = useRef(items)
  const groupsRef = useRef(groups)
  const {
    columns,
    setColumns,
    isVisible,
    getColumn,
    toggleVisible,
    updateColumn,
    addCustomColumn,
    removeCustomColumn,
    resetColumns,
    moveColumn,
    customColumns,
  } = useInvoiceColumns()

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    groupsRef.current = groups
  }, [groups])

  useEffect(() => {
    const load = async () => {
      if (isEdit && quotationId) {
        const [{ data: quotationRow, error }, { data: itemRows }] = await Promise.all([
          supabase.from('quotations').select('*').eq('id', quotationId).single(),
          supabase.from('quotation_items').select('*').eq('quotation_id', quotationId).order('sort_order'),
        ])
        if (error || !quotationRow) {
          alert('Quotation not found.')
          navigate('/quotations')
          return
        }
        const state = buildQuotationFormState(
          quotationRow as DbQuotation,
          (itemRows || []) as DbQuotationItem[],
        )
        const normalizedGrouping = normalizeQuotationGrouping(
          state.items,
          state.quotation.custom_fields?.groupMeta || {},
        )
        setQuotation(state.quotation)
        setItems(normalizedGrouping.items)
        setColumns(state.columns)
        setHeaderFields(state.headerFields)
        setBottomFields(state.bottomFields)
        setDiscountType(state.discountType)
        setDiscountTiming(state.discountTiming)
        setWhtType(state.whtType)
        setNotesTitle(state.notesTitle)
        setTermsTitle(state.termsTitle)
        setMergeQtyUnit(state.mergeQtyUnit)
        setShowItemImages(state.showItemImages)
        setGroups(normalizedGrouping.groups)
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('quotations')
        .select('quotation_number')
        .order('created_at', { ascending: false })
      setQuotation((current) => ({
        ...current,
        quotation_number: getNextQuotationNumber((data || []) as Array<Pick<DbQuotation, 'quotation_number'>>),
      }))
      setGroups([])
    }
    load()
  }, [isEdit, navigate, quotationId, setColumns])

  const commitGrouping = (
    nextItemsInput: InvoiceItem[] | ((current: InvoiceItem[]) => InvoiceItem[]),
    nextGroupsInput?:
      | QuotationGroupState[]
      | ((current: QuotationGroupState[]) => QuotationGroupState[]),
  ) => {
    const baseItems = itemsRef.current
    const baseGroups = groupsRef.current
    const nextItems =
      typeof nextItemsInput === 'function' ? nextItemsInput(baseItems) : nextItemsInput
    const nextGroups =
      typeof nextGroupsInput === 'function' ? nextGroupsInput(baseGroups) : nextGroupsInput ?? baseGroups

    const normalized = normalizeQuotationGrouping(nextItems, toGroupMetaMap(nextGroups))
    itemsRef.current = normalized.items
    groupsRef.current = normalized.groups
    setItems(normalized.items)
    setGroups(normalized.groups)
  }

  const updateQuotation = <K extends keyof Quotation>(field: K, value: Quotation[K]) =>
    setQuotation((current) => ({ ...current, [field]: value }))

  const updateItem = (index: number, field: string, value: unknown) =>
    commitGrouping((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (field === 'custom_data') return { ...item, custom_data: value as InvoiceItem['custom_data'] }
        return { ...item, [field]: value }
      }),
    )

  const applyRowPatch = (itemIndex: number, patch: Partial<InvoiceItem>) =>
    commitGrouping((current) =>
      current.map((item, index) => (index === itemIndex ? { ...item, ...patch } : item)),
    )

  const addUngroupedItem = (insertAt: number | null = null) => {
    commitGrouping((current) => {
      const newItem = {
        ...makeEmptyItem(),
        row_type: 'standard',
        group_id: null,
        group_name: '',
      }
      if (insertAt === null || insertAt >= current.length) {
        return [...current, { ...newItem, sort_order: current.length }]
      }
      const next = [...current]
      next.splice(insertAt, 0, { ...newItem, sort_order: insertAt })
      return next.map((item, index) => ({ ...item, sort_order: index }))
    })
  }

  const addQuotationItem = () => addUngroupedItem()

  const insertItemAfter = (index: number) => addUngroupedItem(index + 1)

  const addQuotationGroup = () => {
    const base = makeEmptyGroup()
    const groupId = base.id || makeQuotationGroupId()
    const group = {
      ...base,
      id: groupId,
      name: base.name || `Group ${groups.length + 1}`,
      showSubtotal: !!base.showSubtotal,
    }

    commitGrouping(
      (current) => [
        ...current.map((item, index) => ({ ...item, sort_order: index })),
        {
          ...makeEmptyItem(),
          row_type: 'group_header',
          group_id: group.id,
          group_name: group.name,
          description: '',
          sort_order: current.length,
        },
      ],
      (current) => [...current, group],
    )
  }

  const updateGroupName = (groupId: string, newName: string) => {
    commitGrouping(
      (current) =>
        current.map((item) =>
          item.row_type === 'group_header' && item.group_id === groupId
            ? { ...item, group_name: newName }
            : item,
        ),
      (current) => current.map((group) => (group.id === groupId ? { ...group, name: newName } : group)),
    )
  }

  const toggleGroupSubtotal = (groupId: string) => {
    commitGrouping(
      (current) => current,
      (current) =>
        current.map((group) =>
          group.id === groupId ? { ...group, showSubtotal: !group.showSubtotal } : group,
        ),
    )
  }

  const deleteGroup = (groupId: string) => {
    commitGrouping(
      (current) =>
        current
          .filter((item) => !(item.row_type === 'group_header' && item.group_id === groupId))
          .map((item, index) =>
            item.group_id === groupId
              ? { ...item, group_id: null, group_name: '', sort_order: index }
              : { ...item, sort_order: index },
          ),
      (current) => current.filter((group) => group.id !== groupId),
    )
  }

  const addItemToGroup = (groupId: string) => {
    const group = normalizedGroups.find((entry) => entry.id === groupId)
    if (!group) return

    commitGrouping((current) => {
      let insertAt = current.findIndex(
        (item) => item.row_type === 'group_header' && item.group_id === groupId,
      )

      if (insertAt === -1) insertAt = current.length - 1

      for (let index = insertAt + 1; index < current.length; index += 1) {
        if (current[index].row_type === 'group_header') break
        if (current[index].group_id === groupId) insertAt = index
      }

      const next = [...current]
      next.splice(insertAt + 1, 0, {
        ...makeEmptyItem(),
        row_type: 'standard',
        group_id: groupId,
        group_name: '',
      })
      return next.map((item, index) => ({ ...item, sort_order: index }))
    })
  }

  const parseCsvItems = (text: string) => {
    const lines = text.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      return { error: 'The CSV needs a header row and at least one item row.' }
    }

    const headers = lines[0]
      .split(',')
      .map((header) => header.trim().toLowerCase().replace(/"/g, ''))

    const newItems: InvoiceItem[] = []
    for (let i = 1; i < lines.length; i += 1) {
      const cols = lines[i].split(',').map((cell) => cell.trim().replace(/"/g, ''))
      if (!cols[0]) continue
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = cols[index] || ''
      })
      newItems.push({
        ...makeEmptyItem(),
        row_type: 'standard',
        group_id: null,
        group_name: '',
        description: row.description || cols[0],
        sub_description: row.sub_description || '',
        make: row.make || '',
        quantity: Number(row.quantity || 1),
        unit: (row.unit || '').toUpperCase(),
        unit_price: Number(row.unit_price || 0),
        sort_order: newItems.length,
      })
    }

    if (!newItems.length) {
      return {
        error:
          'No valid item rows were found. Check that the file contains description values under the CSV header.',
      }
    }

    return { newItems }
  }

  const applyImportedItems = (newItems: InvoiceItem[]) => {
    commitGrouping((current) => [
      ...current.filter((item) => item.description?.trim() || item.row_type === 'group_header'),
      ...newItems,
    ])
    alert(`${newItems.length} items imported`)
    setShowCSVNote(false)
  }

  const handleCSVImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const text = String(loadEvent.target?.result || '')
      const { newItems, error } = parseCsvItems(text)
      if (error) {
        alert(error)
        return
      }

      applyImportedItems(newItems)
    }

    reader.readAsText(file)
    event.target.value = ''
  }

  const normalizedGroupMeta = useMemo(() => toGroupMetaMap(groups), [groups])
  const normalizedGrouping = useMemo(
    () => normalizeQuotationGrouping(items, normalizedGroupMeta),
    [items, normalizedGroupMeta],
  )
  const normalizedItems = normalizedGrouping.items
  const normalizedGroups = normalizedGrouping.groups

  const calculationInputs = useMemo(
    () =>
      buildCalculationInputs({
        invoice: quotation,
        discountType,
        discountTiming,
        whtType,
      }),
    [discountTiming, discountType, quotation, whtType],
  )

  const totals = useMemo(
    () =>
      computeDocument({
        items: normalizedItems,
        document: {
          ...quotation,
          workmanship: Number(quotation.workmanship || 0),
          transportation: Number(quotation.transportation || 0),
          shipping: Number(quotation.shipping || 0),
        },
        cf: {
          calculationInputs,
        },
      }),
    [calculationInputs, normalizedItems, quotation],
  )

  const computedGroups = useMemo(
    () => new Map(totals.groups.map((group) => [group.group_id, group])),
    [totals.groups],
  )

  const calculationState = useMemo(
    () =>
      inferLegacyCalculationState({
        invoice: quotation,
        items: normalizedItems,
        customFields: buildCustomFields({
          quotation,
          columns,
          headerFields,
          bottomFields,
          discountType,
          discountTiming,
          whtType,
          notesTitle,
          termsTitle,
          mergeQtyUnit,
          showItemImages,
          groups: normalizedGroups,
        }),
      }),
    [
      bottomFields,
      columns,
      discountTiming,
      discountType,
      headerFields,
      normalizedItems,
      mergeQtyUnit,
      notesTitle,
      quotation,
      showItemImages,
      termsTitle,
      whtType,
      normalizedGroups,
    ],
  )

  const handleSave = async (status: Quotation['status']) => {
    setSaving(true)
    const poNumber = String(quotation.po_number || '').trim()
    const payload = {
      quotation_number: quotation.quotation_number || '',
      po_number: poNumber || null,
      quotation_title: quotation.quotation_title || null,
      client_id: quotation.client_id || null,
      client_name: quotation.client_name || '',
      issue_date: quotation.issue_date || null,
      valid_until: quotation.valid_until || null,
      status: status || 'draft',
      notes: quotation.notes || '',
      terms: quotation.terms || '',
      workmanship: Number(quotation.workmanship || 0),
      transportation: Number(quotation.transportation || 0),
      shipping: Number(quotation.shipping || 0),
      discount: totals.discount,
      vat: totals.vat,
      wht: totals.wht,
      subtotal: totals.subtotal,
      install_rate_total: totals.installRateTotal,
      total: totals.totalPayable,
      amount_in_words: quotation.amount_in_words || '',
      custom_fields: JSON.stringify(
        buildCustomFields({
          quotation,
          columns,
          headerFields,
          bottomFields,
          discountType,
          discountTiming,
          whtType,
          notesTitle,
          termsTitle,
          mergeQtyUnit,
          showItemImages,
          groups: normalizedGroups,
        }),
      ),
    }
    const quoteQuery =
      isEdit && quotationId
        ? supabase.from('quotations').update(payload).eq('id', quotationId).select().single()
        : supabase.from('quotations').insert([payload]).select().single()
    const { data: savedQuotation, error } = await quoteQuery
    if (error || !savedQuotation) {
      alert('Error saving quotation: ' + (error?.message || 'Unknown error'))
      setSaving(false)
      return
    }
    const resolvedId = String(savedQuotation.id)
    const itemRows = normalizedItems
      .filter((item) =>
        item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim(),
      )
      .map((item, index) => toQuotationItem(item, resolvedId, index))
    const { error: deleteError } = await supabase.from('quotation_items').delete().eq('quotation_id', resolvedId)
    if (deleteError) {
      alert('Error clearing quotation items: ' + deleteError.message)
      setSaving(false)
      return
    }
    if (itemRows.length > 0) {
      const { error: itemError } = await supabase.from('quotation_items').insert(itemRows)
      if (itemError) {
        alert('Error saving quotation items: ' + itemError.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    navigate(`/quotations/${resolvedId}`)
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading quotation...
      </div>
    )
  }

  const visibleCustomColumns = customColumns.filter((column: ColumnConfig) => column.visible)
  const summaryHeaderFields = headerFields.filter((field) => field.label && field.value)

  const removeItemAt = (itemIndex: number) =>
    commitGrouping((current) =>
      current
        .filter((_, entryIndex) => entryIndex !== itemIndex)
        .map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex })),
    )

  const moveItemBy = (itemIndex: number, direction: number) => {
    commitGrouping((current) => {
      const snapshot = normalizeQuotationGrouping(current, toGroupMetaMap(groupsRef.current))
      const rows = [...snapshot.items]
      const row = rows[itemIndex]
      if (!row) return rows

      const getGroupBlockEnd = (startIndex: number) => {
        let endIndex = startIndex
        for (let cursor = startIndex + 1; cursor < rows.length; cursor += 1) {
          if (rows[cursor].row_type === 'group_header') break
          if (rows[cursor].group_id === rows[startIndex].group_id) {
            endIndex = cursor
          }
        }
        return endIndex
      }

      const getBlockRange = (startIndex: number) => {
        const target = rows[startIndex]
        if (!target) return { start: startIndex, end: startIndex }
        if (target.row_type === 'group_header') {
          return { start: startIndex, end: getGroupBlockEnd(startIndex) }
        }
        return { start: startIndex, end: startIndex }
      }

      if (row.row_type === 'group_header') {
        const block = rows.slice(itemIndex, getGroupBlockEnd(itemIndex) + 1)
        const remainder = [...rows.slice(0, itemIndex), ...rows.slice(itemIndex + block.length)]
        let insertAt = itemIndex

        if (direction < 0) {
          if (itemIndex === 0) return rows
          const previousBlockStart = (() => {
            if (remainder[itemIndex - 1]?.row_type !== 'group_header') return itemIndex - 1
            for (let cursor = itemIndex - 1; cursor >= 0; cursor -= 1) {
              if (remainder[cursor].row_type === 'group_header') return cursor
            }
            return 0
          })()
          insertAt = previousBlockStart
        } else {
          const nextBlockStart = itemIndex
          if (nextBlockStart >= remainder.length) {
            insertAt = remainder.length
          } else {
            insertAt = getBlockRange(nextBlockStart).end + 1
          }
        }

        remainder.splice(insertAt, 0, ...block)
        return remainder.map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))
      }

      const nextIndex = itemIndex + direction
      if (nextIndex < 0 || nextIndex >= rows.length) return rows

      const moving = { ...row }
      const remainder = rows.filter((_, index) => index !== itemIndex)

      if (direction < 0) {
        const anchor = rows[nextIndex]
        if (!anchor) return rows
        if (anchor.row_type === 'group_header') {
          moving.group_id = anchor.group_id || null
          moving.group_name = ''
          remainder.splice(nextIndex + 1, 0, moving)
        } else {
          moving.group_id = anchor.group_id || null
          moving.group_name = ''
          remainder.splice(nextIndex, 0, moving)
        }
      } else {
        const anchor = rows[nextIndex]
        if (!anchor) return rows
        if (anchor.row_type === 'group_header') {
          moving.group_id = null
          moving.group_name = ''
          remainder.splice(nextIndex, 0, moving)
        } else {
          moving.group_id = anchor.group_id || null
          moving.group_name = ''
          remainder.splice(nextIndex, 0, moving)
        }
      }

      return remainder.map((entry, entryIndex) => ({ ...entry, sort_order: entryIndex }))
    })
  }

  // Render mobile rows with compact layout
  const renderMobileRows = () => {
    let itemNumber = 0

    return normalizedItems.map((item, index) => {
      if (item.row_type === 'group_header') {
        const group = normalizedGroups.find((entry) => entry.id === item.group_id)
        if (!group) return null

        const groupItems = normalizedItems.filter(
          (entry) => entry.row_type === 'standard' && entry.group_id === group.id,
        )
        const groupSubtotal = computedGroups.get(group.id)?.subtotal || 0

        return (
          <CompactGroupHeader
            key={item._uiKey || item.id || `quotation_group_${index}`}
            groupId={group.id}
            groupName={group.name || item.group_name || ''}
            showSubtotal={group.showSubtotal}
            subtotal={groupSubtotal}
            itemCount={groupItems.length}
            onNameChange={(name) => updateGroupName(group.id, name)}
            onToggleSubtotal={() => toggleGroupSubtotal(group.id)}
            onDelete={() => deleteGroup(group.id)}
            onAddItem={() => addItemToGroup(group.id)}
          >
            {groupItems.map((groupItem, groupIndex) => {
              itemNumber += 1
              const itemIndex = normalizedItems.indexOf(groupItem)

              return (
                <CompactItemRow
                  key={groupItem._uiKey || groupItem.id || `quotation_group_item_${group.id}_${itemIndex}`}
                  item={groupItem}
                  index={itemIndex}
                  number={itemNumber}
                  computedAmount={totals.items[itemIndex]?.line_subtotal || 0}
                  isVisible={isVisible}
                  getColumn={getColumn}
                  customColumns={visibleCustomColumns}
                  showItemImages={showItemImages}
                  isFirst={groupIndex === 0}
                  isLast={groupIndex === groupItems.length - 1}
                  isGrouped
                  onUpdate={(idx: number, field: string, value: unknown) => {
                    if (field === '__install_rate_override') {
                      applyRowPatch(idx, value as Partial<InvoiceItem>)
                      return
                    }
                    updateItem(idx, field, value)
                  }}
                  onRemove={removeItemAt}
                  onMoveUp={(idx: number) => moveItemBy(idx, -1)}
                  onMoveDown={(idx: number) => moveItemBy(idx, 1)}
                  onInsertBelow={() => addItemToGroup(group.id)}
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
          key={item._uiKey || item.id || `quotation_item_${index}`}
          item={item}
          index={index}
          number={itemNumber}
          computedAmount={totals.items[index]?.line_subtotal || 0}
          isVisible={isVisible}
          getColumn={getColumn}
          customColumns={visibleCustomColumns}
          showItemImages={showItemImages}
          isFirst={itemNumber === 1}
          isLast={index === normalizedItems.length - 1}
          onUpdate={(idx: number, field: string, value: unknown) => {
            if (field === '__install_rate_override') {
              applyRowPatch(idx, value as Partial<InvoiceItem>)
              return
            }
            updateItem(idx, field, value)
          }}
          onRemove={removeItemAt}
          onMoveUp={(idx: number) => moveItemBy(idx, -1)}
          onMoveDown={(idx: number) => moveItemBy(idx, 1)}
          onInsertBelow={() => insertItemAfter(index)}
        />
      )
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-2 pb-20 pt-3 sm:px-4 sm:pt-4">
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => navigate('/quotations')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {isEdit ? 'Edit Quotation' : 'New Quotation'}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-5 text-[10px] font-medium uppercase">
                {formatQuotationStatus(quotation.status || 'draft')}
              </Badge>
              {quotation.quotation_number && (
                <span className="text-xs text-muted-foreground">#{quotation.quotation_number}</span>
              )}
            </div>
          </div>
        </div>
        <input id="quotation-csv-import" type="file" accept=".csv" hidden onChange={handleCSVImport} />
      </header>

      {/* CSV Import Sheet */}
      <Sheet open={showCSVNote} onOpenChange={setShowCSVNote}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={isMobile ? 'max-h-[85vh] rounded-t-xl px-0' : 'w-full max-w-sm px-0'}
        >
          <SheetHeader className="border-b border-border px-4 pb-3">
            <SheetTitle className="text-sm font-semibold">Import Items</SheetTitle>
            <SheetDescription className="text-xs">
              Upload CSV or paste text. Items become editable before saving.
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-full flex-col overflow-hidden">
            <div className="overflow-y-auto px-4 py-3">
              <Tabs value={csvTab} onValueChange={setCSVTab} className="w-full">
                <TabsList className="mb-3 grid h-8 w-full grid-cols-2">
                  <TabsTrigger value="Upload File" className="text-xs">
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="Paste Text" className="text-xs">
                    Paste
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="Upload File" className="space-y-3">
                  <p className="rounded border border-border bg-muted/50 p-2 text-[11px] text-muted-foreground">
                    <strong>Required:</strong> description
                    <br />
                    <strong>Optional:</strong> sub_description, make, quantity, unit, unit_price
                  </p>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => document.getElementById('quotation-csv-import')?.click()}
                  >
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    Choose CSV File
                  </Button>
                </TabsContent>

                <TabsContent value="Paste Text" className="space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    <strong>Required:</strong> description |{' '}
                    <strong>Optional:</strong> sub_description, make, quantity, unit, unit_price
                  </p>
                  <Textarea
                    value={pasteCSV}
                    onChange={(event) => setPasteCSV(event.target.value)}
                    placeholder={'description,quantity,unit,unit_price\nCable tie,5,PCS,700'}
                    className="min-h-[140px] resize-y text-xs"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {csvTab === 'Paste Text' && (
              <div className="border-t border-border px-4 py-3">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setPasteCSV('')}>
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (!pasteCSV.trim()) {
                        alert('Paste CSV content before importing.')
                        return
                      }
                      const { newItems, error } = parseCsvItems(pasteCSV)
                      if (error) {
                        alert(error)
                        return
                      }
                      applyImportedItems(newItems)
                      setPasteCSV('')
                    }}
                  >
                    Import
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onUpdate={updateColumn}
          onToggle={toggleVisible}
          onAddCustom={addCustomColumn}
          onRemoveCustom={removeCustomColumn}
          onReset={resetColumns}
          onMove={moveColumn}
          onClose={() => setShowColumnManager(false)}
          vat={quotation.vat}
          setVat={(value: number) => updateQuotation('vat', value)}
          wht={quotation.wht}
          setWht={(value: number) => updateQuotation('wht', value)}
          whtType={whtType}
          setWhtType={setWhtType}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* Main Content */}
        <div className="space-y-3">
          {/* Client & Details Section */}
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
                  <ClientSelector
                    clientId={quotation.client_id}
                    clientName={quotation.client_name}
                    isMobile={isMobile}
                    onClientChange={(clientId: string, clientName: string) => {
                      updateQuotation('client_id', clientId)
                      updateQuotation('client_name', clientName)
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Issue Date
                    </Label>
                    <Input
                      type="date"
                      value={quotation.issue_date || ''}
                      onChange={(e) => updateQuotation('issue_date', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Valid Until
                    </Label>
                    <Input
                      type="date"
                      value={quotation.valid_until || ''}
                      onChange={(e) => updateQuotation('valid_until', e.target.value)}
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
                      value={quotation.quotation_number || ''}
                      onChange={(e) => updateQuotation('quotation_number', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      P.O. #
                    </Label>
                    <Input
                      value={quotation.po_number || ''}
                      onChange={(e) => updateQuotation('po_number', e.target.value)}
                      placeholder="Optional"
                      className="h-8 text-sm placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </Label>
                    <Select
                      value={quotation.status || 'draft'}
                      onValueChange={(value) => updateQuotation('status', value as Quotation['status'])}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUOTATION_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {formatQuotationStatus(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Scope Title
                    </Label>
                    <Input
                      value={quotation.quotation_title || ''}
                      onChange={(e) => updateQuotation('quotation_title', e.target.value)}
                      placeholder="Project scope"
                      className="h-8 text-sm placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Header Fields */}
          {headerFields.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between border border-border bg-card px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-muted/30"
                >
                  Header Fields ({headerFields.length})
                  <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]_&]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 border border-t-0 border-border bg-card p-3">
                  {headerFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        value={field.label || ''}
                        onChange={(e) =>
                          setHeaderFields((current) =>
                            current.map((entry) =>
                              entry.id === field.id ? { ...entry, label: e.target.value } : entry,
                            ),
                          )
                        }
                        placeholder="Label"
                        className="h-7 flex-1 text-sm"
                      />
                      <Input
                        value={field.value || ''}
                        onChange={(e) =>
                          setHeaderFields((current) =>
                            current.map((entry) =>
                              entry.id === field.id ? { ...entry, value: e.target.value } : entry,
                            ),
                          )
                        }
                        placeholder="Value"
                        className="h-7 flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive"
                        onClick={() =>
                          setHeaderFields((current) => current.filter((entry) => entry.id !== field.id))
                        }
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Add Header Field Button */}
          <button
            type="button"
            onClick={() =>
              setHeaderFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])
            }
            className="flex w-full items-center justify-center gap-1.5 border border-dashed border-border py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
          >
            <Plus className="h-3 w-3" />
            Add header field
          </button>

          {/* Scope of Work */}
          <div className="border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Scope of Work
              </h2>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setShowColumnManager(true)}
                >
                  <Settings2 className="h-3 w-3" />
                  Settings
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setShowCSVNote(true)}
                >
                  <FileSpreadsheet className="h-3 w-3" />
                  Import
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-primary"
                  onClick={addQuotationGroup}
                >
                  <Layers className="h-3 w-3" />
                  Group
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-primary"
                  onClick={addQuotationItem}
                >
                  <Plus className="h-3 w-3" />
                  Item
                </Button>
              </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-border">
              {isMobile ? (
                renderMobileRows()
              ) : (
                /* Desktop Table View */
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        <th className="w-8 px-2 py-2">#</th>
                        <th className="min-w-[200px] px-2 py-2">Description</th>
                        {isVisible('make') && <th className="px-2 py-2">Make</th>}
                        <th className="w-16 px-2 py-2">Qty</th>
                        {isVisible('unit') && <th className="w-20 px-2 py-2">Unit</th>}
                        <th className="w-24 px-2 py-2">Rate</th>
                        {isVisible('install_rate') && <th className="w-20 px-2 py-2">Install</th>}
                        {isVisible('vat_rate') && <th className="w-16 px-2 py-2">VAT%</th>}
                        {isVisible('discount_rate') && <th className="w-16 px-2 py-2">Disc%</th>}
                        {visibleCustomColumns.map((column) => (
                          <th key={column.key} className="px-2 py-2">
                            {column.label}
                          </th>
                        ))}
                        <th className="w-24 px-2 py-2">Amount</th>
                        <th className="w-8 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let itemNumber = 0
                        return normalizedItems.map((item, index) => {
                          if (item.row_type === 'group_header') {
                            const group = normalizedGroups.find((entry) => entry.id === item.group_id)
                            const groupSubtotal = group ? computedGroups.get(group.id)?.subtotal || 0 : 0
                            const colSpan =
                              6 +
                              (isVisible('make') ? 1 : 0) +
                              (isVisible('unit') ? 1 : 0) +
                              (isVisible('install_rate') ? 1 : 0) +
                              (isVisible('vat_rate') ? 1 : 0) +
                              (isVisible('discount_rate') ? 1 : 0) +
                              visibleCustomColumns.length

                            return (
                              <tr
                                key={item._uiKey || item.id || index}
                                className="border-b border-border bg-muted/30"
                              >
                                <td className="px-2 py-2 text-muted-foreground">—</td>
                                <td colSpan={colSpan} className="px-2 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-4 w-0.5 rounded-full bg-primary" />
                                    <Input
                                      value={item.group_name || ''}
                                      onChange={(e) =>
                                        group
                                          ? updateGroupName(group.id, e.target.value)
                                          : updateItem(index, 'group_name', e.target.value)
                                      }
                                      placeholder="Group name"
                                      className="h-7 max-w-xs border-0 bg-transparent font-semibold shadow-none focus-visible:ring-0"
                                    />
                                    {group && (
                                      <>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 gap-1 px-2 text-[10px] text-primary"
                                          onClick={() => addItemToGroup(group.id)}
                                        >
                                          <Plus className="h-3 w-3" />
                                          Item
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-[10px]"
                                          onClick={() => toggleGroupSubtotal(group.id)}
                                        >
                                          {group.showSubtotal ? 'Hide' : 'Show'} Subtotal
                                        </Button>
                                        {group.showSubtotal && (
                                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                                            ₦{Number(groupSubtotal || 0).toLocaleString()}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => (group ? deleteGroup(group.id) : removeItemAt(index))}
                                  >
                                    ×
                                  </Button>
                                </td>
                              </tr>
                            )
                          }

                          itemNumber += 1
                          const isGrouped = !!item.group_id

                          return (
                            <tr
                              key={item._uiKey || item.id || index}
                              className={`border-b border-border ${isGrouped ? 'bg-card' : ''}`}
                            >
                              <td className="px-2 py-1.5 text-muted-foreground">
                                {isGrouped && <span className="mr-1 text-primary/40">└</span>}
                                {itemNumber}
                              </td>
                              <td className="px-2 py-1.5">
                                <Input
                                  value={item.description || ''}
                                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                                  placeholder="Description"
                                  className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-0"
                                />
                                <Input
                                  value={item.sub_description || ''}
                                  onChange={(e) => updateItem(index, 'sub_description', e.target.value)}
                                  placeholder="Sub-description"
                                  className="h-6 border-0 bg-transparent text-xs text-muted-foreground shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
                                />
                              </td>
                              {isVisible('make') && (
                                <td className="px-2 py-1.5">
                                  <Input
                                    value={item.make || ''}
                                    onChange={(e) => updateItem(index, 'make', e.target.value)}
                                    className="h-7 text-sm"
                                  />
                                </td>
                              )}
                              <td className="px-2 py-1.5">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.quantity || 0}
                                  onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                  className="h-7 text-sm"
                                />
                              </td>
                              {isVisible('unit') && (
                                <td className="px-2 py-1.5">
                                  <UnitInput
                                    value={item.unit || ''}
                                    onChange={(value: string) => updateItem(index, 'unit', value)}
                                    className="h-7 text-sm"
                                  />
                                </td>
                              )}
                              <td className="px-2 py-1.5">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.unit_price || 0}
                                  onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                                  className="h-7 text-sm"
                                />
                              </td>
                              {isVisible('install_rate') && (
                                <td className="px-2 py-1.5">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.install_rate_override ? item.install_rate ?? '' : ''}
                                    onChange={(e) =>
                                      applyRowPatch(index, {
                                        install_rate_override: e.target.value !== '',
                                        install_rate: e.target.value === '' ? null : Number(e.target.value),
                                      })
                                    }
                                    placeholder="—"
                                    className="h-7 text-sm"
                                  />
                                </td>
                              )}
                              {isVisible('vat_rate') && (
                                <td className="px-2 py-1.5">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={item.vat_rate ?? ''}
                                    placeholder={String(quotation.vat || 0)}
                                    onChange={(e) =>
                                      updateItem(
                                        index,
                                        'vat_rate',
                                        e.target.value === '' ? null : Number(e.target.value),
                                      )
                                    }
                                    className="h-7 text-sm"
                                  />
                                </td>
                              )}
                              {isVisible('discount_rate') && (
                                <td className="px-2 py-1.5">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={item.discount_rate ?? ''}
                                    placeholder="—"
                                    onChange={(e) =>
                                      updateItem(
                                        index,
                                        'discount_rate',
                                        e.target.value === '' ? null : Number(e.target.value),
                                      )
                                    }
                                    className="h-7 text-sm"
                                  />
                                </td>
                              )}
                              {visibleCustomColumns.map((column) => (
                                <td key={column.key} className="px-2 py-1.5">
                                  <Input
                                    type={column.type === 'number' ? 'number' : 'text'}
                                    value={(item.custom_data || {})[column.key] || ''}
                                    onChange={(e) =>
                                      updateItem(index, 'custom_data', {
                                        ...(item.custom_data || {}),
                                        [column.key]:
                                          column.type === 'number'
                                            ? Number(e.target.value || 0)
                                            : e.target.value,
                                      })
                                    }
                                    className="h-7 text-sm"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-1.5 font-semibold text-foreground">
                                ₦{Number(totals.items[index]?.line_subtotal || 0).toLocaleString()}
                              </td>
                              <td className="px-2 py-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => removeItemAt(index)}
                                >
                                  ×
                                </Button>
                              </td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add Buttons */}
            <div className="flex gap-1 border-t border-border p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 flex-1 gap-1 text-xs text-primary"
                onClick={addQuotationItem}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 flex-1 gap-1 text-xs"
                onClick={addQuotationGroup}
              >
                <Layers className="h-3.5 w-3.5" />
                Add Group
              </Button>
            </div>
          </div>

          {/* Notes & Terms */}
          <InvoiceNotesTermsSection
            invoice={quotation}
            updateInvoice={updateQuotation}
            notesTitle={notesTitle}
            setNotesTitle={setNotesTitle}
            termsTitle={termsTitle}
            setTermsTitle={setTermsTitle}
          />

          {/* Bottom Fields */}
          <InvoiceCustomBottomFieldsSection
            bottomFields={bottomFields}
            setBottomFields={setBottomFields}
            emptyStateText="No custom footer fields yet."
            placeholder="Add a footer field"
          />
        </div>

        {/* Sidebar - Totals & Summary */}
        <div className="space-y-3">
          {/* Summary */}
          {(summaryHeaderFields.length > 0 || quotation.po_number) && (
            <div className="border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-3 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Summary
                </h3>
              </div>
              <div className="divide-y divide-border text-sm">
                {quotation.po_number && (
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-muted-foreground">P.O. Number</span>
                    <span className="font-medium">{quotation.po_number}</span>
                  </div>
                )}
                {summaryHeaderFields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-muted-foreground">{field.label}</span>
                    <span className="font-medium">{field.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals Panel */}
          <TotalsPanel
            totals={totals}
            quotation={quotation}
            discountType={discountType}
            discountTiming={discountTiming}
            whtType={whtType}
            mergeQtyUnit={mergeQtyUnit}
            showItemImages={showItemImages}
            useGlobalVatInput={calculationState.useGlobalVatInput}
            useGlobalDiscountInput={calculationState.useGlobalDiscountInput}
            onUpdateQuotation={updateQuotation}
            onSetDiscountType={setDiscountType}
            onSetDiscountTiming={setDiscountTiming}
            onSetWhtType={setWhtType}
            onSetMergeQtyUnit={setMergeQtyUnit}
            onSetShowItemImages={setShowItemImages}
          />

          {/* Save Actions */}
          <div className="sticky bottom-4 space-y-2">
            <Button
              type="button"
              className="w-full"
              disabled={saving}
              onClick={() => handleSave('sent')}
            >
              {saving ? 'Saving...' : isEdit ? 'Save Quotation' : 'Create Quotation'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={saving}
              onClick={() => handleSave('draft')}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate('/quotations')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
