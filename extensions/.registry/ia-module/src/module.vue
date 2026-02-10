<template>
  <private-view title="Agente IA">
    <template #navigation>
      <v-list nav>
        <v-list-item
          class="nav-item"
          :class="{ 'nav-item--active': currentView === 'base-conoscenza' }"
          @click="currentView = 'base-conoscenza'"
        >
          <v-list-item-icon><v-icon name="auto_stories" /></v-list-item-icon>
          <v-list-item-content>Base di conoscenza</v-list-item-content>
        </v-list-item>
        
        <v-list-item
          class="nav-item"
          :class="{ 'nav-item--active': currentView === 'prompt' }"
          @click="currentView = 'prompt'"
        >
          <v-list-item-icon><v-icon name="code" /></v-list-item-icon>
          <v-list-item-content>Prompt</v-list-item-content>
        </v-list-item>

        <v-list-item
          class="nav-item"
          :class="{ 'nav-item--active': currentView === 'deviazione-chiamate' }"
          @click="currentView = 'deviazione-chiamate'"
        >
          <v-list-item-icon><v-icon name="call_split" /></v-list-item-icon>
          <v-list-item-content>Deviazione Chiamate</v-list-item-content>
        </v-list-item>

        <v-list-item
          class="nav-item"
          :class="{ 'nav-item--active': currentView === 'calendario' }"
          @click="currentView = 'calendario'"
        >
          <v-list-item-icon><v-icon name="event" /></v-list-item-icon>
          <v-list-item-content>Impostazioni calendario</v-list-item-content>
        </v-list-item>
      </v-list>
    </template>

    <template #actions>
      <CompanySelector @selected="handleAziendaSelected" />
    </template>

    <!-- Base di Conoscenza View -->
    <div v-if="currentView === 'base-conoscenza'">
      <KnowledgeBaseView />
    </div>

    <!-- Prompt View -->
    <div v-if="currentView === 'prompt'">
      <PromptEditor />
    </div>

    <!-- Deviazione Chiamate View -->
    <div v-if="currentView === 'deviazione-chiamate'">
      <DeviazioneChiamateView />
    </div>

    <!-- Calendario View -->
    <div v-if="currentView === 'calendario'" class="calendario-view">
      <h1 class="calendario-view__title">Impostazioni calendario</h1>
        <p class="calendario-view__intro">
          Configura disponibilità e limiti su Cal.com; l’AI proporrà solo slot liberi nelle fasce orarie che imposti.
        </p>
        <v-button
          secondary
          class="calendario-button"
          @click="openCalendario"
        >
          <v-icon name="event" left />
          <span class="calendario-button-text">Imposta il tuo calendario</span>
          <v-icon name="open_in_new" right />
        </v-button>

      <div class="calendario-steps">
        <section class="calendario-step">
            <h2 class="calendario-step__title">Disponibilità e date specifiche</h2>
          <div class="calendario-step__frame" @click="openImageZoom(assetCalendario1)">
            <img
              :src="assetCalendario1"
              alt="Cal-disponibilita"
              class="calendario-asset-img calendario-asset-img--clickable"
            />
            <span class="calendario-step__zoom-hint">Clicca per ingrandire</span>
          </div>
          <div class="calendario-step__content">
            <p>Nella sezione "Disponibilità" è possibile impostare gli orari in cui si è disponibili di solito, come quelli di una normale settimana lavorativa. Chiaramente, l'AI andrà a proporre solo slot liberi in quelle fasce orarie (non proporrà slot dove hai già segnato un impegno sul tuo Calendar).</p>
            <p>È possibile personalizzare alcuni giorni (per esempio se si va in vacanza) nella sezione sottostante "Configurazione date specifiche".</p>
          </div>
        </section>

        <section class="calendario-step">
            <h2 class="calendario-step__title">Limiti e buffer</h2>
          <div class="calendario-step__frame" @click="openImageZoom(assetCalendario2)">
            <img
              :src="assetCalendario2"
              alt="Cal-disponibilita2"
              class="calendario-asset-img calendario-asset-img--clickable"
            />
            <span class="calendario-step__zoom-hint">Clicca per ingrandire</span>
          </div>
          <div class="calendario-step__content">
            <p>Cliccando su "Tipo di Evento", si aprirà la sezione "Limiti". Qui è possibile impostare quanto tempo si vuole lasciare libero prima o dopo un appuntamento (buffer). Ad esempio, il vostro appuntamento potrebbe durare mezz'ora di default, ma preferite lasciare anche 15/30 min di "buffer" nel caso vada spesso per le lunghe.</p>
            <p>È possibile impostare il preavviso minimo per la creazione dell'evento (in ore o in giorni).</p>
            <p>È possibile limitare il numero totale di appuntamenti che si prendono in una giornata.</p>
          </div>
        </section>
      </div>

      <!-- Lightbox per ingrandire le immagini -->
      <div
        v-if="imageZoomSrc"
        class="calendario-image-zoom"
        @click.self="imageZoomSrc = null"
      >
        <button
          type="button"
          class="calendario-image-zoom__close"
          aria-label="Chiudi"
          @click="imageZoomSrc = null"
        >
          <v-icon name="close" />
        </button>
        <img
          :src="imageZoomSrc"
          alt="Ingrandimento"
          class="calendario-image-zoom__img"
          @click.stop
        />
      </div>
    </div>

    <!-- Iframe Modal (fallback anti-403) -->
    <IframeModal
      :open="iframeModalOpen"
      :title="iframeModalTitle"
      :icon="iframeModalIcon"
      :src="iframeModalSrc"
      :saving="iframeSaving"
      @update:open="iframeModalOpen = $event"
      @close="closeIframeModal"
      @save="triggerIframeSave"
    />
  </private-view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import { useAzienda, provideAzienda } from './composables/useAzienda';
