<template>
  <private-view title="Chiamate Outbound">
    <!-- Navigation Sidebar -->
    <template #navigation>
      <v-list nav>
        <v-list-item
          class="nav-item"
          :class="{ 'nav-item--active': activeSection === 'leads' }"
          :active="activeSection === 'leads'"
          @click="activeSection = 'leads'"
        >
          <v-list-item-icon>
            <v-icon name="people" />
          </v-list-item-icon>
          <v-list-item-content>
            Elenco lead
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          class="nav-item"
          :class="{ 'nav-item--active': activeSection === 'assegna-numero' }"
          :active="activeSection === 'assegna-numero'"
          @click="activeSection = 'assegna-numero'"
        >
          <v-list-item-icon>
            <v-icon name="settings" />
          </v-list-item-icon>
          <v-list-item-content>
            Impostazioni Chiamata
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </template>

    <!-- Drawer per selezione aziende (destra) - come Deviazione Chiamate -->
    <v-drawer
      v-model="drawerOpen"
      side="right"
      :title="drawerTitle"
      width="320"
    >
      <div class="drawer-content">
        <div class="drawer-header">
          <div class="drawer-header-title">
            <v-icon name="business" />
            <span>Seleziona Azienda</span>
          </div>
          <div class="drawer-header-actions">
            <v-button
              v-tooltip="'Aggiorna lista aziende'"
              icon
              secondary
              :loading="aziendeLoading"
              @click="loadAziende"
            >
              <v-icon name="refresh" />
            </v-button>
          </div>
        </div>

        <div v-if="aziendeLoading" class="drawer-loading">
          <v-progress-circular indeterminate />
          <span>Caricamento aziende...</span>
        </div>

        <v-info
          v-else-if="aziendeError"
          type="danger"
          icon="error"
          :title="aziendeError.title || 'Errore caricamento'"
          :text="aziendeError.message || ''"
        >
          <template #append>
            <v-button @click="loadAziende" :loading="aziendeLoading">Riprova</v-button>
          </template>
        </v-info>

        <v-info
          v-else-if="aziende.length === 0"
          icon="info"
          title="Nessuna azienda"
          text="Non sono state trovate aziende nella collection clienti."
        />

        <v-list v-else nav class="aziende-list">
          <v-list-item
            v-for="azienda in aziende"
            :key="azienda"
            class="azienda-item"
            :class="{ 'azienda-item--active': selectedAzienda === azienda }"
            @click="selectAzienda(azienda)"
          >
            <v-list-item-icon>
              <v-icon :name="selectedAzienda === azienda ? 'check_circle' : 'business'" />
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>{{ azienda || 'Senza nome' }}</v-list-item-title>
            </v-list-item-content>
            <v-list-item-icon v-if="selectedAzienda === azienda">
              <v-icon name="check" />
            </v-list-item-icon>
          </v-list-item>
        </v-list>

        <div v-if="selectedAzienda" class="selected-azienda-info">
          <div class="selected-azienda-label">Azienda attualmente selezionata:</div>
          <div class="selected-azienda-name">
            <v-icon name="check_circle" />
            <span>{{ selectedAzienda }}</span>
          </div>
        </div>
      </div>
    </v-drawer>

    <!-- Main Content -->
    <div class="outbound-container">
      <!-- Sezione Elenco lead -->
      <template v-if="activeSection === 'leads'">
      <!-- Header pagina con pulsante azienda (come Deviazione Chiamate) -->
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Chiamate Outbound</h1>
          <p class="page-subtitle">Visualizza e gestisci i leads</p>
        </div>
        <v-button
          v-tooltip="selectedAzienda ? 'Cambia azienda' : 'Seleziona azienda'"
          :secondary="!!selectedAzienda"
          :type="selectedAzienda ? 'secondary' : 'primary'"
          @click="drawerOpen = true"
          class="azienda-select-button"
        >
          <v-icon name="business" left />
          <span class="azienda-button-text">
            {{ selectedAzienda || 'Seleziona azienda' }}
          </span>
          <v-icon name="arrow_drop_down" right />
        </v-button>
        <v-button
          v-tooltip="selectedAzienda ? 'Importa leads da foglio Google' : 'Seleziona un\'azienda per importare i leads da foglio Google'"
          :secondary="true"
          class="header-action-button import-leads-button"
          :disabled="!selectedAzienda || importing"
          :loading="importing"
          @click="importLeadsToWebhook"
        >
          <v-icon name="upload" left />
          <span class="header-action-button-text">Importa leads</span>
        </v-button>
        <v-button
          v-tooltip="selectedGoogleFoglioUrl ? 'Apri il foglio Google del cliente' : (selectedAzienda ? 'Nessun link al foglio Google per questo cliente' : 'Seleziona un\'azienda')"
          icon
          secondary
          :disabled="!selectedGoogleFoglioUrl"
          class="google-foglio-button"
          @click="openGoogleFoglio"
        >
          <v-icon name="link" />
        </v-button>
        <v-button
          v-tooltip="chiamateAutomatiche ? 'Disattiva chiamate automatiche' : 'Attiva chiamate automatiche'"
          secondary
          class="header-action-button"
          :disabled="!selectedAzienda || !selectedClienteId || chiamateAutomaticheLoading"
          :loading="chiamateAutomaticheLoading"
          @click="toggleChiamateAutomatiche"
        >
          <v-icon :name="chiamateAutomatiche ? 'toggle_on' : 'toggle_off'" left />
          <span class="header-action-button-text">Chiamate automatiche: {{ chiamateAutomatiche ? 'Attivo' : 'Inattivo' }}</span>
        </v-button>
        <v-button
          v-tooltip="'Aggiorna lista lead'"
          icon
          secondary
          :loading="loading"
          @click="loadLeads"
          class="refresh-button"
        >
          <v-icon name="refresh" />
        </v-button>
      </div>

      <!-- Notifiche importazione (successo / errore) -->
      <transition name="fade">
        <div v-if="importSuccess" class="import-notice import-notice--success import-notice-inline">
          <v-icon name="check_circle" />
          <span>Importazione avviata con successo.</span>
        </div>
      </transition>
      <transition name="fade">
        <div v-if="importError" class="import-notice import-notice--error import-notice-inline">
          <v-icon name="error" />
          <span>{{ importError }}</span>
        </div>
      </transition>
      <transition name="fade">
        <div v-if="chiamateAutomaticheError" class="import-notice import-notice--error import-notice-inline">
          <v-icon name="error" />
          <span>{{ chiamateAutomaticheError }}</span>
        </div>
      </transition>

      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <v-progress-circular indeterminate />
        <span>Caricamento lead...</span>
      </div>

      <!-- Error State -->
      <v-info
        v-else-if="error"
        type="danger"
        icon="error"
        :title="error.title || 'Errore caricamento'"
        :text="error.message || ''"
      >
        <template #append>
          <v-button @click="loadLeads" :loading="loading">Riprova</v-button>
        </template>
      </v-info>

      <!-- Empty State -->
      <v-info
        v-else-if="leads.length === 0"
        icon="people"
        title="Nessun lead"
        text="Non sono presenti lead nella collection leads. Aggiungi dei lead per visualizzarli qui."
      />

      <!-- Tabella Lead -->
      <div v-else class="leads-section">
        <div class="section-header">
          <div class="section-title">
            <v-icon name="people" />
            <span>Elenco lead ({{ filteredAndSortedLeads.length }}{{ searchQuery ? ` di ${leads.length}` : '' }})</span>
          </div>
          <div class="section-toolbar">
            <div class="search-bar-wrapper">
              <v-icon name="search" class="search-bar-icon" />
              <input
                v-model="searchQuery"
                type="text"
                class="search-bar-input"
                placeholder="Cerca per nome, cognome, numero o esito..."
                aria-label="Cerca lead"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="search-bar-clear"
                aria-label="Cancella ricerca"
                @click="searchQuery = ''"
              >
                <v-icon name="close" />
              </button>
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="leads-table">
            <thead>
              <tr>
                <th class="th-checkbox">
                  <label class="th-checkbox-label" @click.stop>
                    <input
                      type="checkbox"
                      :checked="allVisibleSelected"
                      :indeterminate.prop="someVisibleSelected && !allVisibleSelected"
                      class="th-checkbox-input"
                      aria-label="Seleziona tutti i lead visibili"
                      @change="toggleAllVisible"
                    />
                  </label>
                </th>
                <th
                  class="th-nome th-sortable"
                  :class="{ 'th-sorted': sortBy === 'nome' }"
                  @click="setSort('nome')"
                >
                  <span class="th-sortable-inner">
                    <span class="th-sortable-text">Nome</span>
                    <v-icon v-if="sortBy === 'nome'" :name="sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" class="th-sort-icon" />
                    <v-icon v-else name="unfold_more" class="th-sort-icon th-sort-icon--muted" />
                  </span>
                </th>
                <th
                  class="th-cognome th-sortable"
                  :class="{ 'th-sorted': sortBy === 'cognome' }"
                  @click="setSort('cognome')"
                >
                  <span class="th-sortable-inner">
                    <span class="th-sortable-text">Cognome</span>
                    <v-icon v-if="sortBy === 'cognome'" :name="sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" class="th-sort-icon" />
                    <v-icon v-else name="unfold_more" class="th-sort-icon th-sort-icon--muted" />
                  </span>
                </th>
                <th
                  class="th-numero th-sortable"
                  :class="{ 'th-sorted': sortBy === 'numero' }"
                  @click="setSort('numero')"
                >
                  <span class="th-sortable-inner">
                    <span class="th-sortable-text">Numero</span>
                    <v-icon v-if="sortBy === 'numero'" :name="sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" class="th-sort-icon" />
                    <v-icon v-else name="unfold_more" class="th-sort-icon th-sort-icon--muted" />
                  </span>
                </th>
                <th
                  class="th-chiamato th-sortable"
                  :class="{ 'th-sorted': sortBy === 'chiamato' }"
                  @click="setSort('chiamato')"
                >
                  <span class="th-sortable-inner">
                    <span class="th-sortable-text">Chiamato</span>
                    <v-icon v-if="sortBy === 'chiamato'" :name="sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" class="th-sort-icon" />
                    <v-icon v-else name="unfold_more" class="th-sort-icon th-sort-icon--muted" />
                  </span>
                </th>
                <th
                  class="th-esito-chiamata th-sortable"
                  :class="{ 'th-sorted': sortBy === 'esito_chiamata' }"
                  @click="setSort('esito_chiamata')"
                >
                  <span class="th-sortable-inner">
                    <span class="th-sortable-text">Esito chiamata</span>
                    <v-icon v-if="sortBy === 'esito_chiamata'" :name="sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" class="th-sort-icon" />
                    <v-icon v-else name="unfold_more" class="th-sort-icon th-sort-icon--muted" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="lead in filteredAndSortedLeads"
                :key="lead.id"
                class="lead-row"
                :class="{ 'lead-row--selected': isLeadSelected(lead) }"
              >
                <td class="td-checkbox">
                  <label class="td-checkbox-label" @click.stop>
                    <input
                      type="checkbox"
                      :checked="isLeadSelected(lead)"
                      class="td-checkbox-input"
                      :aria-label="`Seleziona ${getLeadNome(lead)} ${getLeadCognome(lead)}`"
                      @change="toggleLead(lead)"
                    />
                  </label>
                </td>
                <td class="td-nome">{{ getLeadNome(lead) }}</td>
                <td class="td-cognome">{{ getLeadCognome(lead) }}</td>
                <td class="td-numero">
                  <span class="numero-value">{{ formatNumero(getLeadNumero(lead)) }}</span>
                </td>
                <td class="td-chiamato">
                  <span
                    class="chiamato-badge"
                    :class="getLeadChiamato(lead) ? 'chiamato-badge--yes' : 'chiamato-badge--no'"
                  >
                    <v-icon
                      v-if="getLeadChiamato(lead)"
                      name="check_circle"
                      class="chiamato-icon"
                    />
                    <v-icon
                      v-else
                      name="phone_callback"
                      class="chiamato-icon chiamato-icon--pending"
                    />
                    <span class="chiamato-label">{{ getLeadChiamato(lead) ? 'Chiamato' : 'Da chiamare' }}</span>
                  </span>
                </td>
                <td class="td-esito-chiamata">{{ getLeadEsitoChiamata(lead) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="filteredAndSortedLeads.length === 0 && leads.length > 0" class="leads-empty-search">
          <v-icon name="search_off" />
          <span>Nessun lead corrisponde alla ricerca.</span>
        </div>
      </div>
      </template>

      <!-- Sezione Impostazioni Chiamata -->
      <div v-else-if="activeSection === 'assegna-numero'" class="impostazioni-chiamata-section">
        <div class="impostazioni-chiamata-header">
          <h2 class="impostazioni-chiamata-title">Impostazioni Chiamata</h2>
          <v-button
            v-tooltip="selectedAzienda ? 'Cambia azienda' : 'Seleziona azienda'"
            :secondary="!!selectedAzienda"
            :type="selectedAzienda ? 'secondary' : 'primary'"
            class="impostazioni-azienda-btn"
            @click="drawerOpen = true"
          >
            <v-icon name="business" left />
            <span class="impostazioni-azienda-text">{{ selectedAzienda || 'Seleziona azienda' }}</span>
            <v-icon name="arrow_drop_down" right />
          </v-button>
        </div>
        <div v-if="!selectedAzienda" class="impostazioni-placeholder">
          <v-icon name="business" class="impostazioni-placeholder-icon" />
          <p class="impostazioni-placeholder-text">Seleziona un'azienda dalla barra in alto per configurare le impostazioni di chiamata.</p>
        </div>
        <template v-else>
          <!-- Card 1: Numero di telefono (stile Deviazione Chiamate) -->
          <div class="impostazioni-card impostazioni-card--numero numero-section-deviazione">
            <div class="form-field form-field-small">
              <div class="field-label">
                <v-icon name="phone" />
                <span>Numero da cui far partire le chiamate</span>
              </div>
              <div class="input-with-prefix-wrap">
                <div class="input-with-prefix" :class="{ 'field-error-state': numeroAssegnaError }">
                  <span class="input-prefix">+39</span>
                  <v-input
                    v-model="numeroAssegna"
                    type="tel"
                    placeholder="es. 3331234567"
                    :disabled="numeroAssegnaLoading"
                    class="input-with-prefix-input"
                  />
                </div>
                <v-button
                  class="numero-invia-btn"
                  :loading="numeroAssegnaLoading"
                  :disabled="!numeroAssegnaTrimmed || numeroAssegnaLoading"
                  @click="sendNumeroWebhook"
                >
                  <v-icon name="send" left />
                  Invia
                </v-button>
              </div>
              <div class="field-help">
                Inserisci il numero da cui far partire le chiamate. Verrà inviato al sistema.
              </div>
            </div>
            <transition name="fade">
              <div v-if="numeroAssegnaSuccess" class="impostazioni-call-box">
                <div class="impostazioni-call-box-header">
                  <v-icon name="phone_callback" class="impostazioni-call-box-icon" />
                  <span class="impostazioni-call-box-title">Riceverai una chiamata</span>
                </div>
                <p class="impostazioni-call-box-desc">
                  A breve riceverai una chiamata sul numero inserito. Quando ti viene richiesto, <strong>digita il codice qui sotto sul tastierino numerico del telefono</strong>.
                </p>
                <template v-if="numeroAssegnaCodice">
                  <div class="impostazioni-call-box-code-wrap">
                    <span class="impostazioni-call-box-code-label">Codice da inserire:</span>
                    <span class="impostazioni-call-box-code">{{ numeroAssegnaCodice }}</span>
                  </div>
                </template>
                <p class="impostazioni-call-box-hint">
                  Questo messaggio resterà visibile per 5 minuti. Tieni il codice a portata di mano durante la chiamata.
                </p>
              </div>
            </transition>
            <transition name="fade">
              <div v-if="numeroAssegnaError" class="impostazioni-notice impostazioni-notice--error">
                <v-icon name="error" />
                <span>{{ numeroAssegnaError }}</span>
              </div>
            </transition>
          </div>

          <!-- Card: Seleziona numero verificato per le chiamate -->
          <div class="impostazioni-card impostazioni-card--numeri-verificati">
            <div class="impostazioni-card-title-row">
              <h3 class="impostazioni-card-title">
                <v-icon name="phone_in_talk" />
                <span>Numero per le chiamate</span>
              </h3>
              <v-button
                v-tooltip="'Ricarica numeri verificati'"
                icon
                secondary
                class="impostazioni-numeri-refresh"
                :loading="numeriVerificatiLoading"
                :disabled="numeriVerificatiLoading"
                @click="loadNumeriVerificati"
              >
                <v-icon name="refresh" />
              </v-button>
            </div>
            <p class="impostazioni-card-desc">
              Scegli il numero da cui far partire le chiamate tra quelli già verificati. Il numero selezionato viene salvato nelle impostazioni di chiamata.
            </p>
            <div v-if="numeriVerificatiLoading" class="impostazioni-loading impostazioni-loading--small">
              <v-progress-circular indeterminate />
              <span>Caricamento numeri verificati...</span>
            </div>
            <template v-else>
              <p v-if="numeriVerificati.length === 0" class="impostazioni-empty-hint">
                Nessun numero verificato. Inserisci un numero sopra, completa la verifica con la chiamata ricevuta e torna qui per selezionarlo. Per il caricamento del numero possono volerci tra i 2 e i 5 minuti.
              </p>
              <div v-else class="impostazioni-numeri-list">
                <button
                  v-for="(item, index) in numeriVerificati"
                  :key="index"
                  type="button"
                  class="impostazioni-numero-item"
                  :class="{ 'impostazioni-numero-item--selected': selectedAgentPhoneNumberId === (item?.agent_phone_number_id ?? '') }"
                  :disabled="numeriVerificatiSelecting"
                  @click="selectNumeroVerificato(item)"
                >
                  <span class="impostazioni-numero-item-numero">{{ formatNumeroDisplay(item?.numero ?? '') }}</span>
                  <v-icon
                    v-if="selectedAgentPhoneNumberId === (item?.agent_phone_number_id ?? '')"
                    name="check_circle"
                    class="impostazioni-numero-item-check"
                  />
                </button>
              </div>
            </template>
          </div>

          <!-- Card 2: Orari e strategia richiamate -->
          <div class="impostazioni-card impostazioni-card--settings">
            <div class="impostazioni-card-title-row">
              <h3 class="impostazioni-card-title">
                <v-icon name="schedule" />
                <span>Orari e strategia richiamate</span>
              </h3>
              <v-button
                v-tooltip="richiamateAutomaticheOutbound ? 'Disattiva richiamate automatiche' : 'Attiva richiamate automatiche'"
                secondary
                class="impostazioni-richiamate-auto-btn"
                :disabled="!selectedAzienda || richiamateAutomaticheOutboundLoading || outboundLoading"
                :loading="richiamateAutomaticheOutboundLoading"
                @click="toggleRichiamateAutomaticheOutbound"
              >
                <v-icon :name="richiamateAutomaticheOutbound ? 'toggle_on' : 'toggle_off'" left />
                <span class="impostazioni-richiamate-auto-label">Richiamate automatiche: {{ richiamateAutomaticheOutbound ? 'Attivo' : 'Inattivo' }}</span>
              </v-button>
            </div>
            <p class="impostazioni-card-desc">Configura quando effettuare le richiamate e come gestire occupato, non risponde e segreteria.</p>

            <div v-if="outboundLoading" class="impostazioni-loading">
              <v-progress-circular indeterminate />
              <span>Caricamento impostazioni...</span>
            </div>

            <template v-else>
              <!-- Tentativi massimi -->
              <div class="impostazioni-field">
                <label class="impostazioni-label">Tentativi massimi</label>
                <p class="impostazioni-hint">Riprova al massimo questo numero di volte (es. 3).</p>
                <input
                  v-model.number="tentativiRichiamate"
                  type="number"
                  min="1"
                  max="20"
                  class="impostazioni-input impostazioni-input--number"
                />
              </div>

              <!-- Orari richiamate per giorno – stile tabella compatta -->
              <div class="impostazioni-field impostazioni-field--block">
                <label class="impostazioni-label">Orari richiamate per giorno</label>
                <p class="impostazioni-hint">Per ogni giorno definisci una o più fasce orarie. Lascia vuoto per non effettuare chiamate in quel giorno.</p>
                <div class="orari-schedule">
                  <div
                    v-for="(dayGroup, dayIndex) in orariPerGiorno"
                    :key="dayGroup.day"
                    class="orari-schedule-row"
                  >
                    <div class="orari-schedule-day">{{ dayGroup.label }}</div>
                    <div class="orari-schedule-slots">
                      <template v-for="(slot, slotIndex) in dayGroup.slots" :key="slotIndex">
                        <span class="orari-slot">
                          <input v-model="slot.from" type="time" class="orari-time" />
                          <span class="orari-slot-sep">–</span>
                          <input v-model="slot.to" type="time" class="orari-time" />
                          <button type="button" class="orari-slot-remove" aria-label="Rimuovi fascia" @click="removeOrarioSlot(dayIndex, slotIndex)">
                            <v-icon name="close" />
                          </button>
                        </span>
                      </template>
                      <button type="button" class="orari-add-slot" @click="addOrarioSlot(dayIndex)">
                        <v-icon name="add" />
                        <span>Aggiungi</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Strategia di Riprova -->
              <div class="impostazioni-field impostazioni-field--block">
                <label class="impostazioni-label">Strategia di Riprova (Retry Logic)</label>
                <div class="impostazioni-retry-grid">
                  <div class="impostazioni-retry-item">
                    <span class="impostazioni-retry-label">Se &quot;Occupato&quot;</span>
                    <span class="impostazioni-retry-desc">Richiama dopo</span>
                    <div class="impostazioni-retry-input-wrap">
                      <input
                        v-model.number="riprovaOccupatoMinuti"
                        type="number"
                        min="1"
                        max="120"
                        class="impostazioni-input impostazioni-input--small"
                      />
                      <span>minuti</span>
                    </div>
                  </div>
                  <div class="impostazioni-retry-item">
                    <span class="impostazioni-retry-label">Se &quot;Non Risponde&quot;</span>
                    <span class="impostazioni-retry-desc">Richiama dopo</span>
                    <div class="impostazioni-retry-input-wrap">
                      <input
                        v-model.number="riprovaNonRispondeOre"
                        type="number"
                        min="1"
                        max="72"
                        class="impostazioni-input impostazioni-input--small"
                      />
                      <span>ore</span>
                    </div>
                  </div>
                  <div class="impostazioni-retry-item">
                    <span class="impostazioni-retry-label">Se &quot;Segreteria&quot;</span>
                    <span class="impostazioni-retry-desc">Richiama dopo</span>
                    <div class="impostazioni-retry-input-wrap">
                      <input
                        v-model.number="riprovaSegreteriaMinuti"
                        type="number"
                        min="1"
                        max="1440"
                        class="impostazioni-input impostazioni-input--small"
                      />
                      <span>minuti</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="impostazioni-actions">
                <v-button
                  class="impostazioni-save-btn"
                  :loading="outboundSaving"
                  :disabled="outboundSaving"
                  @click="saveOutboundSettings"
                >
                  <v-icon name="save" left />
                  Salva impostazioni
                </v-button>
                <transition name="fade">
                  <div v-if="outboundError" class="impostazioni-notice impostazioni-notice--error impostazioni-notice-inline">
                    <v-icon name="error" />
                    <span>{{ outboundError }}</span>
                  </div>
                </transition>
                <transition name="fade">
                  <div v-if="outboundSaveSuccess" class="impostazioni-notice impostazioni-notice--success impostazioni-notice-inline">
                    <v-icon name="check_circle" />
                    <span>Impostazioni salvate.</span>
                  </div>
                </transition>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>

    <!-- Pulsante Chiama - in basso a destra (FAB) - solo in Elenco lead -->
    <div v-if="activeSection === 'leads'" class="chiama-fab-wrapper">
      <v-button
        v-tooltip="selectedLeadIds.length > 0 ? `Avvia chiamata per ${selectedLeadIds.length} lead selezionati` : 'Seleziona uno o più lead dalla tabella'"
        class="chiama-fab"
        :class="{ 'chiama-fab--disabled': selectedLeadIds.length === 0 }"
        :loading="calling"
        :disabled="selectedLeadIds.length === 0 || calling"
        @click="callChiamaWebhook"
      >
        <v-icon name="phone" left />
        <span class="chiama-fab-label">Chiama</span>
        <span v-if="selectedLeadIds.length > 0" class="chiama-fab-count">{{ selectedLeadIds.length }}</span>
      </v-button>
      <transition name="fade">
        <div v-if="callSuccess" class="chiama-notice chiama-notice--success">
          <v-icon name="check_circle" />
          <span>Chiamata avviata per i lead selezionati.</span>
        </div>
      </transition>
      <transition name="fade">
        <div v-if="callError" class="chiama-notice chiama-notice--error">
          <v-icon name="error" />
          <span>{{ callError }}</span>
        </div>
      </transition>
    </div>
  </private-view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import {
  LEADS_COLLECTION,
  CLIENTI_COLLECTION,
  CHIAMATE_OUTBOUND_COLLECTION,
  WEBHOOK_IMPORT_LEADS,
  WEBHOOK_CHIAMA,
  WEBHOOK_NUMERO,
  NUMERI_ASSOCIATI_CLEANUP_MS,
  GIORNI_OPTIONS,
} from './constants.js';
import { useOutboundShared } from './composables/useOutboundShared.js';

const api = useApi();
const { useUserStore } = useStores();
const userStore = useUserStore();

// ---------- Stato condiviso (aziende, cliente, drawer) ----------
const shared = useOutboundShared(api);
const {
  aziende,
  aziendeLoading,
  aziendeError,
  selectedAzienda,
  drawerOpen,
  drawerTitle,
  selectedGoogleFoglioUrl,
  selectedClienteId,
  selectedClienteIdUser,
  chiamateAutomatiche,
  chiamateAutomaticheLoading,
  chiamateAutomaticheError,
  loadAziende,
  selectAzienda: selectAziendaShared,
  loadGoogleFoglioUrl,
  openGoogleFoglio,
  toggleChiamateAutomatiche,
} = shared;

function selectAzienda(aziendaName) {
  selectAziendaShared(aziendaName);
  loadGoogleFoglioUrl();
  loadLeads();
}

// ---------- Sezione attiva ----------
const activeSection = ref('leads');

// ---------- SEZIONE ELENCO LEAD ----------
const leads = ref([]);
const loading = ref(false);
const error = ref(null);

// ---------- SEZIONE IMPOSTAZIONI CHIAMATA ----------
const numeroAssegna = ref('');
const numeroAssegnaLoading = ref(false);
const numeroAssegnaSuccess = ref(false);
const numeroAssegnaError = ref(null);
const numeroAssegnaCodice = ref(null); // codice restituito dal webhook

// Impostazioni Chiamata: collection chiamate_outbound (orari, tentativi, riprova, giorni)
const outboundRecordId = ref(null);
const outboundLoading = ref(false);
const outboundSaving = ref(false);
const outboundError = ref(null);
const tentativiRichiamate = ref(3);
// Orari richiamate per giorno: { day, label, slots: [{ from, to }, ...] } per ogni giorno (1-7)
function getDefaultOrariPerGiorno() {
  return GIORNI_OPTIONS.map((d) => ({
    day: d.value,
    label: d.label,
    slots: d.value <= 5 ? [{ from: '09:00', to: '18:00' }] : [],
  }));
}
const orariPerGiorno = ref(getDefaultOrariPerGiorno());
const riprovaOccupatoMinuti = ref(15);
const riprovaNonRispondeOre = ref(4);
const riprovaSegreteriaMinuti = ref(60); // minuti dopo cui richiamare se "Segreteria"
const outboundSaveSuccess = ref(false);
const selectedAgentPhoneNumberId = ref(null); // agent_phone_number_id in chiamate_outbound
// Richiamate automatiche (campo richiamate_automatiche nella collection chiamate_outbound)
const richiamateAutomaticheOutbound = ref(false);
const richiamateAutomaticheOutboundLoading = ref(false);

// Numeri verificati (da numeri_associati clienti, filtrati verificato === true)
const numeriVerificati = ref([]);
const numeriVerificatiLoading = ref(false);
const numeriVerificatiSelecting = ref(false); // loading durante selezione

const numeroAssegnaTrimmed = computed(() => (numeroAssegna.value || '').trim().replace(/\s/g, ''));

// Importazione leads
const importing = ref(false);
const importSuccess = ref(false);
const importError = ref(null);

// Chiama (webhook)
const calling = ref(false);
const callSuccess = ref(false);
const callError = ref(null);

// Selezione lead per Chiama
const selectedLeadIds = ref([]);

// Ricerca e ordinamento
const searchQuery = ref('');
const sortBy = ref('cognome');
const sortDir = ref('asc');

const allVisibleSelected = computed(() => {
  const list = filteredAndSortedLeads.value;
  if (list.length === 0) return false;
  return list.every(lead => selectedLeadIds.value.includes(lead.id));
});

const someVisibleSelected = computed(() => {
  return filteredAndSortedLeads.value.some(lead => selectedLeadIds.value.includes(lead.id));
});

function isLeadSelected(lead) {
  return selectedLeadIds.value.includes(lead.id);
}

function toggleLead(lead) {
  const id = lead.id;
  const idx = selectedLeadIds.value.indexOf(id);
  if (idx === -1) {
    selectedLeadIds.value = [...selectedLeadIds.value, id];
  } else {
    selectedLeadIds.value = selectedLeadIds.value.filter(i => i !== id);
  }
}

function toggleAllVisible() {
  const list = filteredAndSortedLeads.value;
  if (allVisibleSelected.value) {
    const visibleIds = new Set(list.map(l => l.id));
    selectedLeadIds.value = selectedLeadIds.value.filter(id => !visibleIds.has(id));
  } else {
    const toAdd = list.filter(l => !selectedLeadIds.value.includes(l.id)).map(l => l.id);
    selectedLeadIds.value = [...selectedLeadIds.value, ...toAdd];
  }
}

const filteredAndSortedLeads = computed(() => {
  let list = [...leads.value];
  const rawQuery = (searchQuery.value || '').trim();
  if (rawQuery) {
    const q = rawQuery.toLowerCase();
    const qNorm = normalizeForSearch(rawQuery);
    const qDigits = rawQuery.replace(/\D/g, '');
    list = list.filter(lead => {
      const nome = normalizeForSearch(getLeadNome(lead));
      const cognome = normalizeForSearch(getLeadCognome(lead));
      const numeroRaw = getLeadNumero(lead);
      const numero = String(numeroRaw).replace(/\D/g, '');
      const chiamatoLabel = getLeadChiamato(lead) ? 'chiamato' : 'da chiamare';
      const esitoChiamata = normalizeForSearch(getLeadEsitoChiamata(lead));
      return nome.includes(qNorm) || cognome.includes(qNorm) || (qDigits.length > 0 && numero.includes(qDigits)) || chiamatoLabel.includes(q) || esitoChiamata.includes(qNorm);
    });
  }
  list.sort((a, b) => {
    let va, vb;
    if (sortBy.value === 'nome') {
      va = getLeadNome(a);
      vb = getLeadNome(b);
    } else if (sortBy.value === 'cognome') {
      va = getLeadCognome(a);
      vb = getLeadCognome(b);
    } else if (sortBy.value === 'numero') {
      va = (getLeadNumero(a) || '').replace(/\D/g, '');
      vb = (getLeadNumero(b) || '').replace(/\D/g, '');
    } else if (sortBy.value === 'esito_chiamata') {
      va = getLeadEsitoChiamata(a);
      vb = getLeadEsitoChiamata(b);
    } else {
      va = getLeadChiamato(a) ? 1 : 0;
      vb = getLeadChiamato(b) ? 1 : 0;
    }
    if (typeof va === 'number' && typeof vb === 'number') {
      const diff = va - vb;
      return sortDir.value === 'asc' ? diff : -diff;
    }
    const sa = String(va).toLowerCase();
    const sb = String(vb).toLowerCase();
    const cmp = sa.localeCompare(sb, undefined, { sensitivity: 'base' });
    return sortDir.value === 'asc' ? cmp : -cmp;
  });
  return list;
});

function setSort(field) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = field;
    sortDir.value = 'asc';
  }
}

