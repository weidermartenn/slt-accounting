<template>
    <header class="p-4">
        <USlideover 
            title="Меню"
            description="Меню"
            side="left"
            :overlay="false"
            :close="{
                icon: 'i-lucide-x',
                class: 'absolute top-4 end-4'
            }"
        >
            <UButton color="primary" variant="soft" class="w-12 h-10 flex justify-center cursor-pointer" icon="i-lucide-menu" />

            <template #content>
                <div class="p-6 pb-2">
                    <h3 class="text-lg text-zinc-900 font-semibold">Меню</h3>
                </div>
                <div class="v-col p-6 gap-4">
                    <UButton @click="$router.push(item.to)" v-for="item in items" :key="item.id" class="slideover-button">
                        <UIcon :name="item.icon" class="h-18 w-18"/>
                        <span>{{ item.title }}</span>
                    </UButton>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="flex gap-4 items-center">
                            <span class="text-sm font-medium">Темная тема</span>
                            <USwitch unchecked-icon="i-lucide-sun" checked-icon="i-lucide-moon" size="xl" />
                        </div>
                        <UButton color="error" variant="soft">Выйти из аккаунта</UButton>
                    </div>
                </div>
            </template>
            <template #footer>
            </template>
        </USlideover>
    </header>
    <slot />
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items = [
    {
        id: 1,
        title: 'Личный кабинет',
        icon: 'i-lucide-user',
        to: '/'
    },
    {
        id: 2,
        title: 'Транспортный учет',
        icon: 'i-lucide-truck',
        to: '/sheet'
    }
]
</script>

<style lang="scss">
:deep(.slideover-button) {
    @apply v-col p-4 bg-zinc-300 text-zinc-200 cursor-pointer hover:bg-zinc-700 hover:text-zinc-50 active:bg-zinc-700 duration-150;
}
</style>