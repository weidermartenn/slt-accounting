<template>
  <div class="relative" style="width: 100%; height: 90vh">
    <!-- Оверлей-лоадер -->
    <div
      v-if="showFallback"
      class="absolute inset-0 flex items-center justify-center bg-white/90 z-10"
    >
      <div class="text-center">
        <UIcon name="i-lucide-loader-pinwheel" class="w-10 h-10 animate-spin" />
        <p class="mt-2 text-lg font-medium">Загрузка данных таблицы</p>
      </div>
    </div>

    <!-- Индикатор сохранения -->
    <div
      v-if="showSaving"
      class="absolute right-25 -top-14 z-50 flex items-center bg-blue-600 text-white rounded-full px-4 py-2 shadow"
    >
      <UIcon name="i-lucide-loader" class="w-5 h-5 animate-spin" />
      <span class="ml-2">Сохраняем…</span>
    </div>

    <button @click="getName()">jsdh</button>
    <!-- Кнопка удаления строки -->
    <div class="absolute right-5 -top-12 z-50">
      <UButton
        :color="deleteState.pending ? 'error' : 'secondary'"
        :variant="deleteState.pending ? 'solid' : 'soft'"
        icon="i-lucide-trash-2"
        @click="onDeleteClick"
      >
        {{ deleteState.pending ? 'Подтвердите удаление' : 'Удалить строку' }}
      </UButton>
    </div>

    <!-- Контейнер Univer -->
    <div id="univer" :class="{ 'opacity-0': showFallback }" style="width: 100%; height: 100%" />
  </div>
</template>

<script setup lang="ts">
import { convertPositionCellToSheetOverGrid, DeleteWorksheetRangeThemeStyleMutation, UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreRuRU from '@univerjs/preset-sheets-core/locales/ru-RU'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import '@univerjs/preset-sheets-core/lib/index.css'
import '@univerjs/sheets-ui/lib/index.css'

import { STYLES } from './attributes/styles'
import { HEADERS } from './attributes/headers'
import type { TransportAccounting } from '~/entities/TransportAccountingDto/types'
import { autoFitColumnAndRowData } from '~/utils/autoFit'
import { lockHeaders, lockColumn, colLetter, applyEditableRules } from '~/utils/univer-protect'
import { COL2FIELD } from './attributes/col2field'

const props = defineProps<{ records: Record<string, any[]> }>()
const toast = useToast()

// Константы/состояние
const COLUMN_COUNT = HEADERS.length
const LOCKED_COLS = [4, 25, 26, 27] // 0-based: 5(E), 26(Z), 27(AA), 28(AB)
const SAVE_DEBOUNCE_MS = 3000
const SAVING_MIN_VISIBLE_MS = 800

const showFallback = ref(true)
const showSaving = ref(false)
const activeRow0 = ref(1)
let disposeSelSubs: any[] = []
const univerAPI = ref<any>(null)
let disposeCmd: any
let currentRoleCode = ''
const timers = new Map<string, number>()

const deleteState = reactive<{ pending: boolean; row0: number; timeout?: number | null}>({
  pending: false,
  row0: -1,
  timeout: null
})

/* ===== helpers ===== */
function waitContainerReady(id = 'univer') {
  return new Promise<void>(async (resolve, reject) => {
    await nextTick()
    const el = document.getElementById(id)
    if (!el) return reject(new Error('#univer not found'))
    if (el.clientWidth > 0 && el.clientHeight > 0) return resolve()
    const ro = new ResizeObserver((entries: any) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) { ro.disconnect(); resolve() }
    })
    ro.observe(el)
  })
}