// Supporto per nomi campo italiani o inglesi
function getLeadNome(lead) {
  const v = lead?.nome ?? lead?.first_name ?? lead?.name ?? '—';
  return typeof v === 'string' ? v : (v != null ? String(v) : '—');
}

function getLeadCognome(lead) {
  const v = lead?.cognome ?? lead?.last_name ?? lead?.surname ?? '—';
  return typeof v === 'string' ? v : (v != null ? String(v) : '—');
}

function getLeadNumero(lead) {
  const v = lead?.numero ?? lead?.numero_telefono ?? lead?.telefono ?? lead?.phone ?? lead?.numero_chiamata ?? '';
  return typeof v === 'string' ? v : (v != null ? String(v) : '');
}

// Normalizza stringa per ricerca: trim, lowercase, rimuove accenti
function normalizeForSearch(str) {
  if (str == null || typeof str !== 'string') return '';
  const trimmed = str.trim().toLowerCase();
  return trimmed.normalize('NFD').replace(/\u0300-\u036f/g, '');
}

function getLeadChiamato(lead) {
  if (lead?.chiamato === true || lead?.chiamato === 1) return true;
  if (lead?.called === true || lead?.called === 1) return true;
  return false;
}

function getLeadEsitoChiamata(lead) {
  const v = lead?.esito_chiamata ?? '';
  return typeof v === 'string' ? v : (v != null ? String(v) : '—');
}

