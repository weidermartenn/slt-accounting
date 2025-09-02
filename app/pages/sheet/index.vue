<template>
  <UApp>
    <div v-cloak>
      <ClientOnly>
        <TransportAccountingUser 
          v-if="Object.keys(records ||{}).length"
          :records="records" 
        />
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

import { useDebounceFn } from "@vueuse/core";
import TransportAccountingUser from "~/components/TransportAccountingUser.vue";
import { useSheetStore } from "~/stores/sheet-store";

const store = useSheetStore();
const records = computed(() => store.records);

const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const me: any = await $fetch("/api/auth/me", { headers }).catch(() => null);

const fetchRecords = async (me: any) =>{
  if (me?.roleCode !== "ROLE_ADMIN" && me?.roleCode !== "ROLE_BUH" && me?.roleCode !== "ROLE_MANAGER") {
    store.fetchAll();
  } else {
    store.fetchAllRoleAdmin();
  }
}

onMounted(async () => {
  await fetchRecords(me);
});
</script>