function buildRowCells(rec: TransportAccounting) {
  const cell = (v: any, col: number) =>
    ({ v: v ?? '', s: LOCKED_COLS.includes(col) ? 'lockedCol' : 'allrows' } as { v: any; s: string })
  const row: Record<number, { v: any; s: string }> = {}
  row[0]  = cell(rec?.dateOfPickup, 0)
  row[1]  = cell(rec?.numberOfContainer, 1)
  row[2]  = cell(rec?.cargo, 2)
  row[3]  = cell(rec?.typeOfContainer, 3)
  row[4]  = cell(rec?.dateOfSubmission, 4)
  row[5]  = cell(rec?.addressOfDelivery, 5)
  row[6]  = cell(rec?.ourFirm, 6)
  row[7]  = cell(rec?.client, 7)
  row[8]  = cell(rec?.formPayAs, 8)
  row[9]  = cell(rec?.summa, 9)
  row[10] = cell(rec?.numberOfBill, 10)
  row[11] = cell(rec?.dateOfBill, 11)
  row[12] = cell(rec?.datePayment, 12)
  row[13] = cell(rec?.contractor, 13)
  row[14] = cell(rec?.driver, 14)
  row[15] = cell(rec?.formPayHim, 15)
  row[16] = cell(rec?.contractorRate, 16)
  row[17] = cell(rec?.sumIssued, 17)
  row[18] = cell(rec?.numberOfBillAdd, 18)
  row[19] = cell(rec?.dateOfPaymentContractor, 19)
  row[20] = cell(rec?.manager, 20)
  row[21] = cell(rec?.departmentHead, 21)
  row[22] = cell(rec?.clientLead, 22)
  row[23] = cell(rec?.salesManager, 23)
  row[24] = cell(rec?.additionalExpenses, 24)
  row[25] = cell(rec?.income, 25)
  row[26] = cell(rec?.incomeLearned, 26)
  row[27] = { v: rec?.id ?? '', s: 'idcol' }
  return row
}

const getName = () => {
  const wb = univerAPI.value.getActiveWorkbook()
  const sheet = wb.getActiveSheet()
  const snap = sheet.getSheet().getSnapshot()

  console.log(snap)
  
  if (snap.name) return snap.name
  return 'Транспортный учет'
}

function _updActiveRow(payload: any) {
  const r = 
    payload?.primary?.range?.startRow ??
    payload?.range?.startRow ??
    payload?.startRow
    payload?.row 
  if (typeof r === 'number' && r >=0 ) activeRow0.value = r
}

function bindSelectionWatcher(api: any) {
  try {
    const svc =
      api?._selectionManagerService ||
      api?._injector?.get?.('SelectionManagerService') ||
      api?._injector?.get?.(api.SelectionManagerService) // на всякий случай

    const subs: any[] = []
    const trySub = (obs: any) => {
      if (obs && typeof obs.subscribe === 'function') {
        subs.push(obs.subscribe((p: any) => _updActiveRow(p)))
      }
    }

    // разные названия потоков в версиях:
    trySub(svc?.selectionMoveStart$)
    trySub(svc?.selectionMoving$)
    trySub(svc?.selectionMoved$)
    trySub(svc?.selectionChanged$)

    disposeSelSubs = subs
  } catch {/* no-op */}
}

function readRowValues(sheet: any, row0: number): any[] {
  const row1 = row0 + 1
  const last = colLetter(COLUMN_COUNT)
  const a1 = `A${row1}:${last}${row1}`
  const vals2d = sheet.getRange?.(a1)?.getValues?.() || []
  return vals2d[0] || Array.from({ length: COLUMN_COUNT }, () => '')
}

function toDto(values: any[], listName: string) {
  const draft: Record<string, any> = { listName }

  for (let c = 0; c < COLUMN_COUNT; c++) {
    const key = COL2FIELD[c]; 
    if (!key) continue 
    draft[key] = values[c] ?? (key === 'id' ? 0 : '')
  }

  for (const k in draft) {
    const v = draft[k]
    draft[k] = (v == null ? '' : String(v).replace(/\r?\n/g, '').trim())
  }
  draft.id = Number(draft.id) || 0 
  return draft
}

