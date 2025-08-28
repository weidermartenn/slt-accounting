<template>
    <UApp>
        <div class="w-full h-[90vh] flex flex-col items-center justify-center">
            <p>Главная страница</p>
            <UButton @click="$router.push('/sheet')" variant="ghost" color="primary">Перейти к таблице</UButton>
        </div>
    </UApp>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'default'
})
</script>

<style scoped>

</style>