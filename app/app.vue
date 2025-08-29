<template>
  <NuxtLayout :name="layout">
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { TooltipProvider } from "reka-ui";
const layout = "default";
</script>
