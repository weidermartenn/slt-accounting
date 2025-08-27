<template>
  <UApp>
    <div v-cloak>
      <ClientOnly>
        <div class="flex justify-between px-4 py-1 border-b">
          <UButton
            class="cursor-pointer"
            @click="$router.push('/')"
            variant="soft"
            color="secondary"
            >Вернуться в ЛК</UButton
          >
          <div
            class="v-row items-center border-2 border-[#DDDDDD] rounded-sm p-2"
          >
            <div class="w-10 h-6 bg-[#DDDDDD] rounded-sm"></div>
            <span class="text-sm font-semibold">Нельзя редактировать</span>
          </div>
          <UPopover :content="{ align: 'end', side: 'bottom', sideOffset: 8 }">
            <UButton icon="i-lucide-settings" color="secondary" variant="ghost" class="cursor-pointer" />
            <template #content>
              <div class="w-56 p-2 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium">Темная тема</span>
                  <USwitch aria-label="Темная тема" />
                </div>

                <UButton
                  class="w-full justify-center"
                  variant="soft"
                  color="error"
                  icon="i-lucide-log-out"
                  @click="logout"
                >
                  Выйти из аккаунта
                </UButton>
              </div>
            </template>
          </UPopover>
        </div>
        <TransportAccountingAdmin :records="records" />
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
});

useHead({
  title: "SLT - таблица",
  meta: [
    {
      name: "description",
      content: "SLT - таблица",
    },
  ],
});
import { TransportAccountingAdmin } from "#components";
import { useSheetStore } from "~~/stores/sheet/store";

const store = useSheetStore();
const records = computed(() => store.records);

const logout = async () => {
  await $fetch("/api/auth/logout", {
    method: "POST",
  }).then(() => {
    navigateTo("/auth");
  });
};

onMounted(() => {
  store.fetchAll();
});
</script>

<style scoped></style>
