<template>
  <div class="file-tab">
    <div class="file-header">
      <v-input
        v-model="search"
        placeholder="Cerca nei file..."
        class="search-input"
      >
        <template #prepend>
          <v-icon name="search" />
        </template>
      </v-input>

      <v-button @click="openFileCreate">
        <v-icon name="add" left />
        Aggiungi File
      </v-button>
    </div>

    <iframe
      ref="fileFrame"
      class="embed-frame"
      :src="iframeSrc"
      @load="onFrameLoad"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const FILE_COLLECTION = 'File';
const search = ref('');
const fileFrame = ref(null);

const iframeSrc = computed(() => {
  const base = `/admin/content/${FILE_COLLECTION}`;
  const params = new URLSearchParams();
  if (search.value) params.set('search', search.value);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
});

function onFrameLoad() {
  // Inject styles to hide Directus chrome
  const frame = fileFrame.value;
  if (!frame) return;
  try {
    const doc = frame.contentDocument;
    if (!doc) return;
    
    const id = 'file-embed-style';
    if (doc.getElementById(id)) return;

    const style = doc.createElement('style');
    style.id = id;
    style.textContent = `
      .module-bar,
      .module-nav,
      .module-navigation,
      .navigation,
      aside,
      nav,
      [class*="sidebar"],
      [class*="nav-"],
      [class*="module-bar"],
      [class*="module-nav"] {
        display: none !important;
      }
      html, body, #app {
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
      }
      [class*="layout"] {
        grid-template-columns: 1fr !important;
      }
    `;
    doc.head?.appendChild(style);
  } catch {
    // ignore (should be same-origin, but be safe)
  }
}

function openFileCreate() {
  window.location.href = `/admin/content/${FILE_COLLECTION}/+`;
}
</script>

<style scoped>
.file-tab {
  width: 100%;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid var(--border-normal, #e8e8e8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.search-input {
  flex: 1;
  max-width: 400px;
}

.embed-frame {
  width: 100%;
  height: 70vh;
  border: 0;
  border-radius: 12px;
  background: var(--background-page, #ffffff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
</style>
