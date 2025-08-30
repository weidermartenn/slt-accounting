<template>
  <div class="relative" style="width: 100%; height: 90vh">
    <div
      v-if="showFallback"
      class="absolute inset-0 flex items-center justify-center bg-white/90 z-10"
    >
      <div class="text-center">
        <UIcon name="i-lucide-loader-pinwheel" class="w-10 h-10 animate-spin" />
        <p class="mt-2 text-lg font-medium">Загрузка данных таблицы</p>
      </div>
    </div>
    <div
      id="univer"
      :class="{ 'opacity-0': showFallback }"
      style="width: 100%; height: 100%"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import UniverPresetSheetsCoreRuRU from "@univerjs/preset-sheets-core/locales/ru-RU";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import {
  createUniver,
  LocaleType,
  mergeLocales,
  NAMED_STYLE_SPACE_MAP,
  type IStyleData,
} from "@univerjs/presets";
import "@univerjs/preset-sheets-core/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import { z } from "zod";
import { STYLES } from "./attributes/styles";
import { HEADERS } from "./attributes/headers";
import { type SavePayload, saveSchema } from "./attributes/save-schema";
import type { TransportAccounting } from "~/entities/TransportAccountingDto/types";
import { autoFitColumnAndRowData } from "~/utils/autoFit";
import { lockHeaders, lockColumn, colLetter, applyEditableRules } from "~/utils/univer-protect";
import { COL2FIELD } from "./attributes/col2field";
import appConfig from "~/app.config";

const props = defineProps<{
  records: Record<string, any[]>;
}>();

const isEmpty = computed(() => {
  const rec = props.records || {};
  const keys = Object.keys(rec);
  if (keys.length === 0) return true;
  return keys.every((k) => Array.isArray(rec[k]) && rec[k].length === 0);
});

const COLUMN_COUNT = 28;
const LOCKED_COLS = [4, 25, 26, 27];

function buildRowCells(rec: TransportAccounting) {
  const cell = (v: any, col: number) =>
    ({ v: v ?? "", s: LOCKED_COLS.includes(col) ? "lockedCol" : "allrows" } as {
      v: any;
      s: string;
    });
  const row: Record<number, { v: any; s: string }> = {};
  row[0] = cell(rec?.dateOfPickup, 0);
  row[1] = cell(rec?.numberOfContainer, 1);
  row[2] = cell(rec?.cargo, 2);
  row[3] = cell(rec?.typeOfContainer, 3);
  row[4] = cell(rec?.dateOfSubmission, 4); // edit access denied
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
  row[15] = cell(rec?.formPayHim, 16);
  row[16] = cell(rec?.contractorRate, 17);
  row[17] = cell(rec?.sumIssued, 18);
  row[18] = cell(rec?.numberOfBillAdd, 19);
  row[19] = cell(rec?.dateOfPaymentContractor, 20);
  row[20] = cell(rec?.manager, 21);
  row[21] = cell(rec?.departmentHead, 22);
  row[22] = cell(rec?.clientLead, 23);
  row[23] = cell(rec?.salesManager, 24);
  row[24] = cell(rec?.additionalExpenses, 25);
  row[25] = cell(rec?.income, 26); // edit access denied
  row[26] = cell(rec?.incomeLearned, 27); // edit access denied
  row[27] = { v: rec?.id ?? "", s: "idcol" }; // edit access denied
  return row;
}

function readRowValues(sheet: any, row0: number): any[] {
  const row1 = row0 + 1;
  const lastCol = colLetter(COLUMN_COUNT);
  const a1 = `A${row1}:${lastCol}${row1}`;

  const vals2d = sheet.getRange?.(a1)?.getValues?.() || [];
  return vals2d[0] || new Array(COLUMN_COUNT).fill("");
}

function toPayload(values: any[]): SavePayload {
  const draft: any = { taxes: 0 };

  for (let c = 0; c < COLUMN_COUNT; c++) {
    const key = COL2FIELD[c];
    if (!key) continue;

    draft[key] = values[c] ?? (key === "id" ? 0 : "");
  }

  try {
    return saveSchema.parse(draft);
  } catch (err) {
    throw new Error("Некорректные данные", { cause: err });
  }

}

const timers = new Map<string, number>();

async function scheduleSave(sheet: any, row0: number) {
  const key = `${sheet.getSheetId?.()}::${row0}`;
  if (timers.has(key)) {
    clearTimeout(timers.get(key)!);
    timers.delete(key);
  }

  const t = window.setTimeout(async () => {
    try {
      const saving = toast.add({
        title: "Сохраняем данные",
        icon: "i-lucide-loader-circle",
        color: "info",
      });
      const values = readRowValues(sheet, row0);
      const payload = toPayload(values);

      console.log(payload);

      const isEmpty = Object.entries(payload).every(([k, v]) =>
        k === "id" ? v === 0 : v === "" || v === 0
      );
      if (isEmpty) {
        toast.remove(saving.id);
        return;
      }

      await $fetch("/api/worktable/record-add", {
        method: "POST",
        body: { data: payload },
      });

      toast.update(saving.id, {
        title: "Данные сохранены",
        icon: "i-lucide-check",
        color: "success",
      });
    } catch (e: any) {
      toast.add({
        title: "Не удалось сохранить данные",
        description: e?.data?.statusMessage || e?.message,
        color: "error",
      });
      console.error(e);
    }
  }, 5000);
  timers.set(key, t);
}

