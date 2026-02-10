<template>
  <div class="knowledge-base">
    <!-- Tabs header -->
    <div class="tabs-header">
      <button
        :class="['tab-button', { active: activeTab === 'faq' }]"
        @click="activeTab = 'faq'"
      >
        FAQ
      </button>

      <button
        :class="['tab-button', { active: activeTab === 'sito-web' }]"
        @click="activeTab = 'sito-web'"
      >
        Sito Web
      </button>

      <button
        :class="['tab-button', { active: activeTab === 'file' }]"
        @click="activeTab = 'file'"
      >
        File
      </button>
    </div>

    <!-- Tabs content -->
    <FaqTab v-if="activeTab === 'faq'" />
    <SitoWebTab v-if="activeTab === 'sito-web'" />
    <FileTab v-if="activeTab === 'file'" />
  </div>
</template>

<script setup>
import { ref } from 'vue';

import FaqTab from './tabs/FaqTab.vue';
import FileTab from './tabs/FileTab.vue';
// se esiste
import SitoWebTab from './tabs/SitoWebTab.vue';

const activeTab = ref('faq');
</script>
