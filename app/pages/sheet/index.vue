<template>
  <UApp>
    <div v-cloak>
      <ClientOnly>
        <TransportAccountingUser :records="records" />
        <template #fallback>
          <div
            class="h-screen flex items-center justify-center gap-3 px-4 py-3"
          >
            <UIcon name="i-lucide-loader-pinwheel" class="w-10 h-10 animate-spin" />
            <span class="text-md font-medium">Загрузка таблицы</span>
          </div>
        </template>
      </ClientOnly>
    </div>
  </UApp>
</template>

<script setup lang="ts">
definePageMeta({
  public: true,
  layout: "default",
});

useHead({
  title: "ТУ - таблица",
  meta: [
    {
      name: "description",
      content: "ТУ - таблица",
    },
  ],
});

import TransportAccountingUser from "~/components/TransportAccountingUser.vue";
import { useSheetStore } from "~/stores/sheet-store";

const store = useSheetStore();
const records = computed(() => store.records);

onMounted(() => {
  store.fetchAll();
});
</script>