function formatNumero(num) {
  if (!num || typeof num !== 'string') return '—';
  const cleaned = num.replace(/\D/g, '');
  if (cleaned.length < 6) return num;
  // Formato italiano: 3xx xxx xxxx o 3xxx xxx xxxx (10 cifre)
  if (cleaned.length === 10 && (cleaned.startsWith('3') || cleaned.startsWith('0'))) {
    return cleaned.replace(/(\d{3,4})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  // Altre lunghezze: gruppi 3-3-4 o 4-3-3
  if (cleaned.length >= 9) {
    return cleaned.replace(/(\d{2,4})(\d{3})(\d{3,4})/, '$1 $2 $3');
  }
  return num;
}

async function loadLeads() {
  loading.value = true;
  error.value = null;

  try {
    const params = {
      fields: ['id', 'nome', 'cognome', 'numero', 'chiamato', 'azienda', 'esito_chiamata'],
      limit: -1,
      sort: ['id'],
    };
    // Filtra i lead per l'azienda selezionata (attributo azienda della collection leads)
    if (selectedAzienda.value) {
      params.filter = {
        azienda: { _eq: selectedAzienda.value },
      };
    }

    const response = await api.get(`/items/${LEADS_COLLECTION}`, {
      params,
    });

    leads.value = response?.data?.data ?? [];
  } catch (err) {
    console.error('Error loading leads:', err);
    const status = err?.response?.status;
    const apiMessage = err?.response?.data?.errors?.[0]?.message ?? err?.response?.data?.errors?.[0]?.extensions?.code ?? err?.message ?? 'Errore sconosciuto';

    if (status === 403) {
      error.value = {
        title: 'Accesso negato (403)',
        message: `Directus ha risposto: "${apiMessage}". Vai in Impostazioni → Access Control → ruolo Administrator e verifica che sulla collection "leads" ci sia almeno il permesso di lettura (Read).`,
      };
    } else if (status === 404) {
      error.value = {
        title: 'Collection non trovata',
        message: `La collection "${LEADS_COLLECTION}" non esiste o l'endpoint non è disponibile. Dettaglio: ${apiMessage}.`,
      };
    } else {
      error.value = {
        title: `Errore ${status || ''}`.trim() || 'Errore di caricamento',
        message: String(apiMessage),
      };
    }
    leads.value = [];
  } finally {
    loading.value = false;
  }
}

// --- Impostazioni Chiamata: numero + webhook (GET), salvataggio in numeri_associati ---
let numeriAssociatiCleanupTimer = null;

function parseNumeriAssociati(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object' && Array.isArray(raw.blocks)) return raw.blocks;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.blocks) ? parsed.blocks : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function normalizeNumeriAssociatiForSave(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => ({
    numero: item?.numero ?? '',
    verificato: item?.verificato === true,
    agent_phone_number_id: item?.agent_phone_number_id != null ? String(item.agent_phone_number_id) : '',
    added_at: item?.added_at ?? null,
  }));
}

