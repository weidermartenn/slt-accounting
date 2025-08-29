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