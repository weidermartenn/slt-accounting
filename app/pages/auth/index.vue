<template>
  <UApp>
    <div
      v-cloak
      class="w-full min-h-screen flex items-center justify-center p-4"
    >
      <UCard class="w-sm md:w-md lg:w-lg">
        <UStepper
          :items="items"
          :model-value="step"
          @update:model-value="onStepChange"
        />
        <form v-if="step === 0" @submit.prevent="onSubmit">
          <span
            class="block font-semibold my-4 text-sm text-gray-600 dark:text-gray-400"
            >Для продолжения действий введите свой номер телефона. После нажатия
            кнопки "Получить" вам придет код подтверждения в
            Telegram-боте.</span
          >
          <div class="v-col">
            <span class="font-semibold">Номер телефона</span>
            <ClientOnly>
              <UInput
                  size="xl"
                  v-model="phone"
                  icon="i-lucide-smartphone"
                  v-maska="'+7 (###) ###-##-##'"
                  placeholder="+7 (***) ***-**-**"
                >
              </UInput>
              <template #fallback>
                <USkeleton class="w-full h-10"></USkeleton>
              </template>
            </ClientOnly>
            <UButton class="w-full justify-center" type="submit" size="lg"
              >Получить</UButton
            >
          </div>
        </form>

        <form
          v-else-if="step === 1"
          @submit.prevent="onConfirmCode"
          class="mt-6 space-y-4"
        >
          <span
            class="block font-semibold my-4 text-sm text-gray-600 dark:text-gray-400"
            >Проверьте сообщения в Telegram. Вам отправлен 4-х значный код.
            Введите его ниже и нажмите кнопку /
            <code class="font-semibold text-white bg-zinc-500 rounded-sm p-0.5"
              >↵ Enter</code
            >
            для продолжения действий.</span
          >
          <div class="flex justify-center gap-3">
            <UInput
              v-for="(n, i) in 4"
              :key="i"
              :ref="(el) => setInputRef(el, i)"
              :model-value="code[i]"
              @input="onCodeInput($event, i)"
              @keydown="onCodeKeydown($event, i)"
              @paste="onCodePaste"
              size="xl"
              maxlength="1"
              inputmode="numeric"
              class="w-14"
              :ui="{ base: 'text-center text-2xl py-3' }"
            >
            </UInput>
          </div>
          <div class="flex gap-3">
            <UButton class="flex-1 justify-center" type="submit" size="lg"
              >Подтвердить</UButton
            >
          </div>
        </form>
      </UCard>
    </div>
  </UApp>
</template>

<script setup lang="ts">
definePageMeta({
  public: true,
});

import type { FormSubmitEvent } from "@nuxt/ui";
import { vMaska } from "maska/vue";
import type { StepperItem } from "@nuxt/ui";
import { postUserLoginCode, postUserConfirmCode } from "./model/user";

const user = useState<any | null>("user", () => null);

const step = ref(0);
const phone = ref("");
const isLoading = ref(false);
const isLoadingInput = ref(true);
const clearPhone = ref("");
const code = ref<string[]>(["", "", "", ""]);
const inputs = ref<any[]>([]);

watch(phone, () => {
  clearPhone.value = phone.value.replace(/\D/g, "");
});

const canGoNext = computed(() => clearPhone.value.length === 11);
const toast = useToast();

const onStepChange = (val: string | number | undefined) => {
  const next = Number(val ?? 0);
  if (val === 1 && !canGoNext.value) return;
  step.value = next;
};

const items = ref<StepperItem[]>([
  {
    title: "1",
    icon: "i-lucide-smartphone",
    value: 0,
  },
  {
    title: "2",
    icon: "i-lucide-check-check",
    value: 1,
  },
]);

// Шаг 1
const onSubmit = async () => {
  if (!canGoNext.value) {
    toast.add({
      title: "Номер некорректен",
      color: "error",
      description: "Проверьте вводимые данные",
      icon: "i-lucide-alert-triangle",
    });
    return;
  }

  try {
    isLoading.value = true;
    const res: any = await postUserLoginCode(clearPhone.value);
    if (res?.operationResult !== "OK") {
      console.log("okey");
    }
    step.value = 1;
    await nextTick();
    toast.add({
      title: "Код отправлен",
      color: "info",
      description: "Проверьте сообщения в Telegram-боте",
      icon: "i-lucide-send",
    });
  } catch (e: any) {
    toast.add({
      title: "Ошибка",
      color: "error",
      icon: "i-lucide-alert-triangle",
    });
  } finally {
    isLoading.value = false;
  }
};

const setInputRef = (el: any, i: number) => {
  inputs.value[i] = el;
};
const focusIndex = (i: number) => {
  const el =
    inputs.value[i]?.input ||
    inputs.value[i]?.$el?.querySelector?.("input") ||
    inputs.value[i];
  el?.focus?.();
  el?.select?.();
};

const onCodeInput = (e: Event, i: number) => {
  const t = e.target as HTMLInputElement;
  const d = (t.value.match(/\d/g) || []).pop() || "";
  code.value[i] = d;
  t.value = d;
  if (d && i < 3) focusIndex(i + 1);
};

const onCodeKeydown = (e: KeyboardEvent, i: number) => {
  if (e.key === "Backspace" && !code.value[i] && i > 0) {
    e.preventDefault();
    code.value[i - 1] = "";
    focusIndex(i - 1);
  } else if (e.key === "ArrowLeft" && i > 0) {
    e.preventDefault();
    focusIndex(i - 1);
  } else if (e.key === "ArrowRight" && i < 3) {
    e.preventDefault();
    focusIndex(i + 1);
  }
};

const onCodePaste = (e: ClipboardEvent) => {
  const digits = (e.clipboardData?.getData("text") || "")
    .replace(/\D/g, "")
    .split("");
  if (!digits.length) return;
  e.preventDefault();
  for (let j = 0; j < 4; j++) code.value[j] = digits[j] || "";
  nextTick(() => focusIndex(Math.min(digits.length, 4) - 1 || 0));
};

const codeValue = computed(() => code.value.join(""));

const onConfirmCode = async () => {
  if (codeValue.value.length !== 4) {
    toast.add({
      title: "Введите 4 цифры кода",
      color: "error",
      icon: "i-lucide-alert-triangle",
    });
    return;
  }

  await postUserConfirmCode(clearPhone.value, codeValue.value).then(
    (res: any) => {
      try {
        if (res?.operationResult === "OK") {
          user.value = res.object?.user || null;

          const roleCode = user.value?.role?.code; // ROLE_ADMIN
          const isRegistered = !!user.value?.confirmed; // критерий

          navigateTo(roleCode === "ROLE_ADMIN" ? "/" : "/auth");

          toast.add({
            title: "Успешно",
            color: "success",
            icon: "i-lucide-check",
          });
        }
        console.log(res);
      } catch (e) {
        console.log(e);
      }
    }
  );
};

onMounted(() => {
  step.value = 0;
  isLoadingInput.value = false;
});

watch(step, (val) => {
  if (val === 1) nextTick(() => focusIndex(0));
});
</script>