async function cleanupNumeriAssociatiNonVerificati(outboundId) {
  if (!outboundId) return;
  try {
    const res = await api.get(`/items/${CHIAMATE_OUTBOUND_COLLECTION}/${outboundId}`, {
      params: { fields: ['id', 'numeri_associati'] },
    });
    const raw = res?.data?.data?.numeri_associati;
    const list = parseNumeriAssociati(raw);
    const now = Date.now();
    const cutoff = now - NUMERI_ASSOCIATI_CLEANUP_MS;
    const kept = list.filter((item) => {
      const added = item?.added_at ? new Date(item.added_at).getTime() : 0;
      const stillFalse = item?.verificato !== true;
      return !stillFalse || added >= cutoff;
    });
    const toSave = normalizeNumeriAssociatiForSave(kept);
    await api.patch(`/items/${CHIAMATE_OUTBOUND_COLLECTION}/${outboundId}`, {
      numeri_associati: toSave,
    });
  } catch (err) {
    console.error('cleanupNumeriAssociatiNonVerificati:', err);
  }
}

async function sendNumeroWebhook() {
  const num = numeroAssegnaTrimmed.value;
  if (!num || !selectedAzienda.value) return;
  const userId = selectedClienteIdUser.value;
  numeroAssegnaLoading.value = true;
  numeroAssegnaError.value = null;
  numeroAssegnaSuccess.value = false;
  numeroAssegnaCodice.value = null;
  if (numeriAssociatiCleanupTimer) {
    clearTimeout(numeriAssociatiCleanupTimer);
    numeriAssociatiCleanupTimer = null;
  }
  try {
    const params = new URLSearchParams({
      numero: num,
      azienda: selectedAzienda.value,
    });
    const url = `${WEBHOOK_NUMERO}?${params.toString()}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`Webhook risposto ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    let codice = null;
    let agentPhoneNumberId = '';
    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => ({}));
      codice = data?.codice ?? data?.code ?? data?.codice_verifica ?? (typeof data === 'string' ? data : null);
      agentPhoneNumberId = data?.agent_phone_number_id ?? data?.agent_phone_number_id ?? '';
      if (agentPhoneNumberId != null) agentPhoneNumberId = String(agentPhoneNumberId);
    } else {
      const text = await res.text();
      const t = (text || '').trim();
      if (t) codice = t;
    }
    numeroAssegnaCodice.value = codice != null ? String(codice) : null;

    const newEntry = {
      numero: num,
      verificato: false,
      agent_phone_number_id: agentPhoneNumberId || '',
      added_at: new Date().toISOString(),
    };

    const filter = { azienda: { _eq: selectedAzienda.value } };
    if (userId != null) filter.id_user = { _eq: userId };
    const outRes = await api.get(`/items/${CHIAMATE_OUTBOUND_COLLECTION}`, {
      params: { filter, limit: 1, fields: ['id', 'numeri_associati'] },
    });
    const rows = outRes?.data?.data ?? [];
    const outRow = rows[0];
    let list = [];
    if (outRow) {
      outboundRecordId.value = outRow.id;
      list = parseNumeriAssociati(outRow.numeri_associati);
    }
    list.push(newEntry);
    const toSave = normalizeNumeriAssociatiForSave(list);

    if (outRow) {
      await api.patch(`/items/${CHIAMATE_OUTBOUND_COLLECTION}/${outRow.id}`, {
        numeri_associati: toSave,
        agent_phone_number_id: agentPhoneNumberId || outRow.agent_phone_number_id || null,
      });
    } else {
      const orariPayload = buildOrariRichiamatePayload();
      const giorniConSlots = orariPerGiorno.value
        .filter((dg) => Array.isArray(dg.slots) && dg.slots.length > 0)
        .map((dg) => dg.day);
      const payload = {
        azienda: selectedAzienda.value,
        id_user: userId ?? null,
        numeri_associati: toSave,
        agent_phone_number_id: agentPhoneNumberId || null,
        tentativi_richiamate: tentativiRichiamate.value ?? 3,
        orari_richiamate: orariPayload,
        riprova_chiamate: {
          occupato_minuti: riprovaOccupatoMinuti.value ?? 15,
          non_risponde_ore: riprovaNonRispondeOre.value ?? 4,
          segreteria_minuti: riprovaSegreteriaMinuti.value ?? 60,
        },
        giorni_richiamate: giorniConSlots.length ? giorniConSlots : [1, 2, 3, 4, 5],
        richiamate_automatiche: richiamateAutomaticheOutbound.value === true,
      };
      const createRes = await api.post(`/items/${CHIAMATE_OUTBOUND_COLLECTION}`, payload);
      const created = createRes?.data?.data;
      if (created?.id) outboundRecordId.value = created.id;
    }
    selectedAgentPhoneNumberId.value = agentPhoneNumberId || selectedAgentPhoneNumberId.value;

    numeroAssegnaSuccess.value = true;
    numeroAssegna.value = '';
    const recordIdForCleanup = outboundRecordId.value;
    numeriAssociatiCleanupTimer = setTimeout(() => {
      cleanupNumeriAssociatiNonVerificati(recordIdForCleanup);
      numeriAssociatiCleanupTimer = null;
      numeroAssegnaSuccess.value = false;
      numeroAssegnaCodice.value = null;
    }, NUMERI_ASSOCIATI_CLEANUP_MS);
  } catch (err) {
    console.error('sendNumeroWebhook:', err);
    numeroAssegnaError.value = err?.message ?? 'Errore invio numero. Riprova.';
    setTimeout(() => { numeroAssegnaError.value = null; }, 5000);
  } finally {
    numeroAssegnaLoading.value = false;
  }
}