import KnowledgeBaseView from './components/KnowledgeBaseView.vue';
import PromptEditor from './components/PromptEditor.vue';
import DeviazioneChiamateView from './components/DeviazioneChiamateView.vue';
import IframeModal from './components/IframeModal.vue';
import CompanySelector from './components/CompanySelector.vue';
import { assetCalendario1, assetCalendario2 } from './calendario-assets.js';

const api = useApi();
const { useUserStore } = useStores();
const userStore = useUserStore();

// Gestione azienda selezionata
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

const currentView = ref('base-conoscenza');

const CALENDARIO_URL = 'https://cal-calcom.oyxsxy.easypanel.host/availability';

function openCalendario() {
  window.open(CALENDARIO_URL, '_blank', 'noopener,noreferrer');
}

const imageZoomSrc = ref(null);

function openImageZoom(src) {
  imageZoomSrc.value = src;
}

// Iframe Modal state (legacy support for old code that might still use it)
const iframeModalOpen = ref(false);
const iframeModalSrc = ref('');
const iframeModalTitle = ref('');
const iframeModalIcon = ref('add');
const iframeSaving = ref(false);

function closeIframeModal() {
  iframeModalOpen.value = false;
  iframeModalSrc.value = '';
}

async function triggerIframeSave() {
  // This is a placeholder - actual implementation would need iframe ref
  // For now, this maintains compatibility with existing code
  iframeSaving.value = true;
  setTimeout(() => {
    iframeSaving.value = false;
  }, 800);
}

function handleAziendaSelected(azienda) {
  // Aggiorna l'azienda selezionata
  setAzienda(azienda);
}

// Expose iframe modal functions globally for legacy code compatibility
if (typeof window !== 'undefined') {
  window.__iaModuleIframeModal = {
    open: (src, title, icon) => {
      iframeModalSrc.value = src;
      iframeModalTitle.value = title || 'Modifica';
      iframeModalIcon.value = icon || 'edit';
      iframeModalOpen.value = true;
    },
    close: closeIframeModal,
  };
}
</script>

<style scoped>
.nav-item {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
}

