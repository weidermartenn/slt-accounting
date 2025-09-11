<template>
    <div class="relative">
        <div id="u" class="w-full h-[90vh]" :class="{ 'opacity-0': showFallback }"></div>
    </div>
</template>

<script setup lang="ts">
import type { TransportAccounting } from "~/entities/TransportAccountingDto/types";
// univer dynamic modules
let UniverSheetsCorePreset: any;
let UniverPresetSheetsCoreRuRU: any;
let UniverPresetSheetsCoreEnUS: any;
let createUniver: any;
let LocaleType: any;
let mergeLocales: any;

// refs
const libsLoaded = ref(false);
const showFallback = ref(true);
const univerAPI = ref<any>(null);
const me = ref<any>(null);
const records = ref<TransportAccounting[]>([]);

// consts

async function loadLibs() {
    if (libsLoaded.value) return;
    await import("@univerjs/preset-sheets-core/lib/index.css");
    await import("@univerjs/sheets-ui/lib/index.css");
    ({ UniverSheetsCorePreset } = await import("@univerjs/preset-sheets-core"));
    ({ default: UniverPresetSheetsCoreRuRU } = await import(
        "@univerjs/preset-sheets-core/locales/ru-RU"
    ));
    ({ default: UniverPresetSheetsCoreEnUS } = await import(
        "@univerjs/preset-sheets-core/locales/en-US"
    ));
    ({ createUniver, LocaleType, mergeLocales } = await import(
        "@univerjs/presets"
    ));
    libsLoaded.value = true;
}

async function initRecords(role: string) {
    try {
        records.value = (role === "ROLE_ADMIN" || role === "ROLE_BUH") 
        ? await $fetch('/api/worktable/admin-worktable-records')
        : await $fetch('/api/worktable/user-worktable-records');
    } catch (e: any) {
        console.error(e);
    }
}

async function initUniver (records: TransportAccounting[]) {
    univerAPI.value = await createUniver({
        locale: LocaleType.RU_RU,
        locales: {
            [LocaleType.RU_RU]: UniverPresetSheetsCoreRuRU,
            [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS,
        },
        presets: [
            UniverSheetsCorePreset({ container: "u", ribbonType: "simple" }),
        ]
    })
}

onBeforeMount(async () => {
    await loadLibs();
});

onMounted(async () => {
    const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
    me.value = await $fetch('/api/auth/me', { headers });

    await initRecords(me.value.role);
    await initUniver(records.value);
    console.log(univerAPI.value);
})

</script>

<style scoped></style>