// --- Impostazioni Chiamata: orari per giorno ---
function addOrarioSlot(dayIndex) {
  const dayGroup = orariPerGiorno.value[dayIndex];
  if (!dayGroup || !Array.isArray(dayGroup.slots)) return;
  dayGroup.slots.push({ from: '09:00', to: '18:00' });
  orariPerGiorno.value = [...orariPerGiorno.value];
}
function removeOrarioSlot(dayIndex, slotIndex) {
  const dayGroup = orariPerGiorno.value[dayIndex];
  if (!dayGroup || !Array.isArray(dayGroup.slots)) return;
  dayGroup.slots.splice(slotIndex, 1);
  orariPerGiorno.value = [...orariPerGiorno.value];
}
/** Converte orariPerGiorno in oggetto orari_richiamate per la collection (chiavi "1".."7", valori array di { from, to }) */
function buildOrariRichiamatePayload() {
  const out = {};
  orariPerGiorno.value.forEach((dg) => {
    const key = String(dg.day);
    out[key] = Array.isArray(dg.slots)
      ? dg.slots.map((s) => ({ from: s.from || '09:00', to: s.to || '18:00' }))
      : [];
  });
  return out;
}
/** Parsa orari_richiamate dal DB (oggetto o array legacy) e aggiorna orariPerGiorno */
function parseOrariRichiamateFromRow(orari) {
  if (typeof orari === 'string') {
    try {
      orari = JSON.parse(orari);
    } catch (_) {
      orari = null;
    }
  }
  if (orari && typeof orari === 'object' && !Array.isArray(orari)) {
    orariPerGiorno.value = GIORNI_OPTIONS.map((d) => {
      const key = String(d.value);
      const slotsRaw = orari[key];
      const slots = Array.isArray(slotsRaw)
        ? slotsRaw.map((s) => ({ from: s?.from ?? '09:00', to: s?.to ?? '18:00' }))
        : (d.value <= 5 ? [{ from: '09:00', to: '18:00' }] : []);
      return { day: d.value, label: d.label, slots };
    });
  } else if (Array.isArray(orari) && orari.length > 0) {
    const mapped = orari.map((s) => ({ from: s?.from ?? '09:00', to: s?.to ?? '18:00' }));
    orariPerGiorno.value = GIORNI_OPTIONS.map((d, i) => ({
      day: d.value,
      label: d.label,
      slots: i === 0 ? [...mapped] : [],
    }));
  } else {
    orariPerGiorno.value = getDefaultOrariPerGiorno();
  }
}

// --- Richiamate automatiche (chiamate_outbound.richiamate_automatiche) ---
async function toggleRichiamateAutomaticheOutbound() {
  if (!selectedAzienda.value) return;
  richiamateAutomaticheOutboundLoading.value = true;
  const previousValue = richiamateAutomaticheOutbound.value;
  richiamateAutomaticheOutbound.value = !richiamateAutomaticheOutbound.value;
  try {
    if (outboundRecordId.value) {
      await api.patch(`/items/${CHIAMATE_OUTBOUND_COLLECTION}/${outboundRecordId.value}`, {
        richiamate_automatiche: richiamateAutomaticheOutbound.value,
      });
    } else {
      await saveOutboundSettings();
    }
  } catch (err) {
    console.error('toggleRichiamateAutomaticheOutbound:', err);
    richiamateAutomaticheOutbound.value = previousValue;
    outboundError.value = err?.response?.data?.errors?.[0]?.message ?? err?.message ?? 'Impossibile aggiornare. Riprova.';
    setTimeout(() => { outboundError.value = null; }, 5000);
  } finally {
    richiamateAutomaticheOutboundLoading.value = false;
  }
}

// --- Impostazioni Chiamata: load/save chiamate_outbound ---
async function loadOutboundSettings() {
  if (!selectedAzienda.value) return;
  const userId = selectedClienteIdUser.value;
  outboundLoading.value = true;
  outboundError.value = null;
  try {
    const filter = { azienda: { _eq: selectedAzienda.value } };
    if (userId != null) filter.id_user = { _eq: userId };
    const response = await api.get(`/items/${CHIAMATE_OUTBOUND_COLLECTION}`, {
      params: { filter, limit: 1 },
    });
    const rows = response?.data?.data ?? [];
    const row = rows[0];
    if (row) {
      outboundRecordId.value = row.id;
      selectedAgentPhoneNumberId.value = row.agent_phone_number_id ?? null;
      tentativiRichiamate.value = row.tentativi_richiamate ?? 3;
      richiamateAutomaticheOutbound.value = row.richiamate_automatiche === true || row.richiamate_automatiche === 1;
      parseOrariRichiamateFromRow(row.orari_richiamate);
      let riprova = row.riprova_chiamate;
      if (typeof riprova === 'string') {
        try {
          riprova = JSON.parse(riprova);
        } catch (_) {
          riprova = null;
        }
      }
      if (riprova && typeof riprova === 'object') {
        riprovaOccupatoMinuti.value = riprova.occupato_minuti ?? 15;
        riprovaNonRispondeOre.value = riprova.non_risponde_ore ?? 4;
        riprovaSegreteriaMinuti.value = Math.max(1, Math.min(1440, riprova.segreteria_minuti ?? 60));
      }
    } else {
      outboundRecordId.value = null;
      selectedAgentPhoneNumberId.value = null;
      richiamateAutomaticheOutbound.value = false;
      orariPerGiorno.value = getDefaultOrariPerGiorno();
    }
  } catch (err) {
    console.error('loadOutboundSettings:', err);
    outboundError.value = err?.response?.data?.errors?.[0]?.message ?? err?.message ?? 'Errore caricamento impostazioni.';
    orariPerGiorno.value = getDefaultOrariPerGiorno();
  } finally {
    outboundLoading.value = false;
  }
}

async function saveOutboundSettings() {
  if (!selectedAzienda.value) return;
  const userId = selectedClienteIdUser.value;
  outboundSaving.value = true;
  outboundError.value = null;
  outboundSaveSuccess.value = false;
  try {
    const orariPayload = buildOrariRichiamatePayload();
    const giorniConSlots = orariPerGiorno.value
      .filter((dg) => Array.isArray(dg.slots) && dg.slots.length > 0)
      .map((dg) => dg.day);
    const payload = {
      azienda: selectedAzienda.value,
      id_user: userId ?? null,
      agent_phone_number_id: selectedAgentPhoneNumberId.value ?? null,
      tentativi_richiamate: Math.max(1, Math.min(20, tentativiRichiamate.value)) || 3,
      orari_richiamate: orariPayload,
      riprova_chiamate: {
        occupato_minuti: Math.max(1, Math.min(120, riprovaOccupatoMinuti.value)) || 15,
        non_risponde_ore: Math.max(1, Math.min(72, riprovaNonRispondeOre.value)) || 4,
        segreteria_minuti: Math.max(1, Math.min(1440, riprovaSegreteriaMinuti.value)) || 60,
      },
      giorni_richiamate: giorniConSlots.length ? giorniConSlots : [1, 2, 3, 4, 5],
      richiamate_automatiche: richiamateAutomaticheOutbound.value === true,
    };
    if (outboundRecordId.value) {
      await api.patch(`/items/${CHIAMATE_OUTBOUND_COLLECTION}/${outboundRecordId.value}`, payload);
    } else {
      const res = await api.post(`/items/${CHIAMATE_OUTBOUND_COLLECTION}`, payload);
      const created = res?.data?.data;
      if (created?.id) outboundRecordId.value = created.id;
    }
    outboundSaveSuccess.value = true;
    setTimeout(() => { outboundSaveSuccess.value = false; }, 4000);
  } catch (err) {
    console.error('saveOutboundSettings:', err);
    outboundError.value = err?.response?.data?.errors?.[0]?.message ?? err?.message ?? 'Errore salvataggio. Riprova.';
    setTimeout(() => { outboundError.value = null; }, 6000);
  } finally {
    outboundSaving.value = false;
  }
}

// --- Numeri verificati (numeri_associati da chiamate_outbound, verificato === true) ---
async function loadNumeriVerificati() {
  if (!selectedAzienda.value) {
    numeriVerificati.value = [];
    return;
  }
  const userId = selectedClienteIdUser.value;
  numeriVerificatiLoading.value = true;
  try {
    const filter = { azienda: { _eq: selectedAzienda.value } };
    if (userId != null) filter.id_user = { _eq: userId };
    const res = await api.get(`/items/${CHIAMATE_OUTBOUND_COLLECTION}`, {
      params: { filter, limit: 1, fields: ['numeri_associati'] },
    });
    const rows = res?.data?.data ?? [];
    const raw = rows[0]?.numeri_associati;
    const list = parseNumeriAssociati(raw);
    numeriVerificati.value = list.filter((item) => item?.verificato === true);
  } catch (err) {
    console.error('loadNumeriVerificati:', err);
    numeriVerificati.value = [];
  } finally {
    numeriVerificatiLoading.value = false;
  }
}