.nav-item:hover {
  background: var(--background-subdued, #f9fafb);
}

.nav-item.nav-item--active {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-normal, #e8e8e8);
}

.nav-item.nav-item--active :deep(.v-list-item-content) {
  color: var(--foreground, #1a1a1a);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.nav-item.nav-item--active :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  opacity: 0.9;
}

/* Calendario view */
.calendario-view {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 32px 48px;
  box-sizing: border-box;
}

.calendario-view__title {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  letter-spacing: -0.02em;
  text-align: center;
}

.calendario-view__intro {
  margin: 0 0 28px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--foreground-subdued, #5f6368);
  text-align: center;
  align-self: center;
}

.calendario-button {
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
  margin-bottom: 48px;
  align-self: center;
}

.calendario-button :deep(.v-button) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  min-height: 52px;
  box-sizing: border-box;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: visible;
  line-height: 1.5;
  border: 2px solid var(--border-color-subdued, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.calendario-button :deep(.v-button:hover) {
  box-shadow: 0 4px 14px rgba(94, 114, 228, 0.25);
  transform: translateY(-1px);
  border: 2px solid var(--primary, #5e72e4);
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.08) 0%, var(--background-normal, #ffffff) 100%) !important;
}

.calendario-button :deep(.v-button:active) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.calendario-button :deep(.v-icon) {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  vertical-align: middle;
  transition: all 0.2s ease;
}

.calendario-button :deep(.v-icon[name="event"]) {
  color: inherit;
  opacity: 0.85;
}

.calendario-button :deep(.v-icon[name="open_in_new"]) {
  color: inherit;
  opacity: 0.65;
  width: 18px;
  height: 18px;
}

.calendario-button :deep(.v-button:hover .v-icon[name="open_in_new"]) {
  opacity: 0.85;
}

.calendario-button-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  letter-spacing: -0.01em;
  font-size: 14px;
  line-height: 1.4;
}

/* Steps – ordine verticale: titolo → frame (img) → testo sotto */
.calendario-steps {
  display: flex;
  flex-direction: column;
  gap: 48px;
  width: 100%;
}

.calendario-step {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  padding: 28px 24px 32px;
  background: linear-gradient(135deg, var(--background-subdued, #f8f9fa) 0%, var(--background-normal, #ffffff) 100%);
  border: 1px solid var(--border-normal, #e8e8e8);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.calendario-step__title {
  margin: 0 0 20px;
  font-size: 16px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  letter-spacing: -0.01em;
  text-align: left;
}

.calendario-step__frame {
  width: 100%;
  margin-bottom: 24px;
  padding: 14px;
  background: var(--background-normal, #ffffff);
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.calendario-step__frame:hover {
  border-color: var(--primary, #5e72e4);
  box-shadow: 0 2px 12px rgba(94, 114, 228, 0.15);
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.05) 0%, var(--background-normal, #ffffff) 100%);
}

.calendario-step__frame .calendario-asset-img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 340px;
  object-fit: contain;
  border-radius: 8px;
  margin: 0 auto;
}

.calendario-asset-img--clickable {
  pointer-events: none;
}

.calendario-step__zoom-hint {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--foreground-subdued, #5f6368);
  text-align: center;
}

.calendario-step__content {
  width: 100%;
  max-width: none;
  padding: 0;
  box-sizing: border-box;
  text-align: left;
}

.calendario-step__content p {
  margin: 0 0 14px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--foreground-normal, #1a1a1a);
}

.calendario-step__content p:last-child {
  margin-bottom: 0;
}

/* Lightbox per ingrandire le immagini */
.calendario-image-zoom {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.75);
  cursor: zoom-out;
}

.calendario-image-zoom__close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 10px;
  background: var(--background-normal, #fff);
  color: var(--foreground, #1a1a1a);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: background 0.2s ease, transform 0.2s ease;
}

.calendario-image-zoom__close:hover {
  background: var(--background-subdued, #f5f5f5);
  transform: scale(1.05);
}

.calendario-image-zoom__close :deep(.v-icon) {
  width: 24px;
  height: 24px;
}

.calendario-image-zoom__img {
  max-width: 92vw;
  max-height: 88vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  cursor: default;
}
</style>
