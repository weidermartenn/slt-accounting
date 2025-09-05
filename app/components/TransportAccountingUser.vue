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
      class="absolute left-1/2 -translate-x-1/2 -top-13 z-50 flex items-center text-zinc-900 rounded-sm px-4 py-2 shadow"
    >
      <UIcon name="i-lucide-loader" class="w-5 h-5 animate-spin" />
      <span class="ml-2">Сохранение</span>
    </div>

    <!-- Кнопки управления -->
    <div class="absolute right-5 -top-12 z-50 flex gap-2">
      <!-- <UButton
        :disabled="!hasChanges"
        @click="saveChanges"
        color="warning"
        variant="soft"
        icon="i-lucide-save"
      >
        Сохранить запись
      </UButton> -->
      <UButton
        :color="deleteState.pending ? 'error' : 'secondary'"
        :variant="deleteState.pending ? 'solid' : 'soft'"
        icon="i-lucide-trash-2"
        @click="onDeleteClick"
      >
        {{ deleteState.pending ? "Подтвердите удаление" : "Удалить строки" }}
      </UButton>
    </div>

    <!-- Контейнер Univer -->
    <div
      id="univer"
      :class="{ 'opacity-0': showFallback }"
      style="width: 100%; height: 100%"
    />
  </div>
</template>

<script setup lang="ts">
// ===== imports =====
import { STYLES } from "./attributes/styles";
import { HEADERS } from "./attributes/headers";
import { COL2FIELD } from "./attributes/col2field";
import { createTempId } from "~/utils/tempId";
import type { TransportAccounting } from "~/entities/TransportAccountingDto/types";
import type { TransportAccountingSR } from "~/entities/TransportAccountingSaveRequestDto/types";
import type {
  TransportAccountingUpdateDto,
  TransportAccountingUpdateRequest,
} from "~/entities/TransportAccountingUpdateRequest/types";
import { autoFitColumnAndRowData } from "~/utils/autoFit";
import {
  lockHeaders,
  lockColumn,
  colLetter,
  applyEditableRules,
} from "~/utils/univer-protect";
import type { RoleCode } from "~/utils/roles";
import { useSheetStore } from "~/stores/sheet-store";
import { ArrangeTypeEnum, get } from "@univerjs/presets";
import {
  convertPositionCellToSheetOverGrid,
  degToRad,
} from "@univerjs/preset-sheets-core";

const toast = useToast();
const sheetStore = useSheetStore();

// ===== univer dynamic modules (загружаем один раз) =====
let UniverSheetsCorePreset: any;
let UniverPresetSheetsCoreRuRU: any;
let UniverPresetSheetsCoreEnUS: any;
let createUniver: any;
let LocaleType: any;
let mergeLocales: any;

let libsLoaded = false;
async function ensureUniverLoaded() {
  if (libsLoaded) return;
  await import("@univerjs/preset-sheets-core/lib/index.css");
  await import("@univerjs/sheets-ui/lib/index.css");
  ({ UniverSheetsCorePreset } = await import("@univerjs/preset-sheets-core"));
  ({ default: UniverPresetSheetsCoreRuRU } = await import(
    "@univerjs/preset-sheets-core/locales/ru-RU"
  ));
  ({ default: UniverPresetSheetsCoreEnUS } = await import(
    "@univerjs/preset-sheets-core/locales/en-US"
  ));
  ({ createUniver, LocaleType, mergeLocales } = await import(
    "@univerjs/presets"
  ));
  libsLoaded = true;
}

// ===== state / consts =====
const hasChanges = ref(false);
const COLUMN_COUNT = HEADERS.length;
const LOCKED_COLS = ref<number[]>([]);
const SAVE_DEBOUNCE_MS_DEFAULT = 100;
const SAVE_DEBOUNCE_MS_MANUAL = 30000;
const SAVING_MIN_VISIBLE_MS = 800;

const showFallback = ref(true);
const showSaving = ref(false);
const univerAPI = ref<any>(null);
let disposeCmd: any;
let currentRoleCode = "";
const timers = new Map<string, number>();
const currentEditingRow = ref<number | null>(null);
const socketPatchRows = new Set<number>();