const showFallback = ref(true);
const univerAPI = ref<any>(null);
const dispose = ref<(() => void) | null>(null);
let disposeCmd: any;

const toast = useToast();

async function waitContainerReady(id = "univer") {
  await nextTick();
  const el = document.getElementById(id);
  if (!el) throw new Error("#univer not found");

  if (el.clientWidth > 0 && el.clientHeight > 0) return;
  await new Promise<void>((resolve) => {
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

const initializeUniver = async (records: Record<string, any[]>) => {
  // clear prev example
  if (dispose.value) {
    dispose.value();
    dispose.value = null;
    univerAPI.value = null;
  }

  await waitContainerReady("univer");

  const result = createUniver({
    locale: LocaleType.RU_RU,
    locales: {
      [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      [LocaleType.RU_RU]: mergeLocales(UniverPresetSheetsCoreRuRU),
    },
    presets: [
      UniverSheetsCorePreset({
        container: "univer",
        ribbonType: "simple",
      }),
    ],
  });

  univerAPI.value = result.univerAPI;

  const lifecycleDisposable = univerAPI.value.addEvent(
    univerAPI.value.Event.LifeCycleChanged,
    (params: { stage: any }) => {
      switch (params.stage) {
        case univerAPI.value.Enum.LifecycleStages.Ready:
          break;
        case univerAPI.value.Enum.LifecycleStages.Rendered:
          showFallback.value = false;
          break;
        case univerAPI.value.Enum.LifecycleStages.Steady:
          break;
      }
    }
  );

  const sheets: Record<string, any> = {};
  const entries = Object.entries(props.records || {});
  let i = 0;

  for (const [periodName, items] of entries) {
    const id = `sheet-${++i}`;
    const data = Array.isArray(items) ? items : ([] as TransportAccounting[]);
    const rows = Math.max(1, data.length + 1);
    const rowsToAdd = 1000;

    // sheet header
    const headerRow: Record<number, { v: any; s?: string }> = {};
    HEADERS.forEach((h, col) => {
      headerRow[col] = { v: h, s: "hdr" };
    });

    // sheet data
    const cellData: Record<number, Record<number, { v: any }>> = {
      0: headerRow,
    };

    for (let r = 0; r < data.length; r++) {
      cellData[r + 1] = buildRowCells(data[r]!);
    }

    for (let r = data.length + 1; r < data.length + 1 + rowsToAdd; r++) {
      const emptyRow: Record<number, { v: any }> = {};
      for (let c = 0; c < COLUMN_COUNT; c++) {
        emptyRow[c] = { v: "" };
      }
      cellData[r] = emptyRow;
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
      columnCount: COLUMN_COUNT,
      zoomRatio: 1,
      freeze: { startRow: 1, startColumn: 0, ySplit: 1, xSplit: 0 },
      scrollTop: 0,
      scrollLeft: 0,
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

  const sheetOrder = Object.keys(sheets);

  const workbook = {
    id: "workbook-1",
    sheetOrder,
    name: "SLT - Транпортный учет",
    styles: STYLES,
    sheets,
    resources: [{ name: "SHEET_DEFINED_NAME_PLUGIN", data: "" }],
  };

  univerAPI.value.createWorkbook(workbook);

  const api = univerAPI.value;

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

      const workbook = api.getActiveWorkbook?.();
      const sheet =
        workbook?.getActiveSheet?.() ||
        (cmd?.params?.sheetId
          ? workbook?.getSheetBySheetId?.(cmd.params.sheetId)
          : undefined);
      if (!sheet) return;

      const p = cmd?.params || {};
      const rng = p.range || (Array.isArray(p.ranges) ? p.ranges[0] : {}) || {};

      let r0 = rng.startRow ?? p.row ?? p.startRow ?? 0;
      let r1 = rng.endRow ?? p.row ?? p.endRow ?? r0;

      for (let row0 = r0; row0 <= r1; row0++) {
        if (row0 === 0) continue;
        scheduleSave(sheet, row0);
      }
    } catch {
      //
    }
  };

  if (typeof api.onCommandExecuted === "function") {
    disposeCmd = api.onCommandExecuted(onExecuted);
  } else if (api.Event?.CommandExecuted && typeof api.addEvent === "function") {
    disposeCmd = api.addEvent(api.Event.CommandExecuted, onExecuted);
  }

  const sheetIds = Object.keys(sheets);
  await lockHeaders(univerAPI.value, sheetIds, COLUMN_COUNT, 1);
  await lockColumn(univerAPI.value, sheetIds, [5, 26, 27, 28], { headerRow: 1 });

  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const me: any = await $fetch('/api/auth/me', { headers })

  await applyEditableRules(univerAPI.value, me.value?.roleCode || '')
  return lifecycleDisposable;
};

watch(
  () => props.records,
  async (newRecords) => {
    if (Object.keys(newRecords).length > 0) {
      showFallback.value = true;
      await initializeUniver(newRecords);
    }
  },
  { deep: false, immediate: true }
);

onMounted(async () => {
  if (Object.keys(props.records).length > 0) {
    await initializeUniver(props.records);
  }
});

onUnmounted(() => {
  if (dispose.value) dispose.value();
  if (disposeCmd?.dispose) disposeCmd.dispose();
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
});
</script>