<template>
  <div class="relative" style="width: 100%; height: 94vh">
    <div
      v-if="showFallback"
      class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10"
    >
      <div class="text-center">
        <UIcon name="i-lucide-loader" class="w-10 h-10 animate-spin" />
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
import type { transportAccounting } from "~/entities/TransportAccountingDto/types";
import { autoFitColumnAndRowData } from "~/utils/autoFit";
import { lockCells, colLetter } from "~/utils/univer-protect";

const props = defineProps<{
  records: Record<string, any[]>;
}>();

const HEADERS = [
  "Дата выгрузки",
  "№ контейнера, Номер ТТН или Номер заявки",
  "Груз",
  "Тип контейнера/тонаж",
  "Дата сдачи документов водителем",
  "Адрес доставки/Назначение счета",
  "Наша фирма",
  "Клиент",
  "Форма оплаты нам С/БЕЗ НДС",
  "Сумма",
  "№ счета",
  "Дата счета",
  "Дата оплаты нам",
  "Подрядчик",
  "Водитель АМ",
  "Форма оплата подрядчику С/БЕЗ НДС",
  "Ставка подрядчику",
  "Сумма выданных/оплаченных средств",
  "№ счета и сумма за ГСМ, запчасти",
  "Дата оплаты подрядчику",
  "Ведущий менеджер",
  "Ведущий по вызову/Начальник отдела",
  "Ведущий по клиенту (как правило начальник отдела)",
  "Менеджер по продажам",
  "Доп. расходы",
  "Доход",
  "Доход полученный",
  "",
];

const COLUMN_COUNT = 28;

const STYLES: Record<string, IStyleData> = {
  hdr: {
    bg: { rgb: "#5CCCCC" },
    tb: 3,
    ht: 1,
    vt: 2,
    pd: {
      l: 4,
    },
  },
  allrows: {
    tb: 2,
    vt: 2,
    pd: {
      l: 4,
    },
    bd: {
      l: { s: 1, cl: { rgb: "#cccccc" } },
      t: { s: 1, cl: { rgb: "#cccccc" } },
      b: { s: 1, cl: { rgb: "#cccccc" } },
      r: { s: 1, cl: { rgb: "#cccccc" } },
    }
  },
  idcol: {
    cl: { rgb: "#FFFFFF" },
  },
  lockedCol: {
    bg: { rgb: "#DDDDDD"},
    vt: 2,
    pd: {
      l: 4,
    },
    bd: {
      l: { s: 1, cl: { rgb: "#cccccc" } },
      t: { s: 1, cl: { rgb: "#cccccc" } },
      b: { s: 1, cl: { rgb: "#cccccc" } },
      r: { s: 1, cl: { rgb: "#cccccc" } },
    }
  }
};

const LOCKED_COLS = [4, 25, 26, 27]

function buildRowCells(rec: transportAccounting) {
  const cell = (v: any, col: number) =>
    ({ v: v ?? "", s: LOCKED_COLS.includes(col) ? 'lockedCol' : 'allrows' } as { v: any; s: string });
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
  row[27] = { v: rec?.id ?? '', s: 'idcol' } // edit access denied
  return row;
}

const showFallback = ref(true);
const univerAPI = ref<any>(null);
const dispose = ref<(() => void) | null>(null);

const initializeUniver = async (records: Record<string, any[]>) => {
  // clear prev example
  if (dispose.value) {
    dispose.value();
    dispose.value = null;
    univerAPI.value = null;
  }

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
    const data = Array.isArray(items) ? items : ([] as transportAccounting[]);
    const rows = Math.max(1, data.length + 1);

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

    const { columnData, rowData } = autoFitColumnAndRowData(
      cellData,
      COLUMN_COUNT
    );

    sheets[id] = {
      id,
      name: periodName,
      tabColor: "#009999",
      hidden: 0,
      rowCount: rows,
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

  await lockCells(univerAPI.value, Object.keys(sheets), {
    columnCount: COLUMN_COUNT,
    headerRow: 1,
    lockColumns: [5, 26, 27, 28],
    dataStartRow: 2
  })
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
  { deep: true, immediate: true }
);

onMounted(async () => {
  if (Object.keys(props.records).length > 0) {
    await initializeUniver(props.records);
  }
});

onUnmounted(() => {
  if (dispose.value) {
    dispose.value();
  }
});
</script>
