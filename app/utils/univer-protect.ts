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
  if (!row || typeof row !== 'object') return row;
  row.cells ||= {};
  const ensureCell = (ci: number) => (row.cells[ci] = row.cells[ci] || {});

  ensureCell(25).editable = false;
  ensureCell(26).editable = false;

  if (role === 'ROLE_ADMIN' || role === 'ROLE_BUH') {
    for (let ci = 0; ci < 28; ci++) {
      if (ci !== 25 && ci !== 26) {
        ensureCell(ci).editable = true;
      }
    }
  }

  const hasValue = (ci: number) => {
    const c = row.cells[ci];
    const raw = c?.v ?? c?.text;
    if (raw == null) return false;
    const s = String(raw).trim().toLowerCase();
    return !(s === '' || s === 'null' || s === 'undefined' || s === 'nan' || s === 'false');
  };

  // Условное форматирование для ячеек
  if (hasValue(10) && hasValue(11)) {
    ensureCell(9).s = 'conditionallyFilled';
  }
  if (hasValue(19)) {
    ensureCell(16).s = 'conditionallyFilled';
  }
  if (hasValue(24)) {
    ensureCell(24).s = 'conditionallyFilled';
  }

  ensureCell(9).editable = !(hasValue(10) && hasValue(11));
  ensureCell(16).editable = !hasValue(19);
  ensureCell(24).editable = !hasValue(24);
  ensureCell(4).editable = false;

  if ([4, 10, 11, 17, 19].every(hasValue)) {
    for (let ci = 0; ci <= 26; ci++) {
      if (ci === 24) continue;
      ensureCell(ci).editable = false;
      ensureCell(ci).s = 'lockedRow'; // Применяем стиль для заблокированных строк
    }
    ensureCell(24).editable = !hasValue(24);
  }

  return row;
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
  const workbook = univerAPI.getActiveWorkbook?.();
  if (!workbook) return 

  const sheets = workbook.getSheets?.() ?? []
  for (const s of sheets) {
    const snap = s.getSnapshot?.() ?? s.getModel?.() ?? s
    if (snap?.data?.rows?._) {
      applyLocksForSheet(snap, role)
      if (typeof s.setSnapshot === 'function') s.setSnapshot(snap)
      else if (typeof workbook.applySnapshot === 'function' && typeof workbook.getSnapShot === 'function') {
        const wSnap = workbook.getSnapshot()
        workbook.applySnapshot(wSnap)
      }
    }
  }
}

