<template>
  <div class="p-6">
    <div class="mb-6">
      <h3 class="text-xl text-zinc-900 font-semibold">Управление сотрудниками</h3>
    </div>

    <!-- Поле поиска -->
    <div class="mb-4">
      <UInput
        v-model="searchQuery"
        placeholder="Поиск по сотрудникам..."
        icon="i-lucide-search"
        class="max-w-md"
        @input="filterEmployees"
      />
    </div>

    <!-- Вкладки -->
    <UTabs :items="tabs" class="w-full">
      <template #item="{ item, index }">
        <div class="p-4">
          <!-- Индикатор загрузки -->
          <div v-if="loading" class="flex justify-center items-center h-64">
            <UIcon name="i-lucide-loader" class="w-8 h-8 animate-spin" />
          </div>

          <!-- Сообщение об отсутствии данных -->
          <div v-else-if="filteredEmployees[index].length === 0" class="text-center py-8 text-gray-500">
            Нет сотрудников для отображения
          </div>

          <!-- Таблица сотрудников -->
          <div v-else class="overflow-x-auto bg-white rounded-lg shadow">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    v-for="(header, headerIndex) in Object.values(HEADERS)"
                    :key="headerIndex"
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {{ header }}
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="employee in filteredEmployees[index]" :key="employee.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ employee.fullname || 'Нет данных' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ employee.phone || 'Нет данных' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ employee.employee?.department || 'Нет данных' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <UBadge :color="employee.confirmed ? 'success' : 'error'" variant="subtle">
                      {{ employee.confirmed ? 'Да' : 'Нет' }}
                    </UBadge>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <UBadge :color="employee.confirmedNotification ? 'success' : 'error'" variant="subtle">
                      {{ employee.confirmedNotification ? 'Да' : 'Нет' }}
                    </UBadge>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ employee.employee?.salary || 'Нет данных' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ employee.employee?.fixedPart || 'Нет данных' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ employee.employee?.otherPayments || 'Нет данных' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ employee.employee?.note || '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ employee.employee?.coefficientManager || 'Нет данных' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ employee.employee?.coefficientDepartmentHead || 'Нет данных' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ employee.employee?.coefficientClientLead || 'Нет данных' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ employee.employee?.coefficientSalesManager || 'Нет данных' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2">
                      <UButton
                        icon="i-lucide-edit"
                        color="secondary"
                        variant="soft"
                        size="xs"
                      />
                      <UButton
                        icon="i-lucide-trash-2"
                        color="error"
                        variant="soft"
                        size="xs"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
import { useEmployeeAdminStore } from '~/stores/emp-admin.store';
import type { UserDto } from '~/entities/UserDto/types';
import { useToast } from '#imports';

const es = useEmployeeAdminStore();
const toast = useToast();
const employees = computed(() => es.employees);
const loading = ref(false);

const HEADERS = {
  0: 'ФИО',
  1: 'Телефон',
  2: 'Отдел',
  3: 'Подтвержден',
  4: 'Уведомления',
  5: 'Оклад',
  6: 'Фиксируется ОФ',
  7: 'Другие выплаты',
  8: 'Примечание',
  9: 'Ставка если "Ведущий менеджер"',
  10: 'Ставка если "Ведущий по вызову/Начальник отдела"',
  11: 'Ставка если "Ведущий по клиенту (как правило начальник отдела)"',
  12: 'Ставка если "Менеджер по продажам"'
};

// Вкладки
const tabs = [
  { label: 'Сотрудники' },
  { label: 'Ожидают подтверждения' }
];

// Поиск
const searchQuery = ref('');
const filteredEmployees = ref<[UserDto[], UserDto[]]>([[], []]);

function filterEmployees() {
  if (!employees.value) {
    filteredEmployees.value = [[], []];
    return;
  }

  const confirmedEmployees = employees.value.filter(employee => employee.confirmed);
  const unconfirmedEmployees = employees.value.filter(employee => !employee.confirmed);

  if (!searchQuery.value) {
    filteredEmployees.value = [confirmedEmployees, unconfirmedEmployees];
    return;
  }

  const query = searchQuery.value.toLowerCase();

  filteredEmployees.value = [
    confirmedEmployees.filter(employee =>
      employee.fullname?.toLowerCase().includes(query) ||
      employee.phone?.includes(query) ||
      employee.employee?.department?.toLowerCase().includes(query)
    ),
    unconfirmedEmployees.filter(employee =>
      employee.fullname?.toLowerCase().includes(query) ||
      employee.phone?.includes(query) ||
      employee.employee?.department?.toLowerCase().includes(query)
    )
  ];
}

onMounted(async () => {
  try {
    loading.value = true;
    await es.fetchEmployees();
    filterEmployees();
  } catch (error) {
    console.error('Error fetching employees:', error);
    toast.add({
      title: 'Ошибка',
      description: 'Не удалось загрузить список сотрудников',
      color: 'error'
    });
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* Дополнительные стили, если необходимо */
</style>
