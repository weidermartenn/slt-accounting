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
import { autoFitColumnAndRowData } from "~/utils/autoFit"

const props = defineProps<{
  records: Record<string, any[]>;
}>();

const HEADERS = [
  "Дата загрузки",
  "№ контейнера",
  "Груз",
  "Тип контейнера",
  "Дата подачи",
  "Адрес доставки",
  "Наша фирма",
  "Клиент",
  "Оплата нам",
  "Сумма",
  "№ счета",
  "Дата счета",
  "Дата оплаты",
  "Подрядчик",
  "Водитель",
  "Оплата ему",
  "Ставка подрядчика",
  "Выдано",
  "№ доп. счета",
  "Дата оплаты подрядчику",
  "Менеджер",
  "Главный клиент",
  "Руководитель отдела",
  "Менеджер по продажам",
  "Доп. расходы",
  "Доход",
  "Учитываемый доход",
  "",
];

const COLUMN_COUNT = 28;

const STYLES: Record<string, IStyleData> = {
  hdr: {
    bg: { rgb: "#238D43" },
    tb: 1,
    ht: 1,
    vt: 2,
    pd: {
      l: 4
    }
  },
  allrows: {
    tb: 2,
    vt: 2,
    pd: {
      l: 4
    }
  },
};

function buildRowCells(rec: transportAccounting) {
  const cell = (v: any) =>
    ({ v: v ?? "", s: "allrows" } as { v: any; s: string });
  const row: Record<number, { v: any; s: string }> = {};
  row[0] = cell(rec?.dateOfPickup);
  row[1] = cell(rec?.numberOfContainer);
  row[2] = cell(rec?.cargo);
  row[3] = cell(rec?.typeOfContainer);
  row[4] = cell(rec?.dateOfSubmission);
  row[5] = cell(rec?.addressOfDelivery);
  row[6] = cell(rec?.ourFirm);
  row[7] = cell(rec?.client);
  row[8] = cell(rec?.formPayAs);
  row[9] = cell(rec?.summa);
  row[10] = cell(rec?.numberOfBill);
  row[11] = cell(rec?.dateOfBill);
  row[12] = cell(rec?.datePayment);
  row[13] = cell(rec?.contractor);
  row[14] = cell(rec?.driver);
  row[15] = cell(rec?.formPayHim);
  row[16] = cell(rec?.contractorRate);
  row[17] = cell(rec?.sumIssued);
  row[18] = cell(rec?.numberOfBillAdd);
  row[19] = cell(rec?.dateOfPaymentContractor);
  row[20] = cell(rec?.manager);
  row[21] = cell(rec?.clientLead);
  row[22] = cell(rec?.departmentHead);
  row[23] = cell(rec?.salesManager);
  row[24] = cell(rec?.additionalExpenses);
  row[25] = cell(rec?.income);
  row[26] = cell(rec?.incomeLearned);
  row[27] = cell(rec?.id);
  return row;
}

const showFallback = ref(true);
const univerAPI = ref<any>(null);
const dispose = ref<(() => void) | null>(null);

const initializeUniver = (records: Record<string, any[]>) => {
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

    const { columnData, rowData } = autoFitColumnAndRowData(cellData, COLUMN_COUNT);

    sheets[id] = {
      id,
      name: periodName,
      tabColor: "#114011",
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

  univerAPI.value.createWorkbook(
    sheetOrder.length
      ? workbook
      : {
          // fallback
          id: "workbook-1",
          sheetOrder: ["sheet-1"],
          name: "<blank>",
          styles: STYLES,
          sheets: {
            "sheet-1": {
              id: "sheet-1",
              name: "Пусто",
              tabColor: "",
              hidden: 0,
              rowCount: 1,
              columnCount: COLUMN_COUNT,
              zoomRatio: 1,
              freeze: { startRow: -1, startColumn: -1, ySplit: 0, xSplit: 0 },
              scrollTop: 0,
              scrollLeft: 0,
              defaultColumnWidth: 80,
              defaultRowHeight: 30,
              mergeData: [],
              cellData: {
                0: Object.fromEntries(HEADERS.map((h, c) => [c, { v: h }])),
              },
              rowData: {},
              columnData: Object.fromEntries(
                Array.from({ length: COLUMN_COUNT }, (_, i) => [
                  i,
                  { w: 125, hd: 0 },
                ])
              ),
              showGridlines: 1,
              rowHeader: { width: 50, hidden: 0 },
              columnHeader: { height: 20, hidden: 0 },
              rightToLeft: 0,
            },
          },
          resources: [{ name: "SHEET_DEFINED_NAME_PLUGIN", data: "" }],
        }
  );

  return lifecycleDisposable;
};

watch(
  () => props.records,
  (newRecords) => {
    if (Object.keys(newRecords).length > 0) {
      showFallback.value = true;
      initializeUniver(newRecords);
    }
  },
  { deep: true, immediate: true }
);

onMounted(() => {
  if (Object.keys(props.records).length > 0) {
    initializeUniver(props.records);
  }
});

onUnmounted(() => {
  if (dispose.value) {
    dispose.value();
  }
});
</script>