const SKIP_COLS = new Set<number>([4, 25, 26]);

const deleteState = reactive<{
  pending: boolean;
  rows: number[];
  timeout?: number | null;
}>({
  pending: false,
  rows: [],
  timeout: null,
});

// роль + правила редактирования
const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const me: any = await $fetch("/api/auth/me", { headers });
currentRoleCode = me.roleCode;

// ===== helpers =====
function waitContainerReady(id = "univer") {
  return new Promise<void>(async (resolve, reject) => {
    await nextTick();
    const el = document.getElementById(id);
    if (!el) return reject(new Error("#univer not found"));
    if (el.clientWidth > 0 && el.clientHeight > 0) return resolve();
    const ro = new ResizeObserver((entries: any) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        ro.disconnect();
        resolve();
      }
    });
    ro.observe(el);
  });
}

function buildRowCells(rec: TransportAccounting) {
  const cell = (v: any, col: number) =>
    ({
      v: v ?? "",
      s: LOCKED_COLS.value.includes(col) ? "lockedCol" : "allrows",
    } as { v: any; s: string });

  const row: Record<number, { v: any; s: string }> = {};
  row[0] = cell(rec?.dateOfPickup, 0);
  row[1] = cell(rec?.numberOfContainer, 1);
  row[2] = cell(rec?.cargo, 2);
  row[3] = cell(rec?.typeOfContainer, 3);
  row[4] = cell(rec?.dateOfSubmission, 4);
  row[5] = cell(rec?.addressOfDelivery, 5);
  row[6] = cell(rec?.ourFirm, 6);
  row[7] = cell(rec?.client, 7);
  row[8] = cell(rec?.formPayAs, 8);
  row[9] = cell(rec?.summa, 9);
  row[10] = cell(rec?.numberOfBill, 10);
  row[11] = cell(rec?.dateOfBill, 11);
  row[12] = cell(rec?.datePayment, 12);
  row[13] = cell(rec?.contractor, 13);
  row[14] = cell(rec?.driver, 14);
  row[15] = cell(rec?.formPayHim, 15);
  row[16] = cell(rec?.contractorRate, 16);
  row[17] = cell(rec?.sumIssued, 17);
  row[18] = cell(rec?.numberOfBillAdd, 18);
  row[19] = cell(rec?.dateOfPaymentContractor, 19);
  row[20] = cell(rec?.manager, 20);
  row[21] = cell(rec?.departmentHead, 21);
  row[22] = cell(rec?.clientLead, 22);
  row[23] = cell(rec?.salesManager, 23);
  row[24] = cell(rec?.additionalExpenses, 24);
  row[25] = cell(rec?.income, 25);
  row[26] = cell(rec?.incomeLearned, 26);
  row[27] = { v: rec?.id ?? "", s: "idcol" };
  return row;
}

function getWorksheet(api: any) {
  const wb = api.getActiveWorkbook();
  const sheet = wb.getActiveSheet();
  return sheet;
}
function getName() {
  const snap = getWorksheet(univerAPI.value).getSheet().getSnapshot();
  return snap.name || "Транспортный учет";
}

function getActiveRange() {
  const activeSelection = getWorksheet(univerAPI.value).getSelection();
  return activeSelection.getActiveRange();
}

function getSelectedRows(): number[] {
  const activeRange = getActiveRange();
  if (!activeRange) return [];
  const startRow = activeRange._range.startRow;
  const endRow = activeRange._range.endRow;
  if (startRow === 0 && endRow === 0) return []; // игнор заголовка
  const rows: number[] = [];
  for (let i = startRow; i <= endRow; i++) {
    if (i > 0) rows.push(i);
  }
  return rows;
}

function readRowValues(sheet: any, row0: number): string[] {
  const row1 = row0 + 1;
  const last = colLetter(COLUMN_COUNT);
  const a1 = `A${row1}:${last}${row1}`;
  const vals2d = sheet.getRange?.(a1)?.getValues?.() || [];
  const result = vals2d[0] || Array.from({ length: COLUMN_COUNT }, () => "");
  return result;
}