function toPayload(values: any[]) {
  // backend save-модель хочет строки (включая числовые поля), id — число
  const draft: Record<string, any> = { taxes: '', income: '', incomeLearned: '' }
  for (let c = 0; c < COLUMN_COUNT; c++) {
    const key = COL2FIELD[c]; if (!key) continue
    draft[key] = values[c] ?? (key === 'id' ? 0 : '')
  }
  // нормализуем строки и id
  for (const k in draft) {
    const v = draft[k]
    draft[k] = (v == null ? '' : String(v).replace(/\r?\n/g, '').trim())
  }
  draft.id = Number(draft.id) || 0
  return draft
}

function getIdFromCell(sheet: any, row0: number): number {
  const a1 = `${colLetter(COLUMN_COUNT)}${row0 + 1}`
  const v = sheet.getRange?.(a1)?.getValues?.()?.[0]?.[0]
  const n = Number(String(v ?? '').trim())
  return Number.isFinite(n) && n > 0 ? n : 0
}

/* ===== автосохранение (дебаунс + индикатор) ===== */
function scheduleSave(sheet: any, row0: number) {
  const key = `${sheet.getSheetId?.()}::${row0}`
  if (timers.has(key)) { clearTimeout(timers.get(key)!); timers.delete(key) }

  const t = window.setTimeout(async () => {
    const started = performance.now()
    showSaving.value = true
    try {
      const values = readRowValues(sheet, row0)
      const listName = getName()
      const dto = toDto(values, listName)

      const empty = Object.entries(dto).every(([k, v]) => (k === 'id' ? v === 0 : v === '' || k === 'listName'))

      if (dto.id > 0) {
        await $fetch('/api/worktable/record-update', {
          method: 'PATCH',
          body: dto
        })
      } else {
        await $fetch('/api/worktable/record-add', {
          method: 'POST',
          body: [dto]
        })
      }
      console.log('Сохранено', dto)
    } catch (e: any) {
      toast.add({ title: 'Не удалось сохранить данные', description: e?.data?.statusMessage || e?.message, color: 'error' })
      console.error(e)
    } finally {
      const elapsed = performance.now() - started
      const rest = Math.max(0, SAVING_MIN_VISIBLE_MS - elapsed)
      if (rest) await new Promise(res => setTimeout(res, rest))
      showSaving.value = false
    }
  }, SAVE_DEBOUNCE_MS)

  timers.set(key, t)
}
/* ===== удаление строки ===== */
function selectWholeRow(sheet: any, row0: number) {
  const row1 = row0 + 1
  const a1 = `A${row1}:${colLetter(COLUMN_COUNT)}${row1}`
  const range = sheet.getRange?.(a1)
  if (range?.select) { try { range.select() } catch {} ; return }
  if (sheet.setSelection) { try { sheet.setSelection(row0, 0, 1, COLUMN_COUNT) } catch {} }
}

function getActiveRow0(api: any): number {
  try {
    const wb = api?.getActiveWorkbook?.()
    const sh = wb?.getActiveSheet?.()
    if (!sh) return 1

    // 1) Новый selection manager (часто лежит на api)
    const svc =
      api?._selectionManagerService ||
      api?._injector?.get?.('SelectionManagerService') ||
      api?._injector?.get?.(api.SelectionManagerService)

    // попробуем вытащить текущий selection из сервиса
    const cur =
      svc?.currentSelection ||
      svc?._currentSelection ||
      svc?.selection ||
      null

    const fromSvc =
      cur?.primary?.range?.startRow ??
      cur?.range?.startRow ??
      cur?.startRow ??
      cur?.row

    if (typeof fromSvc === 'number' && fromSvc >= 0) return fromSvc

    // 2) API листа: массив selections
    if (typeof sh.getSelections === 'function') {
      const sels = sh.getSelections() || []
      const sel = sels[0]
      const fromList =
        sel?.range?.startRow ??
        sel?.startRow ??
        sel?.row
      if (typeof fromList === 'number' && fromList >= 0) return fromList
    }

    // 3) Старый API листа: одиночный selection
    if (typeof sh.getSelection === 'function') {
      const sel = sh.getSelection()
      const fromSingle =
        sel?.range?.startRow ??
        sel?.startRow ??
        sel?.row
      if (typeof fromSingle === 'number' && fromSingle >= 0) return fromSingle
    }
  } catch {}

  // fallback: первая строка данных (после заголовка)
  return 1
}