async function selectNumeroVerificato(item) {
  const agentId = item?.agent_phone_number_id;
  if (agentId == null || agentId === '') return;
  if (!selectedAzienda.value) return;
  const userId = selectedClienteIdUser.value;
  numeriVerificatiSelecting.value = true;
  try {
    if (outboundRecordId.value) {
      await api.patch(`/items/${CHIAMATE_OUTBOUND_COLLECTION}/${outboundRecordId.value}`, {
        agent_phone_number_id: String(agentId),
      });
    } else {
      const orariPayload = buildOrariRichiamatePayload();
      const giorniConSlots = orariPerGiorno.value
        .filter((dg) => Array.isArray(dg.slots) && dg.slots.length > 0)
        .map((dg) => dg.day);
      const payload = {
        azienda: selectedAzienda.value,
        id_user: userId ?? null,
        agent_phone_number_id: String(agentId),
        tentativi_richiamate: tentativiRichiamate.value ?? 3,
        orari_richiamate: orariPayload,
        riprova_chiamate: {
          occupato_minuti: riprovaOccupatoMinuti.value ?? 15,
          non_risponde_ore: riprovaNonRispondeOre.value ?? 4,
          segreteria_minuti: riprovaSegreteriaMinuti.value ?? 60,
        },
        giorni_richiamate: giorniConSlots.length ? giorniConSlots : [1, 2, 3, 4, 5],
        richiamate_automatiche: richiamateAutomaticheOutbound.value === true,
      };
      const res = await api.post(`/items/${CHIAMATE_OUTBOUND_COLLECTION}`, payload);
      const created = res?.data?.data;
      if (created?.id) outboundRecordId.value = created.id;
    }
    selectedAgentPhoneNumberId.value = String(agentId);
  } catch (err) {
    console.error('selectNumeroVerificato:', err);
    outboundError.value = err?.response?.data?.errors?.[0]?.message ?? err?.message ?? 'Errore selezione numero. Riprova.';
    setTimeout(() => { outboundError.value = null; }, 5000);
  } finally {
    numeriVerificatiSelecting.value = false;
  }
}

function formatNumeroDisplay(num) {
  if (!num || typeof num !== 'string') return '—';
  const cleaned = num.replace(/\D/g, '');
  if (cleaned.length < 6) return num;
  if (cleaned.length === 10 && (cleaned.startsWith('3') || cleaned.startsWith('0'))) {
    return cleaned.replace(/(\d{3,4})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  if (cleaned.length >= 9) {
    return cleaned.replace(/(\d{2,4})(\d{3})(\d{3,4})/, '$1 $2 $3');
  }
  return num;
}

// Carica impostazioni e numeri verificati quando si entra nella sezione Impostazioni Chiamata con azienda selezionata
watch(
  () => activeSection.value === 'assegna-numero' && selectedAzienda.value,
  async (shouldLoad) => {
    if (shouldLoad) {
      await loadOutboundSettings();
      loadNumeriVerificati();
    }
  },
  { immediate: true }
);

async function importLeadsToWebhook() {
  if (!selectedAzienda.value) {
    importError.value = 'Seleziona un\'azienda prima di importare i leads.';
    setTimeout(() => { importError.value = null; }, 4000);
    return;
  }

  importing.value = true;
  importError.value = null;
  importSuccess.value = false;

  try {
    const response = await api.get(`/items/${CLIENTI_COLLECTION}`, {
      params: {
        filter: { azienda: { _eq: selectedAzienda.value } },
        limit: 1,
      },
    });

    const rows = response?.data?.data ?? [];
    const record = rows[0];

    if (!record) {
      importError.value = 'Nessuna riga cliente trovata per l\'azienda selezionata.';
      return;
    }

    // Disattiva chiamate automatiche prima di inviare il webhook
    const clienteId = record.id ?? selectedClienteId.value;
    if (clienteId && chiamateAutomatiche.value) {
      await api.patch(`/items/${CLIENTI_COLLECTION}/${clienteId}`, { chiamate_automatiche: false });
      chiamateAutomatiche.value = false;
    }

    const webhookResponse = await fetch(WEBHOOK_IMPORT_LEADS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Il server ha risposto con un errore (${webhookResponse.status}). Riprova più tardi.`);
    }

    importSuccess.value = true;
    setTimeout(() => { importSuccess.value = false; }, 4000);
  } catch (err) {
    console.error('Error during import:', err);
    const message = err?.message ?? err?.response?.data?.errors?.[0]?.message ?? 'Errore sconosciuto';
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      importError.value = 'Impossibile completare l\'operazione. Verifica la connessione e riprova.';
    } else {
      importError.value = message;
    }
    setTimeout(() => { importError.value = null; }, 6000);
  } finally {
    importing.value = false;
  }
}

async function callChiamaWebhook() {
  const ids = selectedLeadIds.value;
  if (ids.length === 0) {
    callError.value = 'Seleziona almeno un lead dalla tabella.';
    setTimeout(() => { callError.value = null; }, 4000);
    return;
  }

  const selectedLeads = leads.value.filter(l => ids.includes(l.id));
  if (selectedLeads.length === 0) {
    callError.value = 'Nessun lead selezionato trovato.';
    setTimeout(() => { callError.value = null; }, 4000);
    return;
  }

  calling.value = true;
  callError.value = null;
  callSuccess.value = false;

  try {
    let cliente = null;
    let chiamateOutbound = null;
    if (selectedAzienda.value) {
      const clientiRes = await api.get(`/items/${CLIENTI_COLLECTION}`, {
        params: {
          filter: { azienda: { _eq: selectedAzienda.value } },
          limit: 1,
        },
      });
      const rows = clientiRes?.data?.data ?? [];
      if (rows.length > 0) cliente = rows[0];

      const outboundFilter = { azienda: { _eq: selectedAzienda.value } };
      if (selectedClienteIdUser.value != null) outboundFilter.id_user = { _eq: selectedClienteIdUser.value };
      const outboundRes = await api.get(`/items/${CHIAMATE_OUTBOUND_COLLECTION}`, {
        params: { filter: outboundFilter, limit: 1 },
      });
      const outboundRows = outboundRes?.data?.data ?? [];
      if (outboundRows.length > 0) chiamateOutbound = outboundRows[0];
    }

    const payload = { leads: selectedLeads, cliente, chiamate_outbound: chiamateOutbound };
    const response = await fetch(WEBHOOK_CHIAMA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Il server ha risposto con un errore (${response.status}). Riprova più tardi.`);
    }

    callSuccess.value = true;
    setTimeout(() => { callSuccess.value = false; }, 4000);
  } catch (err) {
    console.error('Error calling Chiama webhook:', err);
    const message = err?.message ?? 'Errore sconosciuto';
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      callError.value = 'Impossibile completare l\'operazione. Verifica la connessione e riprova.';
    } else {
      callError.value = message;
    }
    setTimeout(() => { callError.value = null; }, 6000);
  } finally {
    calling.value = false;
  }
}

// Refresh elenco lead quando cambiano i dati (WebSocket su create/update leads)
let wsLeads = null;
const LEADS_SUB_UID = 'chiamate-outbound-leads';

