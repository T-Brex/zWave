<template>
  <div class="prompt-page">
    <CompanySelector />
    <PromptEditor />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStores } from '@directus/extensions-sdk';
import { useAzienda, provideAzienda } from '../composables/useAzienda';
import PromptEditor from '../components/PromptEditor.vue';
import CompanySelector from '../components/CompanySelector.vue';

const { useUserStore } = useStores();
const userStore = useUserStore();

const isAdmin = computed(() => {
  const roleName = String(userStore.currentUser?.role?.name || '').toLowerCase();
  return (
    !!userStore.currentUser?.role?.admin_access ||
    roleName.includes('admin') ||
    roleName.includes('ammin')
  );
});
const storageKey = computed(() => {
  if (isAdmin.value) return 'azienda_admin_selected';
  const userId = userStore.currentUser?.id;
  return userId ? `azienda_user_${userId}` : 'azienda_admin_selected';
});

const { selectedAzienda, setAzienda } = useAzienda({ storageKey });
provideAzienda({ selectedAzienda, setAzienda });
</script>

<style scoped>
.prompt-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
