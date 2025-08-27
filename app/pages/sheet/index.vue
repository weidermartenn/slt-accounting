<template>
  <UApp>
    <div v-cloak>
      <ClientOnly>
        <div class="flex justify-between p-1 border-b">
          <UButton class="cursor-pointer" @click="logout" variant="soft" color="secondary">Вернуться в ЛК</UButton>
          <div class="v-row items-center border-2 border-[#DDDDDD] rounded-sm p-2">
            <div class="w-10 h-6 bg-[#DDDDDD] rounded-sm"></div>
            <span class="text-sm font-semibold">Нельзя редактировать</span>
          </div>
          <UButton class="cursor-pointer" @click="logout" variant="soft" color="error">Выйти из аккаунта</UButton>
        </div>
        <TransportAccountingAdmin :records="records"/>
        <template #fallback>
          <div
            class="h-screen flex items-center justify-center gap-3 px-4 py-3"
          >
            <UIcon name="i-lucide-loader" class="w-10 h-10 animate-spin" />
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
import { TransportAccountingAdmin } from '#components';
import { useSheetStore } from '~~/stores/sheet/store';

const store = useSheetStore()
const records = computed(() => store.records)

const logout = async () => {
    await $fetch('/api/auth/logout', {
        method: 'POST'
    }).then(() => {
        navigateTo('/auth')
    })
}

onMounted(() => {
  store.fetchAll()
})
</script>

<style scoped></style>
