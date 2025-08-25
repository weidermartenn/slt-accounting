<template>
    <div class="flex flex-col justify-center items-center h-screen">
        <p class="text-2xl text-red-500"> БРАТ ТУТ ЕСТЬ МОЩНИ СОЩНИ ЛАГМАН</p>
        <UButton @click="onExit">Я не хочу лагман</UButton>
        <img src="https://nasha.severnaya.ru/upload/iblock/a56/9tj04qte5xzer56pqyovzof1vlt1j961.webp">
    </div>
</template>

<script setup lang="ts">
const onExit = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    navigateTo('/auth')
}
</script>

<style scoped>

</style>