<template>
    <UApp>
        <div v-cloak>
            <UButton @click="onExit">Очистить куки</UButton>
            <UniverSheet />
        </div>
    </UApp>
</template>

<script setup lang="ts">
const onExit = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    navigateTo('/auth')
}
</script>

<style scoped>

</style>