async function onDeleteClick() {
  console.debug('[delete] active row0 =', getActiveRow0(univerAPI.value))

  const api = univerAPI.value 
  const workbook = api?.getActiveWorkbook?.()
  if (!workbook) return

  const sheet = workbook?.getActiveSheet?.()
  if (!sheet) return

  if (!deleteState.pending) {
    const r0 = Math.max(1, getActiveRow0(api))
    deleteState.pending = true
    deleteState.row0 = r0
    selectWholeRow(sheet, r0)

    if (deleteState.timeout) {
      clearTimeout(deleteState.timeout)
    }
    deleteState.timeout = window.setTimeout(() => {
      deleteState.pending = false
      deleteState.row0 = -1 
      deleteState.timeout = null
    }, 8000)
    return
  }

  // подтверждение
  const row0 = deleteState.row0 
  if (row0 < 1) {
    deleteState.pending = false 
    deleteState.row0 = 1 
    return
  }

  try {
    const id = getIdFromCell(sheet, row0) 
    if (id > 0) {
      await $fetch('/api/worktable/record-delete', {
        method: 'DELETE',
        body: [id]
      })
    }

    const row1 = row0 + 1 
    // A..D
    sheet.getRange?.(`A${row1}:D${row1}`)?.setValues?.([[ '', '', '', '' ]])
    // F..Y 
    const fy = Array.from({ length: 20 }, () => '')
    sheet.getRange?.(`F${row1}:Y${row1}`)?.setValues?.([fy])
    // AB (ID)
    sheet.getRange?.(`${colLetter(COLUMN_COUNT)}${row1}`)?.setValues?.([[ 0 ]])

    toast.add({
      title: 'Запись удалена',
      color: 'success',
      icon: 'i-lucide-check'
    })
  } catch (e: any) {
    toast.add({
      title: 'Не удалось удалить запись',
      color: 'error'
    })
    console.error(e)
  } finally {
    if (deleteState.timeout) {
      clearTimeout(deleteState.timeout)
    }
    deleteState.pending = false 
    deleteState.row0 = -1 
    deleteState.timeout = null
  }
}

function onKeydown (e: KeyboardEvent) {
  if (e.key !== 'Delete') return 
  const t = e.target as HTMLElement | null 
  const tag = t?.tagName?.toLowerCase?.()
  if (tag === 'input' || tag === 'textarea' || (t as any)?.isContentEditable) return 
  if (!deleteState.pending) onDeleteClick()
}

