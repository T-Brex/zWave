<template>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25z"
      :stroke="color"
      stroke-width="2"
      fill="none"
    />
    <path
      d="M14.06 4.94l3.75 3.75"
      :stroke="color"
      stroke-width="2"
    />
  </svg>
</template>

<script setup>
defineProps({
  color: { type: String, default: '#6c5ce7' },
});
</script>

