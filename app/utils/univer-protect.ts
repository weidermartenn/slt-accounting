import type { RoleCode } from "~/utils/roles"

// перевод номера колонки в буквы (28 -> 'AB')
export const colLetter = (n: number) => {
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

// блокировка ТОЛЬКО строки заголовка
export async function lockHeaders(
  univerAPI: any,
  sheetIds: string[],
  columnCount: number,
  headerRow = 1
) {
  const wb = univerAPI.getActiveWorkbook()
  if (!wb) return

  const perm = wb.getPermission?.() ?? univerAPI.getPermission()
  if (!perm) return

  const point = perm.permissionPointsDefinition.RangeProtectionPermissionEditPoint
  const unitId = wb.getId()
  const lastCol = colLetter(columnCount)

  for (const sid of sheetIds) {
    const sheet = wb.getSheetBySheetId?.(sid) || wb.getActiveSheet()
    if (!sheet) continue

    const subUnitId = sheet.getSheetId()
    const range = sheet.getRange(`A${headerRow}:${lastCol}${headerRow}`) // вся строка заголовка

    const { permissionId } = await perm.addRangeBaseProtection(unitId, subUnitId, [range])
    perm.setRangeProtectionPermissionPoint(unitId, subUnitId, permissionId, point, false)
  }
}

export async function lockColumn(
  univerAPI: any,
  sheetIds: string[],
  columns: number[],
  opts?: { headerRow?: number; dataStartRow?: number }
) {
  const headerRow = opts?.headerRow ?? 1
  const dataStartRow = Math.max(headerRow + 1, opts?.dataStartRow ?? headerRow + 1)

  const wb = univerAPI.getActiveWorkbook()
  if (!wb) return

  const perm = wb.getPermission?.() ?? univerAPI.getPermission()
  if (!perm) return

  const point = perm.permissionPointsDefinition.RangeProtectionPermissionEditPoint
  const unitId = wb.getId()

  for (const sid of sheetIds) {
    const sheet = wb.getSheetBySheetId?.(sid) || wb.getActiveSheet()
    if (!sheet) continue

    const subUnitId = sheet.getSheetId()
    const cfg = sheet.getConfig?.() ?? {}
    const lastRow =
      (typeof cfg.rowCount === 'number' && cfg.rowCount > 0
        ? cfg.rowCount
        : (typeof sheet.getRowCount === 'function' ? sheet.getRowCount() : 0)) || 100000

    const ranges = columns
        .filter(c => c >= 1)
        .map(c => sheet.getRange?.(`${colLetter(c)}${dataStartRow}:${colLetter(c)}${lastRow}`))
        .filter(Boolean)
    
    if (ranges.length === 0) continue
    const { permissionId } = await perm.addRangeBaseProtection(unitId, subUnitId, ranges) 
    perm.setRangeProtectionPermissionPoint(unitId, subUnitId, permissionId, point, false)
  }
}

/**
 * per-cell правила
 * всегда блокируются 25 и 26 колонки
 * для ROLE_ADMIN, ROLE_BUH - все доступно
 * точечные editable: 9, 16, 24
 * 4 - нельзя редактировать
 * если 4, 10, 11, 17, 19 заполнены - строка блокируется, кроме 24
 */
export function applyCellLocks(row: any, role: RoleCode) {
  if (!row || typeof row !== 'object') return row
  row.cells ||= {}
  const ensure = (ci: number) => (row.cells[ci] = row.cells[ci] || {})

  // 1) ADMIN / BUH: всё доступно (кроме backend-only 25/26) и выходим
  if (role === 'ROLE_ADMIN' || role === 'ROLE_BUH') {
    for (let ci = 0; ci < 28; ci++) {
      ensure(ci).editable = (ci !== 25 && ci !== 26)
      if (row.cells[ci]?.s) delete row.cells[ci].s
    }
    return row
  }

  // 2) по умолчанию всё редактируемо
  for (let ci = 0; ci < 28; ci++) ensure(ci).editable = true

  // backend-only всегда RO
  ensure(25).editable = false
  ensure(26).editable = false

  // 3) хелпер для значений
  const has = (ci: number) => {
    const c = row.cells[ci]; const raw = c?.v ?? c?.text
    if (raw == null) return false
    const s = String(raw).trim().toLowerCase()
    return !(s === '' || s === 'null' || s === 'undefined' || s === 'nan' || s === 'false')
  }

  // 4) точечные: 4 — RO; 9/16/24 — условно
  ensure(4).editable = false

  ;[9,16,24].forEach(ci => { if (row.cells[ci]?.s) delete row.cells[ci].s }) // сброс старых стилей

  // 9 зависит от 10 и 11
  ensure(9).editable = !(has(10) && has(11))
  if (has(10) && has(11)) ensure(9).s = 'conditionallyFilled'

  // 16 зависит от 19
  ensure(16).editable = !has(19)
  if (has(19)) ensure(16).s = 'conditionallyFilled'

  // 24 зависит от 24 (самозаполнение)
  ensure(24).editable = !has(24)
  if (has(24)) ensure(24).s = 'conditionallyFilled'

  // 5) финальная «заморозка» строки (кроме 24)
  if ([4, 10, 11, 17, 19].every(has)) {
    for (let ci = 0; ci <= 26; ci++) {
      if (ci === 24) continue
      ensure(ci).editable = false
      ensure(ci).s = 'lockedRow'
    }
    ensure(24).editable = !has(24)
  }

  return row
}

// применить правила к строкам
export function applyLocksForSheet(sheetModel: any, role: RoleCode) {
  const rows = sheetModel?.data?.rows?._;
  if (!rows) return 

  Object.keys(rows).forEach((ri) => {
    if (ri === 'len') return
    applyCellLocks(rows[ri], role)
  })
}

// применить правила для всех листов активной книги
export async function applyEditableRules(univerAPI: any, role: RoleCode) {
  const workbook = univerAPI.getActiveWorkbook?.()
  if (!workbook) return

  const sheets = workbook.getSheets?.() ?? []
  for (const s of sheets) {
    const snap = s.getSnapshot?.() ?? s.getModel?.() ?? s
    if (snap?.data?.rows?._) {
      applyLocksForSheet(snap, role)

      if (typeof s.setSnapshot === 'function') {
        s.setSnapshot(snap)
      } else if (typeof workbook.applySnapshot === 'function' && typeof workbook.getSnapshot === 'function') {
        const wSnap = workbook.getSnapshot() 
        workbook.applySnapshot(wSnap)
      }
    }
  }
}

