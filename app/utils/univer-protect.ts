// функция для защиты заголовк и столбцов от редактирования

// translate col number to letter
export const colLetter = (n: number) => {
    let s = ''
    while (n > 0) {
        const m = (n - 1) % 26
        s = String.fromCharCode(65 + m) + s
        n = Math.floor((n - 1) / 26)
    }
    return s
}

export async function lockCells(
  univerAPI: any,
  sheetIds: string[],
  {
    columnCount,
    headerRow = 1,
    lockColumns = [5, 26, 27, 28],
    dataStartRow = headerRow + 1
  }: {
    columnCount: number
    headerRow?: number
    lockColumns?: number[]
    dataStartRow?: number
  }
) {
  const workbook = univerAPI.getActiveWorkbook()
  if (!workbook) return

  const permission = workbook.getPermission?.() ?? univerAPI.getPermission?.()
  if (!permission) return

  const point = permission.permissionPointsDefinition.RangeProtectionPermissionEditPoint
  const unitId = workbook.getId()

  for (const sid of sheetIds) {
    const sheet = workbook.getSheetBySheetId?.(sid) || workbook.getActiveSheet()
    if (!sheet) continue

    const subUnitId = sheet.getSheetId()
    const cfg = sheet.getConfig?.() ?? {}
    const lastRow =
      (typeof cfg.rowCount === 'number' && cfg.rowCount > 0
        ? cfg.rowCount
        : (typeof sheet.getRowCount === 'function' ? sheet.getRowCount() : 0)) || 100000

    // 1) Лочим ТОЛЬКО строку заголовка (все колонки)
    {
      const headerRange = sheet.getRangeByRowCol(headerRow, 1, 1, columnCount)
      const { permissionId } = await permission.addRangeBaseProtection(unitId, subUnitId, [headerRange])
      permission.setRangeProtectionPermissionPoint(unitId, subUnitId, permissionId, point, false)
    }

    // 2) Лочим ТОЛЬКО указанные колонки с dataStartRow до конца
    const rowSpan = Math.max(0, lastRow - dataStartRow + 1)
    if (rowSpan > 0) {
      for (const colNum of lockColumns) {
        if (colNum < 1 || colNum > columnCount) continue
        const colRange = sheet.getRangeByRowCol(dataStartRow, colNum, rowSpan, 1)
        const { permissionId } = await permission.addRangeBaseProtection(unitId, subUnitId, [colRange])
        permission.setRangeProtectionPermissionPoint(unitId, subUnitId, permissionId, point, false)
      }
    }
  }
}