function isRowEmpty(values: any[]): boolean {
  for (let c = 0; c < COLUMN_COUNT; c++) {
    const key = COL2FIELD[c];
    if (!key || key === "id") continue;
    const raw = values[c];
    const s = (raw == null ? "" : String(raw)).trim().toLowerCase();
    if (s !== "" && s !== "null" && s !== "undefined") return false;
  }
  return true;
}

function toDto(values: any[], listName: string): TransportAccountingSR {
  const draft: Partial<TransportAccountingSR> = {
    listName,
    id: 0,
    additionalExpenses: "",
    addressOfDelivery: "",
    cargo: "",
    client: "",
    clientLead: "",
    contractor: "",
    contractorRate: "",
    dateOfBill: "",
    dateOfPaymentContractor: "",
    dateOfPickup: "",
    dateOfSubmission: "",
    datePayment: "",
    departmentHead: "",
    driver: "",
    formPayAs: "",
    formPayHim: "",
    manager: "",
    numberOfBill: "",
    numberOfBillAdd: "",
    numberOfContainer: "",
    ourFirm: "",
    salesManager: "",
    sumIssued: "",
    summa: "",
    typeOfContainer: "",
    income: "",
    incomeLearned: "",
  };

  for (let c = 0; c < COLUMN_COUNT; c++) {
    const key = COL2FIELD[c];
    if (!key) continue;
    draft[key as keyof TransportAccountingSR] =
      values[c] ?? (key === "id" ? 0 : "");
  }

  for (const k in draft) {
    const v = draft[k as keyof TransportAccountingSR];
    draft[k as keyof TransportAccountingSR] = (
      v == null ? "" : String(v).replace(/\r?\n/g, "").trim()
    ) as never;
  }
  draft.id = Number(draft.id) || 0;
  return draft as TransportAccountingSR;
}

