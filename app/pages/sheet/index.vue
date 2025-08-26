<template>
  <UApp>
    <div v-cloak>
      <ClientOnly>
        <div class="flex justify-end p-2 border-b">
          <UButton class="cursor-pointer" @click="getAllRecords" variant="ghost" color="error">Получить по ебалу</UButton>
          <UButton class="cursor-pointer" @click="logout" variant="ghost" color="error">Выйти из аккаунта</UButton>
        </div>
        <UniverSheet />
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

const getAllRecords = async () => {
    await $fetch('/api/admin/records', {
        method: 'GET'
    }).then((res: any) => {
        console.log(res)
    })
}

onMounted(() => {
store.fetchAll()
console.log(records.value)
})
</script>

<style scoped></style>
