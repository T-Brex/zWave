<template>
  <div class="base-conoscenza">
    <!-- Tabs -->
    <div class="tabs-header">
      <button 
        :class="['tab-button', { active: activeTab === 'faq' }]"
        @click="setActiveTab('faq')"
      >
        <v-icon name="help_outline" small />
        FAQ
      </button>
      <button 
        :class="['tab-button', { active: activeTab === 'sito-web' }]"
        @click="setActiveTab('sito-web')"
      >
        <v-icon name="language" small />
        Sito Web
      </button>
      <button 
        :class="['tab-button', { active: activeTab === 'file' }]"
        @click="setActiveTab('file')"
      >
        <v-icon name="description" small />
        File
      </button>
    </div>

    <!-- FAQ Tab Content -->
    <div v-if="activeTab === 'faq'" class="tab-content">
      <FaqTab />
    </div>

    <!-- Sito Web Tab Content -->
    <div v-if="activeTab === 'sito-web'" class="tab-content">
      <SitoWebTab />
    </div>

    <!-- File Tab Content -->
    <div v-if="activeTab === 'file'" class="tab-content">
      <FileTab />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import FaqTab from '../pages/tabs/FaqTab.vue';
import FileTab from '../pages/tabs/FileTab.vue';
import SitoWebTab from '../pages/tabs/SitoWebTab.vue';

const activeTab = ref('faq');

function setActiveTab(tabKey) {
  activeTab.value = tabKey;
}
</script>

<style scoped>
.base-conoscenza {
  padding: 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.tabs-header {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  border-bottom: 2px solid var(--border-normal, #e8e8e8);
  padding-bottom: 0;
  width: 100%;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  flex: 1;
  justify-content: center;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--foreground-subdued, #6b7280);
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: -2px;
  letter-spacing: -0.01em;
  cursor: pointer;
}

.tab-button:hover {
  color: var(--foreground, #1a1a1a);
  background: var(--background-subdued, #f9fafb);
}

.tab-button.active {
  color: var(--primary, #5e72e4);
  border-bottom-color: var(--primary, #5e72e4);
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.05) 0%, rgba(255, 255, 255, 0) 100%);
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
