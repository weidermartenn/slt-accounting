<template>
    <div>

    </div>
</template>

<script setup lang="ts">
import { useEmployeeStore } from '~/stores/employee-store';

const es = useEmployeeStore();
const employees = computed(() => es.employees);

onMounted(async () => {
    await es.fetchEmployees();
    console.log(employees.value);
})
</script>

<style scoped>

</style>