function getIdFromCell(sheet: any, row0: number): number {
  const a1 = `${colLetter(COLUMN_COUNT)}${row0 + 1}`;
  const v = sheet.getRange?.(a1)?.getValues?.()?.[0]?.[0];
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getIdsFromRows(sheet: any, rows: number[]): number[] {
  const ids: number[] = [];
  for (const row of rows) {
    const id = getIdFromCell(sheet, row);
    if (id > 0) ids.push(id);
  }
  return ids;
}

function findRowById(sheet: any, id: number): number {
  const rowCount = sheet.getSheet()._snapshot.rowCount;
  console.log('[findRowById] rowCount', rowCount);
  const idColA1 = colLetter(COLUMN_COUNT);
  console.log('[findRowById] idColA1', idColA1);
  for (let r1 = 1; r1 <= rowCount; r1++) {
    const cell = sheet.getRange(`${idColA1}${r1}`).getValue();
    if (Number(cell) === id) return r1 - 1;
  }
  return -1
}

function patchRowValuesExceptProtected(sheet: any, rowIndex: number, dto: TransportAccounting) {
  // запоминаем эту строку для патча чтобы подавить scheduleSave
  socketPatchRows.add(rowIndex);
  try {
    for (let c = 0; c < COLUMN_COUNT; c++) {
      if (SKIP_COLS.has(c)) continue;
      const key = COL2FIELD[c];
      if (!key) continue;
      const v = (dto as any)[key] ?? "";
      sheet.getRange(rowIndex, c).setValue(v);
    }

    sheet.getRange(rowIndex, COLUMN_COUNT - 1).setValue(dto.id);
  } finally {
    queueMicrotask(() => socketPatchRows.delete(rowIndex))
  }
}

const tempIdToRowMap = ref(new Map<number, number>()); // tmepId -> rowIndex
// ===== автосохранение =====
function scheduleSave(sheet: any, row0: number) {
  const key = `${sheet.getSheetId?.()}::${row0}`;
  if (timers.has(key)) {
    clearTimeout(timers.get(key)!);
    timers.delete(key);
  }
  hasChanges.value = true;
  currentEditingRow.value = row0;

  const t = window.setTimeout(
    async () => {
      const started = performance.now();
      showSaving.value = true;
      try {
        const values = readRowValues(sheet, row0);
        const listName = getName();
        const dto: TransportAccountingSR = toDto(values, listName);

        if (!dto.id && isRowEmpty(values)) {
          if (!sheet.getRange(row0, COLUMN_COUNT - 1).getValue()) {
            const tempId = createTempId();
            sheet.getRange(row0, COLUMN_COUNT - 1).setValue(tempId);
            tempIdToRowMap.value.set(tempId, row0);
          }
          hasChanges.value = false;
        } else {
          console.log("[save] начало сохранения строки", row0);
          console.log("[save] данные", values);
          console.log("[save] dto для отправки", dto);
          // обновляем локально
          sheetStore.applyLocalChange(dto);
        }

        try {
          await sheetStore.upsertOne(dto);
          await applyEditableRules(
            univerAPI.value,
            currentRoleCode as RoleCode
          );
        } catch {
          toast.add({
            title: "Не удалось применить правила редактирования",
            color: "warning",
          });
        }
        hasChanges.value = false;
      } catch (e: any) {
        toast.add({
          title: "Не удалось сохранить данные",
          description: e?.message,
          color: "error",
        });
        console.error(e?.data || e);
      } finally {
        const elapsed = performance.now() - started;
        const rest = Math.max(0, SAVING_MIN_VISIBLE_MS - elapsed);
        if (rest) await new Promise((res) => setTimeout(res, rest));
        showSaving.value = false;
      }
    },
    hasChanges.value ? SAVE_DEBOUNCE_MS_DEFAULT : SAVE_DEBOUNCE_MS_MANUAL
  );
  timers.set(key, t);
}

// ===== удаление строки =====
function selectRows(sheet: any, rows: number[]) {
  if (rows.length === 0) return;

  const firstRow = Math.min(...rows);
  const lastRow = Math.max(...rows);
  const row1 = firstRow + 1;
  const row2 = lastRow + 1;

  const a1 = `A${row1}:${colLetter(COLUMN_COUNT)}${row2}`;
  const range = sheet.getRange?.(a1);
  if (range?.select) {
    try {
      range.select();
    } catch {}
    return;
  }

  if (sheet.setSelection) {
    try {
      sheet.setSelection(firstRow, 0, lastRow - firstRow + 1, COLUMN_COUNT);
    } catch {}
  }
}

async function onDeleteClick() {
  const api = univerAPI.value;
  const workbook = api?.getActiveWorkbook?.();
  if (!workbook) return;
  const sheet = workbook?.getActiveSheet?.();
  if (!sheet) return;

  const selectedRows = getSelectedRows();
  if (selectedRows.length === 0) {
    toast.add({ title: "Нет выделенных строк для удаления", color: "warning" });
    return;
  }

  if (!deleteState.pending) {
    deleteState.pending = true;
    deleteState.rows = selectedRows;
    selectRows(sheet, selectedRows);
    if (deleteState.timeout) clearTimeout(deleteState.timeout);
    deleteState.timeout = window.setTimeout(() => {
      deleteState.pending = false;
      deleteState.rows = [];
      deleteState.timeout = null;
    }, 8000);
    return;
  }

  // подтверждено
  try {
    const ids = getIdsFromRows(sheet, deleteState.rows);
    if (ids.length > 0) {
      await sheetStore.deleteByIds(ids);
    }

    const uSheet = api
      .getActiveWorkbook()
      .getSheetBySheetId?.(sheet.getSheetId());
    if (uSheet) {
      for (const row of [...deleteState.rows].sort((a, b) => b - a)) {
        uSheet.deleteRows(row, 1);
      }
    }
    toast.add({
      title: `Удалено ${deleteState.rows.length} записей`,
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (e: any) {
    toast.add({ title: "Не удалось удалить записи", color: "error" });
    console.error(e);
  } finally {
    if (deleteState.timeout) clearTimeout(deleteState.timeout);
    deleteState.pending = false;
    deleteState.rows = [];
    deleteState.timeout = null;
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== "Delete") return;
  const t = e.target as HTMLElement | null;
  const tag = t?.tagName?.toLowerCase?.();
  if (tag === "input" || tag === "textarea" || (t as any)?.isContentEditable)
    return;
  if (!deleteState.pending) onDeleteClick();
}

// ===== инициализация Univer =====
const initializeUniver = async (records: Record<string, any[]>) => {
  await ensureUniverLoaded(); // важный фикс гонки с LocaleType
  await waitContainerReady("univer");

  const { univerAPI: api } = createUniver({
    locale: LocaleType.RU_RU,
    locales: {
      [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      [LocaleType.RU_RU]: mergeLocales(UniverPresetSheetsCoreRuRU),
    },
    presets: [
      UniverSheetsCorePreset({ container: "univer", ribbonType: "simple" }),
    ],
  });

  univerAPI.value = api;

  const lc = api.addEvent(api.Event.LifeCycleChanged, (p: { stage: any }) => {
    if (p.stage === api.Enum.LifecycleStages.Rendered)
      showFallback.value = false;
  });

  // формируем листы
  const sheets: Record<string, any> = {};
  let i = 0;
  for (const [periodName, items] of Object.entries(records || {})) {
    const id = `sheet-${++i}`;
    const data = Array.isArray(items) ? (items as TransportAccounting[]) : [];
    const rowsToAdd = 1000;

    const headerRow: Record<number, { v: any; s?: string }> = {};
    HEADERS.forEach((h, col) => {
      headerRow[col] = { v: h, s: "hdr" };
    });

    const cellData: Record<number, Record<number, { v: any; s?: string }>> = {
      0: headerRow,
    };
    for (let r = 0; r < data.length; r++)
      cellData[r + 1] = buildRowCells(data[r]!);
    for (let r = data.length + 1; r < data.length + 1 + rowsToAdd; r++) {
      const empty: Record<number, { v: any; s?: string }> = {};
      for (let c = 0; c < COLUMN_COUNT; c++) empty[c] = { v: "", s: "allrows" };
      cellData[r] = empty;
    }

    const { columnData, rowData } = autoFitColumnAndRowData(
      cellData,
      COLUMN_COUNT
    );
    sheets[id] = {
      id,
      name: periodName,
      tabColor: "#009999",
      hidden: 0,
      rowCount: data.length + 1 + rowsToAdd,
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
      rightToLeft: 0,
    };
  }

  const order = Object.keys(sheets);
  univerAPI.value.createWorkbook({
    id: "workbook-1",
    sheetOrder: order,
    name: "TransportAccounting",
    styles: STYLES,
    sheets,
    resources: [],
  });

  const onSelectionChange = (event: any) => {
    const selection = event.selection;
    if (selection && selection.range) {
      currentEditingRow.value = selection.range.startRow;
    }
  };

  api.getActiveWorkbook().onSelectionChange(onSelectionChange);

  const onExecuted = (cmd: any) => {
    try {
      const id = String(cmd?.id || "");
      const isWrite =
        id.includes("set-range-values") ||
        id.includes("paste") ||
        id.includes("clear-cell") ||
        id.includes("input") ||
        id.includes("edit");
      if (!isWrite) return;

      const wb = api.getActiveWorkbook?.();
      const sheet =
        wb?.getActiveSheet?.() ||
        (cmd?.params?.sheetId
          ? wb?.getSheetBySheetId?.(cmd.params.sheetId)
          : undefined);
      if (!sheet) return;

      const p = cmd?.params || {};
      const rng = p.range || (Array.isArray(p.ranges) ? p.ranges[0] : {}) || {};
      let r0 = rng.startRow ?? p.row ?? p.startRow ?? 0;
      let r1 = rng.endRow ?? p.row ?? p.endRow ?? r0;

      for (let row0 = r0; row0 <= r1; row0++) {
        if (socketPatchRows.has(row0)) continue;
        if (row0 !== 0) scheduleSave(sheet, row0);
      }
    } catch {}
  };

  if (typeof api.onCommandExecuted === "function") {
    disposeCmd = api.onCommandExecuted(onExecuted);
  } else if (api.Event?.CommandExecuted && typeof api.addEvent === "function") {
    disposeCmd = api.addEvent(api.Event.CommandExecuted, onExecuted);
  }

  // блокировки
  await lockHeaders(univerAPI.value, order, COLUMN_COUNT, 1);
  if (
    currentRoleCode === "ROLE_ADMIN" ||
    currentRoleCode === "ROLE_BUH" ||
    currentRoleCode === "ROLE_MANAGER"
  ) {
    await lockColumn(univerAPI.value, order, [26, 27], {
      headerRow: 1,
      dataStartRow: 2,
    });
    LOCKED_COLS.value = [26, 27];
  } else {
    await lockColumn(univerAPI.value, order, [5, 26, 27], {
      headerRow: 1,
      dataStartRow: 2,
    });
    LOCKED_COLS.value = [5, 26, 27];
  }

  await applyEditableRules(univerAPI.value, currentRoleCode as RoleCode);

  // hotkeys
  window.addEventListener("keydown", onKeydown);
  return lc;
};

// ===== lifecycle =====
onMounted(async () => {
  // инициализация Univer (загрузка либ + отрисовка)
  await ensureUniverLoaded();
  const hasData = Object.keys(sheetStore.records || {}).length > 0;
  if (hasData) {
    showFallback.value = true;
    await initializeUniver(sheetStore.records as Record<string, any[]>);
  }
  // узнаём роль и подтягиваем данные
  const headers = import.meta.server
    ? useRequestHeaders(["cookie"])
    : undefined;
  const me: any = await $fetch("/api/auth/me", { headers }).catch(() => null);
  currentRoleCode = me?.roleCode || "";

  console.log("Текущая роль", currentRoleCode);

  const { $wsOnMessage } = useNuxtApp();

  if ($wsOnMessage) {
    // @ts-ignore
    $wsOnMessage((msg: SocketEvent) => {
      const listName = getName();
      sheetStore.applySocketMessage(msg, listName);

      // Обработка создания новых записей
      if (msg.type === "status_create" && msg.transportAccountingDTO?.length) {
        const dto = msg.transportAccountingDTO[0];

        // Используем текущую редактируемую строку, если она есть
        if (currentEditingRow.value !== null) {
          try {
            const worksheet = univerAPI.value
              .getActiveWorkbook()
              .getActiveSheet();
            worksheet
              .getRange(currentEditingRow.value, COLUMN_COUNT - 1)
              .setValue(dto.id);
            console.log(
              `[save] обновлен id в строке ${currentEditingRow.value} на ${dto.id}`
            );

            // Очищаем временные ID для этой строки
            for (const [tempId, rowIndex] of tempIdToRowMap.value.entries()) {
              if (rowIndex === currentEditingRow.value) {
                tempIdToRowMap.value.delete(tempId);
              }
            }
          } catch (error) {
            console.error("Ошибка при обновлении ID:", error);
          }
        } else {
          // Резервный механизм: поиск по временному ID
          let targetRowIndex: number | null = null;

          for (const [tempId, rowIndex] of tempIdToRowMap.value.entries()) {
            try {
              const worksheet = univerAPI.value
                .getActiveWorkbook()
                .getActiveSheet();
              const rowValues = readRowValues(worksheet, rowIndex);
              const rowDto = toDto(rowValues, listName);

              if (isDtoMatch(rowDto, dto)) {
                targetRowIndex = rowIndex;
                tempIdToRowMap.value.delete(tempId);
                break;
              }
            } catch (error) {
              console.error("Ошибка при обработке строки:", error);
            }
          }

          if (targetRowIndex !== null) {
            try {
              const worksheet = univerAPI.value
                .getActiveWorkbook()
                .getActiveSheet();
              worksheet
                .getRange(targetRowIndex, COLUMN_COUNT - 1)
                .setValue(dto.id);
              console.log(
                `[save] обновлен id в строке ${targetRowIndex} на ${dto.id}`
              );
            } catch (error) {
              console.error("Ошибка при обновлении ID:", error);
            }
          } else {
            console.log(`[save] строка не нашлась по временному id ${dto.id}`);
          }
        }
      }
    });
  }
});

// Вспомогательная функция для сравнения DTO
function isDtoMatch(
  dto1: Partial<TransportAccountingSR>,
  dto2: Partial<TransportAccounting>
): boolean {
  // Сравниваем ключевые поля, исключая ID и технические поля
  const fieldsToCompare: (keyof TransportAccountingSR)[] = [
    "dateOfPickup",
    "numberOfContainer",
    "cargo",
    "typeOfContainer",
    "addressOfDelivery",
    "client",
    "contractor",
    "driver",
  ];

  return fieldsToCompare.every((field) => {
    const val1 = dto1[field] || "";
    const val2 = dto2[field] || "";
    return String(val1).trim() === String(val2).trim();
  });
}

let lastRecords: Record<string, TransportAccounting[]> = {};
watch(
  () => sheetStore.records,
  (newRecords) => {
    if (!univerAPI.value) return;

    const api = univerAPI.value;
    const wb = api.getActiveWorkbook();
    if (!wb) return;

    const activeListName = getName();
    const newItems = newRecords[activeListName] || [];
    const oldItems = lastRecords[activeListName] || [];

    console.log('[watch] newItems', newItems);
    
    if (!oldItems.length && newItems.length) {
      lastRecords[activeListName] = JSON.parse(JSON.stringify(newItems));
      return;
    }

    console.log('[watch] oldItems after if', oldItems);

    const sheet = wb.getActiveSheet();
    if (!sheet) return;

    // нахождение реально обновленных записей
    const updatedRecords = newItems.filter((n) => {
      const old = oldItems.find((o) => o.id === n.id);
      return old && JSON.stringify(old) !== JSON.stringify(n);
    })
    
    console.log('[watch] updatedRecords', updatedRecords);

    for (const dto of updatedRecords) {
      const rowIndex = findRowById(sheet, dto.id);
      console.log('[watch] rowIndex', rowIndex);
      if (rowIndex >= 0) {
        patchRowValuesExceptProtected(sheet, rowIndex, dto);
      } else {
        // Если вдруг строка не нашлась — (крайний случай)
        // можно найти первую пустую строку и вставить (опционально).
        // Либо логировать:
        console.warn(`[watch] строка с id=${dto.id} не найдена`);
      }
    }

    const createdRecords = newItems.filter((n) => !oldItems.some((o) => o.id === n.id));
    for (const dto of createdRecords) {
      const rowIndex = findRowById(sheet, dto.id);
      if (rowIndex >= 0) {
        patchRowValuesExceptProtected(sheet, rowIndex, dto);
      } else {
        console.warn(`[watch] строка с id=${dto.id} не найдена`);
      }
    }

    const deletedRecords = oldItems.filter((o) => !newItems.some((n) => n.id === o.id));
    for (const dto of deletedRecords) {
      const rowIndex = findRowById(sheet, dto.id);
      if (rowIndex >= 0) sheet.deleteRows(rowIndex, 1);
    }

    lastRecords[activeListName] = JSON.parse(JSON.stringify(newItems));

    // const sheetSnapshot = univerAPI.value
    //   .getActiveWorkbook()
    //   .getActiveSheet()
    //   .getSheet()
    //   .getSnapshot().cellData;

    // const sheet = wb.getActiveSheet();
    // console.log("[watch] sheetSnapshot", sheetSnapshot);
    // console.log("[watch] newRecords", newRecords);
    // console.log("[watch] обнаружены изменения в records");
  },
  { deep: true, immediate: false }
);

onUnmounted(() => {
  if (disposeCmd?.dispose) disposeCmd.dispose();
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  tempIdToRowMap.value.clear(); // Очищаем карту временных ID
  currentEditingRow.value = null;
  window.removeEventListener("keydown", onKeydown);
});
</script>