function connectLeadsRealtime() {
  if (typeof window === 'undefined') return;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/websocket`;
  try {
    wsLeads = new WebSocket(wsUrl);
    wsLeads.onopen = () => {
      wsLeads.send(JSON.stringify({
        type: 'subscribe',
        collection: LEADS_COLLECTION,
        uid: LEADS_SUB_UID,
      }));
    };
    wsLeads.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ping') {
          if (wsLeads && wsLeads.readyState === 1) {
            wsLeads.send(JSON.stringify({ type: 'pong' }));
          }
          return;
        }
        if (msg.type === 'subscription' && msg.uid === LEADS_SUB_UID && (msg.event === 'create' || msg.event === 'update' || msg.event === 'delete')) {
          if (activeSection.value === 'leads') loadLeads();
        }
      } catch (_) {}
    };
    wsLeads.onerror = () => {};
    wsLeads.onclose = () => {
      wsLeads = null;
    };
  } catch (_) {
    wsLeads = null;
  }
}

function disconnectLeadsRealtime() {
  if (wsLeads && wsLeads.readyState === 1) {
    try {
      wsLeads.send(JSON.stringify({ type: 'unsubscribe', uid: LEADS_SUB_UID }));
      wsLeads.close();
    } catch (_) {}
    wsLeads = null;
  }
}

onMounted(async () => {
  await loadAziende();
  loadLeads();
  loadGoogleFoglioUrl();
  connectLeadsRealtime();
});

onUnmounted(() => {
  disconnectLeadsRealtime();
  if (numeriAssociatiCleanupTimer) {
    clearTimeout(numeriAssociatiCleanupTimer);
    numeriAssociatiCleanupTimer = null;
  }
});
</script>

<style scoped>
.outbound-container {
  padding: 40px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Sezione Impostazioni Chiamata */
.impostazioni-chiamata-section {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.impostazioni-chiamata-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.impostazioni-chiamata-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--foreground, #0f172a);
  letter-spacing: -0.03em;
}

.impostazioni-azienda-btn {
  flex-shrink: 0;
}

.impostazioni-azienda-btn :deep(.v-button) {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  min-height: 38px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 12px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  transition: all 0.2s ease;
}

.impostazioni-azienda-btn :deep(.v-button .v-icon) {
  width: 18px !important;
  height: 18px !important;
}

.impostazioni-azienda-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.impostazioni-placeholder {
  text-align: center;
  padding: 64px 24px;
  background: var(--background-subdued, #f8fafc);
  border: 1px dashed var(--border-normal, #e2e8f0);
  border-radius: 16px;
}

.impostazioni-placeholder-icon {
  width: 48px;
  height: 48px;
  color: var(--foreground-subdued, #64748b);
  margin-bottom: 16px;
}

.impostazioni-placeholder-text {
  margin: 0;
  font-size: 15px;
  color: var(--foreground-subdued, #64748b);
  line-height: 1.5;
}

.impostazioni-card {
  background: var(--background-page, #fff);
  border: 1px solid var(--border-normal, #e2e8f0);
  border-radius: 16px;
  padding: 28px 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.impostazioni-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--foreground, #0f172a);
}

.impostazioni-card-title .v-icon {
  color: var(--foreground-subdued, #64748b);
}

.impostazioni-card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.impostazioni-card-title-row .impostazioni-card-title {
  margin-bottom: 0;
}

.impostazioni-numeri-refresh {
  flex-shrink: 0;
}

.impostazioni-richiamate-auto-btn {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
}

.impostazioni-richiamate-auto-btn :deep(.v-button) {
  padding: 4px 8px;
  min-height: 26px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.impostazioni-richiamate-auto-btn :deep(.v-button .v-icon) {
  width: 14px !important;
  height: 14px !important;
}

.impostazioni-richiamate-auto-label {
  white-space: nowrap;
}

.impostazioni-card-desc {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: var(--foreground-subdued, #64748b);
  line-height: 1.5;
}

/* Stile Deviazione Chiamate: form-field, input con prefisso +39 */
.numero-section-deviazione .form-field {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.numero-section-deviazione .form-field-small {
  width: 100%;
  max-width: 600px;
}

.numero-section-deviazione .field-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  letter-spacing: -0.01em;
}

.numero-section-deviazione .field-label :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  opacity: 0.8;
}

.numero-section-deviazione .input-with-prefix-wrap {
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex-wrap: wrap;
}

.numero-section-deviazione .input-with-prefix {
  flex: 1;
  min-width: 200px;
  display: inline-flex;
  align-items: center;
  gap: 0;
  border: 1px solid var(--border-normal, #e8e8e8);
  border-radius: 6px;
  background: var(--background-page, #ffffff);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
}

.numero-section-deviazione .input-prefix {
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--foreground-subdued, #6b7280);
  letter-spacing: 0.2px;
  white-space: nowrap;
  border: none;
  border-right: 1px solid var(--border-normal, #e5e7eb);
  min-height: 42px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  flex-shrink: 0;
}

.numero-section-deviazione .input-with-prefix-input {
  flex: 1;
  min-width: 0;
}

.numero-section-deviazione .input-with-prefix-input :deep(.v-input) {
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  width: 100%;
}

.numero-section-deviazione .input-with-prefix-input :deep(.v-input__control) {
  padding-left: 12px;
  padding-right: 16px;
}

.numero-section-deviazione .input-with-prefix:hover {
  border-color: var(--border-normal, #d1d5db);
}

.numero-section-deviazione .input-with-prefix:hover .input-prefix {
  color: var(--foreground, #1a1a1a);
}

.numero-section-deviazione .input-with-prefix:focus-within {
  border-color: var(--primary, #6c5ce7);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
}

.numero-section-deviazione .input-with-prefix:focus-within .input-prefix {
  color: var(--foreground, #1a1a1a);
}

.numero-section-deviazione .field-error-state.input-with-prefix {
  background: #fef2f2;
  border-color: var(--danger, #e54848) !important;
}

.numero-section-deviazione .field-error-state.input-with-prefix .input-prefix {
  color: var(--danger, #e54848);
  border-right-color: rgba(229, 72, 72, 0.3);
  background: #fef2f2;
}

.numero-section-deviazione .field-help {
  font-size: 12px;
  color: var(--foreground-subdued, #6b7280);
  line-height: 1.6;
  margin-top: 0;
  letter-spacing: -0.01em;
}

.numero-section-deviazione .numero-invia-btn {
  flex-shrink: 0;
  align-self: stretch;
  min-height: 44px;
}

.impostazioni-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
}

.impostazioni-notice--success {
  background: rgba(34, 197, 94, 0.1);
  color: #15803d;
}

.impostazioni-notice--error {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
}

.impostazioni-codice-label {
  margin-left: 6px;
}

.impostazioni-codice-value {
  margin-left: 6px;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.05em;
}

/* Box "Riceverai una chiamata" – visibile 5 minuti */
.impostazioni-call-box {
  margin-top: 20px;
  padding: 24px 28px;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #86efac;
  border-radius: 14px;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.12);
}

.impostazioni-call-box-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.impostazioni-call-box-icon {
  width: 28px;
  height: 28px;
  color: #15803d;
  flex-shrink: 0;
}

.impostazioni-call-box-title {
  font-size: 18px;
  font-weight: 700;
  color: #166534;
  letter-spacing: -0.02em;
}

.impostazioni-call-box-desc {
  margin: 0 0 20px 0;
  font-size: 15px;
  line-height: 1.55;
  color: #166534;
}

.impostazioni-call-box-desc strong {
  color: #14532d;
}

.impostazioni-call-box-code-wrap {
  margin: 20px 0;
  padding: 20px 24px;
  background: #fff;
  border: 2px dashed #22c55e;
  border-radius: 12px;
  text-align: center;
}

.impostazioni-call-box-code-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #15803d;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.impostazioni-call-box-code {
  display: block;
  font-size: 28px;
  font-weight: 700;
  font-family: ui-monospace, 'SF Mono', Monaco, monospace;
  letter-spacing: 0.2em;
  color: #0f172a;
  user-select: all;
}

.impostazioni-call-box-hint {
  margin: 0;
  font-size: 13px;
  color: #15803d;
  opacity: 0.9;
}

.impostazioni-notice-inline {
  margin-top: 12px;
}

.impostazioni-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: var(--foreground-subdued, #64748b);
  font-size: 14px;
}

.impostazioni-loading--small {
  padding: 20px;
}

.impostazioni-empty-hint {
  margin: 0;
  font-size: 14px;
  color: var(--foreground-subdued, #64748b);
  line-height: 1.5;
}

.impostazioni-numeri-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.impostazioni-numero-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 500;
  text-align: left;
  background: var(--background-subdued, #f8fafc);
  border: 1px solid var(--border-normal, #e2e8f0);
  border-radius: 10px;
  color: var(--foreground, #0f172a);
  cursor: pointer;
  transition: all 0.2s ease;
}

.impostazioni-numero-item:hover:not(:disabled) {
  background: var(--background-page, #fff);
  border-color: var(--primary, #6644aa);
  box-shadow: 0 2px 8px rgba(102, 68, 170, 0.15);
}

.impostazioni-numero-item:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.impostazioni-numero-item--selected {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-color: #22c55e;
  color: #166534;
}

.impostazioni-numero-item--selected:hover:not(:disabled) {
  background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%);
  border-color: #16a34a;
}

.impostazioni-numero-item-numero {
  font-family: ui-monospace, monospace;
  letter-spacing: 0.03em;
}

.impostazioni-numero-item-check {
  width: 22px;
  height: 22px;
  color: #16a34a;
  flex-shrink: 0;
}

.impostazioni-field {
  margin-bottom: 22px;
}

.impostazioni-field--block {
  margin-bottom: 24px;
}

.impostazioni-label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground, #0f172a);
}

.impostazioni-hint {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--foreground-subdued, #64748b);
}

.impostazioni-input {
  display: block;
  width: 100%;
  max-width: 120px;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border-normal, #e2e8f0);
  border-radius: 8px;
  background: var(--background-input, #fff);
  color: var(--foreground, #0f172a);
}

.impostazioni-input--number {
  max-width: 80px;
}

.impostazioni-input--small {
  max-width: 72px;
  padding: 8px 10px;
}

/* Orari richiamate per giorno – stile tabella compatta, stessa palette */
.orari-schedule {
  border: 1px solid var(--border-normal, #e2e8f0);
  border-radius: 8px;
  background: var(--background-page, #fff);
  overflow: hidden;
}

.orari-schedule-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-normal, #e2e8f0);
  min-height: 44px;
}

.orari-schedule-row:last-child {
  border-bottom: none;
}

.orari-schedule-row:nth-child(even) {
  background: var(--background-subdued, #f8fafc);
}

.orari-schedule-day {
  flex-shrink: 0;
  min-width: 44px;
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground, #0f172a);
  line-height: 32px;
}

.orari-schedule-slots {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.orari-slot {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--background-subdued, #f8fafc);
  border: 1px solid var(--border-normal, #e2e8f0);
  border-radius: 6px;
}

.orari-time {
  padding: 4px 6px;
  font-size: 12px;
  border: 1px solid var(--border-normal, #e2e8f0);
  border-radius: 4px;
  background: var(--background-input, #fff);
  color: var(--foreground, #0f172a);
}

.orari-slot-sep {
  font-size: 11px;
  color: var(--foreground-subdued, #64748b);
}

.orari-slot-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--foreground-subdued, #64748b);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.orari-slot-remove:hover {
  color: var(--danger, #dc2626);
  background: rgba(220, 38, 38, 0.08);
}

.orari-slot-remove .v-icon {
  width: 14px !important;
  height: 14px !important;
}

.orari-add-slot {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--foreground-subdued, #64748b);
  background: transparent;
  border: 1px dashed var(--border-normal, #e2e8f0);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.orari-add-slot:hover {
  border-color: var(--primary, #6366f1);
  color: var(--primary, #6366f1);
  background: rgba(99, 102, 241, 0.04);
}

.orari-add-slot .v-icon {
  width: 14px !important;
  height: 14px !important;
}

.impostazioni-retry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
  margin-top: 12px;
}

.impostazioni-retry-item {
  padding: 14px 16px;
  background: var(--background-subdued, #f8fafc);
  border: 1px solid var(--border-normal, #e2e8f0);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.impostazioni-retry-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground, #0f172a);
}

.impostazioni-retry-desc {
  font-size: 12px;
  color: var(--foreground-subdued, #64748b);
}

.impostazioni-retry-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.impostazioni-retry-input-wrap span {
  font-size: 13px;
  color: var(--foreground-subdued, #64748b);
}

.impostazioni-retry-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground, #0f172a);
  margin-top: 4px;
}

.impostazioni-giorni {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-top: 8px;
}

.impostazioni-giorni-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--foreground, #0f172a);
}

.impostazioni-checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--primary, #6644aa);
}

.impostazioni-actions {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border-normal, #e2e8f0);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.impostazioni-save-btn {
  flex-shrink: 0;
}

.wip-badge-icon {
  width: 18px;
  height: 18px;
  opacity: 0.9;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-normal, #e8e8e8);
  flex-wrap: wrap;
}

.page-header-left {
  flex: 1;
  min-width: 0;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--foreground, #1a1a1a);
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 14px;
  color: var(--foreground-subdued, #6b7280);
  margin: 0;
  line-height: 1.5;
  letter-spacing: -0.01em;
}

/* Pulsante Seleziona Azienda - come Deviazione Chiamate */
.azienda-select-button {
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
}

.azienda-select-button :deep(.v-button) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  min-height: 38px;
  box-sizing: border-box;
  border-radius: 8px;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: -0.01em;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
}

.azienda-select-button :deep(.v-button:hover) {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
  border-color: var(--border-color, #d1d5db);
}

.azienda-select-button :deep(.v-button .v-icon) {
  flex-shrink: 0;
  width: 18px !important;
  height: 18px !important;
  min-width: 18px;
  min-height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.azienda-button-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  font-size: 12px;
  line-height: 1.4;
}

/* Pulsante Importa leads in header - grafica uniforme al pulsante azienda */
.header-action-button {
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-action-button :deep(.v-button) {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  min-height: 44px;
  box-sizing: border-box;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: -0.01em;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-action-button :deep(.v-button:hover:not(:disabled)) {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
  border-color: var(--border-color, #d1d5db);
}

.header-action-button :deep(.v-button .v-icon) {
  flex-shrink: 0;
  width: 20px !important;
  height: 20px !important;
  min-width: 20px;
  min-height: 20px;
}

.header-action-button-text {
  font-size: 13px;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.google-foglio-button {
  flex-shrink: 0;
}

.refresh-button {
  flex-shrink: 0;
}

/* Intestazione azienda selezionata */
/* Drawer Aziende - come Deviazione Chiamate */
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid var(--border-normal, #e8e8e8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.drawer-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  flex: 1;
}

.drawer-header-title :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  opacity: 0.8;
}

.drawer-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--foreground-subdued, #6b7280);
}

.drawer-loading span {
  font-size: 14px;
}

.aziende-list {
  flex: 1;
  overflow-y: auto;
}

.azienda-item {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  margin-bottom: 4px;
}

.azienda-item:hover {
  background: var(--background-subdued, #f9fafb);
}

.azienda-item--active {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-normal, #e8e8e8);
}

.azienda-item--active :deep(.v-list-item-content) {
  color: var(--foreground, #1a1a1a);
  font-weight: 600;
}

.azienda-item--active :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
  opacity: 0.9;
}

.selected-azienda-info {
  margin-top: auto;
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid var(--border-normal, #e8e8e8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.selected-azienda-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground-subdued, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.selected-azienda-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
}

.selected-azienda-name :deep(.v-icon) {
  color: var(--foreground, #1a1a1a);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 64px 24px;
  color: var(--foreground-subdued, #666);
}

.leads-section {
  background: var(--background-page, #ffffff);
  border-radius: 12px;
  border: 1px solid var(--border-normal, #e2e8f0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding: 18px 24px;
  background: var(--background-subdued, #f8fafc);
  border-bottom: 1px solid var(--border-normal, #e2e8f0);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground, #0f172a);
  letter-spacing: -0.02em;
}

.section-title :deep(.v-icon) {
  color: var(--foreground-subdued, #64748b);
  opacity: 0.9;
}

.section-toolbar {
  flex-shrink: 0;
}

.search-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: 340px;
  height: 38px;
  padding: 0 12px 0 12px;
  background: var(--background-page, #fff);
  border: 1px solid var(--border-normal, #e2e8f0);
  border-radius: 8px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-bar-wrapper:focus-within {
  border-color: var(--primary, #6366f1);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.search-bar-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: var(--foreground-subdued, #64748b);
}

.search-bar-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--foreground, #1e293b);
  letter-spacing: -0.01em;
  outline: none;
}

.search-bar-input::placeholder {
  color: var(--foreground-subdued, #94a3b8);
}

.search-bar-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--foreground-subdued, #6b7280);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.search-bar-clear:hover {
  color: var(--foreground, #1a1a1a);
  background: var(--background-subdued, #f3f4f6);
}

.search-bar-clear :deep(.v-icon) {
  width: 16px;
  height: 16px;
}

.table-wrapper {
  overflow-x: auto;
}

.leads-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.leads-table thead {
  background: var(--background-subdued, #f8fafc);
  border-bottom: 2px solid var(--border-normal, #e2e8f0);
}

.leads-table th {
  text-align: left;
  padding: 14px 16px;
  font-weight: 600;
  color: var(--foreground-subdued, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 11px;
  border-bottom: none;
  vertical-align: middle;
}

.leads-table th.th-sortable {
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease, background 0.2s ease;
}

.leads-table th.th-sortable:hover {
  color: var(--foreground, #0f172a);
  background: var(--background-subdued, #f1f5f9);
}

.leads-table th.th-sorted {
  color: var(--foreground, #0f172a);
}

.th-sortable-inner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  vertical-align: middle;
}

.th-sortable-text {
  white-space: nowrap;
}

.th-sort-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  opacity: 0.9;
}

.th-sort-icon--muted {
  opacity: 0.45;
}

.leads-table th.th-sorted .th-sort-icon {
  opacity: 1;
}

.leads-empty-search {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--foreground-subdued, #6b7280);
  font-size: 14px;
  font-weight: 500;
}

.leads-empty-search :deep(.v-icon) {
  width: 24px;
  height: 24px;
  opacity: 0.8;
}

.leads-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-normal, #e2e8f0);
  color: var(--foreground, #1e293b);
  vertical-align: middle;
  font-size: 14px;
  line-height: 1.45;
}

.lead-row {
  transition: background 0.15s ease;
}

.lead-row:hover {
  background: var(--background-subdued, #f8fafc);
}

.lead-row:last-child td {
  border-bottom: none;
}

.lead-row--selected {
  background: rgba(99, 102, 241, 0.08);
}

.lead-row--selected:hover {
  background: rgba(99, 102, 241, 0.12);
}

/* Colonna checkbox */
.th-checkbox,
.td-checkbox {
  width: 52px;
  min-width: 52px;
  max-width: 52px;
  padding: 14px 16px !important;
  text-align: center;
  vertical-align: middle;
  box-sizing: border-box;
}

.th-checkbox-label,
.td-checkbox-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.th-checkbox-input,
.td-checkbox-input {
  width: 18px;
  height: 18px;
  margin: 0;
  cursor: pointer;
  accent-color: var(--primary, #6366f1);
}

.th-nome,
.td-nome { min-width: 120px; }
.th-cognome,
.td-cognome { min-width: 120px; }
.th-numero,
.td-numero { min-width: 140px; }
.th-chiamato,
.td-chiamato { min-width: 128px; }

.th-esito-chiamata,
.td-esito-chiamata { min-width: 140px; }

.numero-value {
  font-family: 'SF Mono', Monaco, 'Roboto Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: var(--foreground, #1e293b);
  letter-spacing: 0.02em;
}

/* Badge Chiamato - pulsante verde quando chiamato */
.chiamato-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.chiamato-badge--yes {
  background: linear-gradient(135deg, var(--success-background, #d1fae5) 0%, rgba(16, 185, 129, 0.15) 100%);
  color: var(--success, #059669);
  border: 1px solid rgba(16, 185, 129, 0.35);
  box-shadow: 0 1px 3px rgba(16, 185, 129, 0.12);
}

.chiamato-badge--yes:hover {
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
}

.chiamato-badge--no {
  background: var(--background-subdued, #f3f4f6);
  color: var(--foreground-subdued, #6b7280);
  border: 1px solid var(--border-normal, #e5e7eb);
}

.chiamato-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.chiamato-badge--yes .chiamato-icon {
  color: var(--success, #059669);
}

.chiamato-icon--pending {
  color: var(--foreground-subdued, #9ca3af);
}

.chiamato-label {
  white-space: nowrap;
}

/* Pulsante Chiama - FAB in basso a destra */
.chiama-fab-wrapper {
  position: fixed;
  bottom: 28px;
  right: 72px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  z-index: 100;
  pointer-events: none;
}

.chiama-fab-wrapper .chiama-fab,
.chiama-fab-wrapper .chiama-notice {
  pointer-events: auto;
}

.chiama-fab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  padding: 12px 20px;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: -0.01em;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-normal, #e5e7eb);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
}

.chiama-fab:not(.chiama-fab--disabled):hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.chiama-fab.chiama-fab--disabled {
  opacity: 0.65;
}

.chiama-fab-label {
  margin-left: 0;
}

.chiama-fab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 700;
  background: var(--primary, #6644ff);
  color: #fff;
}

.chiama-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  max-width: 320px;
}

.chiama-notice--success {
  background: var(--success-background, #d1fae5);
  color: var(--success, #059669);
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.chiama-notice--success :deep(.v-icon) {
  color: var(--success, #059669);
  flex-shrink: 0;
}

.chiama-notice--error {
  background: var(--danger-background, #fee2e2);
  color: var(--danger, #dc2626);
  border: 1px solid rgba(220, 38, 38, 0.35);
}

.chiama-notice--error :deep(.v-icon) {
  color: var(--danger, #dc2626);
  flex-shrink: 0;
}

/* Notifiche importazione (inline sotto header) */
.import-notice-inline {
  margin-bottom: 20px;
}

.import-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.01em;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  max-width: 420px;
}

.import-notice--success {
  background: var(--success-background, #d1fae5);
  color: var(--success, #059669);
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.import-notice--success :deep(.v-icon) {
  color: var(--success, #059669);
  flex-shrink: 0;
}

.import-notice--error {
  background: var(--danger-background, #fee2e2);
  color: var(--danger, #dc2626);
  border: 1px solid rgba(220, 38, 38, 0.35);
}

.import-notice--error :deep(.v-icon) {
  color: var(--danger, #dc2626);
  flex-shrink: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Navigation - stile Deviazione Chiamate */
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

@media (max-width: 768px) {
  .outbound-container {
    padding: 20px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-bottom: 24px;
  }

  .page-title {
    font-size: 20px;
  }

  .section-header {
    padding: 16px 20px;
    flex-direction: column;
    align-items: stretch;
  }

  .section-toolbar {
    width: 100%;
  }

  .search-bar-wrapper {
    max-width: none;
    min-width: 0;
  }

  .leads-table th,
  .leads-table td {
    padding: 12px 16px;
    font-size: 13px;
  }

  .th-nome, .td-nome,
  .th-cognome, .td-cognome {
    min-width: 100px;
  }

  .th-numero, .td-numero {
    min-width: 120px;
  }

  .chiamato-badge {
    padding: 5px 10px;
    font-size: 12px;
  }

  .header-action-button :deep(.v-button) {
    padding: 10px 14px;
    min-height: 40px;
  }

  .header-action-button-text {
    font-size: 12px;
  }

  .chiama-fab-wrapper {
    bottom: 20px;
    right: 48px;
  }

  .chiama-fab {
    padding: 11px 16px;
    font-size: 13px;
  }

  .th-checkbox,
  .td-checkbox {
    width: 48px;
    min-width: 48px;
    max-width: 48px;
    padding: 12px 10px !important;
  }

  .th-nome, .td-nome,
  .th-cognome, .td-cognome {
    min-width: 90px;
  }

  .impostazioni-chiamata-section {
    padding: 24px 16px;
  }
}
</style>
