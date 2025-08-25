<template>
  <div id="univer" style="width: 100%; height: 100vh;"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreRuRU from '@univerjs/preset-sheets-core/locales/ru-RU';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import '@univerjs/preset-sheets-core/lib/index.css';
import '@univerjs/sheets-ui/lib/index.css';

onMounted(() => {
  const { univerAPI } = createUniver({
    locale: LocaleType.RU_RU,
    locales: {
      [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      [LocaleType.RU_RU]: mergeLocales(UniverPresetSheetsCoreRuRU),
    },
    presets: [
      UniverSheetsCorePreset({
        container: 'univer',
        ribbonType: 'simple',
      }),
    ],
  });

  univerAPI.createWorkbook({
    id: 'workbook-1',
    name: 'Тестовая книга',
    sheets: {
      'sheet-1': {
        id: 'sheet-1',
        name: 'Лист 1',
        rowCount: 100,
        columnCount: 20,
        cellData: {
          0: {
            0: { v: 'Данные' },
            1: { v: 'Загружены' },
          }
        }
      }
    }
  });
});
</script>