/* ===== инициализация Univer ===== */
const initializeUniver = async (records: Record<string, any[]>) => {
  await waitContainerReady('univer')

  const { univerAPI: api } = createUniver({
    locale: LocaleType.RU_RU,
    locales: {
      [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      [LocaleType.RU_RU]: mergeLocales(UniverPresetSheetsCoreRuRU)
    },
    presets: [UniverSheetsCorePreset({ container: 'univer', ribbonType: 'simple' })]
  })
  univerAPI.value = api

  const lc = api.addEvent(api.Event.LifeCycleChanged, (p: { stage: any }) => {
    if (p.stage === api.Enum.LifecycleStages.Rendered) showFallback.value = false
  })

  const sheets: Record<string, any> = {}
  let i = 0
  for (const [periodName, items] of Object.entries(records || {})) {
    const id = `sheet-${++i}`
    const data = Array.isArray(items) ? items : ([] as TransportAccounting[])
    const rows = Math.max(1, data.length + 1)
    const rowsToAdd = 1000 // запас пустых строк

    const headerRow: Record<number, { v: any; s?: string }> = {}
    HEADERS.forEach((h, col) => { headerRow[col] = { v: h, s: 'hdr' } })

    const cellData: Record<number, Record<number, { v: any }>> = { 0: headerRow }
    for (let r = 0; r < data.length; r++) cellData[r + 1] = buildRowCells(data[r]!)
    for (let r = data.length + 1; r < data.length + 1 + rowsToAdd; r++) {
      const empty: Record<number, { v: any }> = {}
      for (let c = 0; c < COLUMN_COUNT; c++) empty[c] = { v: '' }
      cellData[r] = empty
    }

    const { columnData, rowData } = autoFitColumnAndRowData(cellData, COLUMN_COUNT)

    sheets[id] = {
      id,
      name: periodName,
      tabColor: '#009999',
      hidden: 0,
      rowCount: data.length + 1 + rowsToAdd, // чтобы конфиг хранил общее число строк
      columnCount: COLUMN_COUNT,
      zoomRatio: 1,
      freeze: { startRow: 1, startColumn: 0, ySplit: 1, xSplit: 0 },
      defaultColumnWidth: 120,
      defaultRowHeight: 28,
      columnData,
      rowData,
      cellData,
      showGridlines: 1,
      rowHeader: { width: 50, hidden: 0 },
      columnHeader: { height: 20, hidden: 0 },
      rightToLeft: 0
    }
  }

  const order = Object.keys(sheets)
  univerAPI.value.createWorkbook({
    id: 'workbook-1',
    sheetOrder: order,
    name: 'SLT - Транпортный учет',
    styles: STYLES,
    sheets,
    resources: []
  })

  // Подписка на изменения (кросс-совместимая)
  const onExecuted = (cmd: any) => {
    try {
      const id = String(cmd?.id || '')
      const isWrite =
        id.includes('set-range-values') ||
        id.includes('paste') ||
        id.includes('clear-cell') ||
        id.includes('input') ||
        id.includes('edit')
      if (!isWrite) return

      const wb = api.getActiveWorkbook?.()
      const sheet =
        wb?.getActiveSheet?.() ||
        (cmd?.params?.sheetId ? wb?.getSheetBySheetId?.(cmd.params.sheetId) : undefined)
      if (!sheet) return

      const p = cmd?.params || {}
      const rng = p.range || (Array.isArray(p.ranges) ? p.ranges[0] : {}) || {}
      let r0 = (rng.startRow ?? p.row ?? p.startRow ?? 0)
      let r1 = (rng.endRow ?? p.row ?? p.endRow ?? r0)
      for (let row0 = r0; row0 <= r1; row0++) { if (row0 !== 0) scheduleSave(sheet, row0) } // пропустить заголовок
    } catch {}
  }
  if (typeof api.onCommandExecuted === 'function') disposeCmd = api.onCommandExecuted(onExecuted)
  else if (api.Event?.CommandExecuted && typeof api.addEvent === 'function') disposeCmd = api.addEvent(api.Event.CommandExecuted, onExecuted)

  // Защита + per-cell правила
  await lockHeaders(univerAPI.value, order, COLUMN_COUNT, 1)
  await lockColumn(univerAPI.value, order, [5, 26, 27], { headerRow: 1 })

  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const me: any = await $fetch('/api/auth/me', { headers })
  currentRoleCode = me?.value?.roleCode || me?.roleCode || ''
  await applyEditableRules(univerAPI.value, currentRoleCode as RoleCode)

  bindSelectionWatcher(univerAPI.value)
  window.addEventListener('keydown', onKeydown)
  return lc
}

// Запуск/очистка
watch(() => props.records, async (n) => {
  if (Object.keys(n || {}).length > 0) {
    showFallback.value = true
    await initializeUniver(n as Record<string, any[]>)
  }
}, { deep: false, immediate: true })

onMounted(async () => {
  if (Object.keys(props.records || {}).length > 0) {
    await initializeUniver(props.records)
  }
})

onUnmounted(() => {
  if (disposeCmd?.dispose) disposeCmd.dispose()
  timers.forEach((t) => clearTimeout(t))
  timers.clear()
  window.removeEventListener('keydown', onKeydown)
  disposeSelSubs.forEach(s => { 
    try {
      s?.unsubscribe?.()
    } catch {}
  })
  disposeSelSubs = []
})
</script>