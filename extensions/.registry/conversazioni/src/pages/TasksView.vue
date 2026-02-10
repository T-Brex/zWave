<template>
  <private-view>
    <template #title>
      <div class="module-header">
        <div class="module-icon-wrapper">
          <v-icon name="checklist" class="module-icon" />
        </div>
        <div class="module-title-content">
          <span class="module-subtitle">Contenuti</span>
          <h1 class="module-title">Task</h1>
        </div>
      </div>
    </template>

    <template #navigation>
      <v-list nav>
        <v-list-item
          :class="['nav-item', { 'nav-item--active': isListRoute }]"
          :active="isListRoute"
          :to="basePath"
        >
          <v-list-item-icon>
            <v-icon name="chat" />
          </v-list-item-icon>
          <v-list-item-content>
            Conversazioni
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          :class="['nav-item', { 'nav-item--active': isTableRoute }]"
          :active="isTableRoute"
          :to="`${basePath}/tabella`"
        >
          <v-list-item-icon>
            <v-icon name="table" />
          </v-list-item-icon>
          <v-list-item-content>
            Tabella
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          :class="['nav-item', { 'nav-item--active': isTaskRoute }]"
          :active="isTaskRoute"
          :to="`${basePath}/task`"
        >
          <v-list-item-icon>
            <v-icon name="checklist" />
          </v-list-item-icon>
          <v-list-item-content>
            Task
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </template>

    <AziendeDrawer
      v-model="drawerOpen"
      :available-aziende="availableAziende"
      :selected-azienda="selectedAzienda"
      :loading="loadingAziende"
      :error="aziendeError"
      @select="handleSelectAzienda"
      @refresh="loadAziende"
    />

    <div class="tasks-dashboard">
      <v-info
        v-if="tasksError"
        type="danger"
        icon="error"
        :title="tasksError"
      >
        <template #append>
          <v-button @click="retry" secondary>
            Riprova
          </v-button>
        </template>
      </v-info>

      <div v-else class="tasks-content">
        <div class="tasks-topbar">
          <v-button
            class="azienda-select-button"
            :secondary="!!selectedAzienda"
            :type="selectedAzienda ? 'secondary' : 'primary'"
            @click="drawerOpen = true"
          >
            <v-icon name="business" left />
            <span class="azienda-button-text">
              {{ selectedAzienda || 'Seleziona azienda' }}
            </span>
            <v-icon name="arrow_drop_down" right />
          </v-button>
          <div class="view-toggle">
            <button
              :class="['view-button', { active: viewMode === 'table' }]"
              type="button"
              title="Tabella"
              @click="viewMode = 'table'"
            >
              <v-icon name="table_rows" />
            </button>
            <button
              :class="['view-button', { active: viewMode === 'kanban' }]"
              type="button"
              title="Kanban"
              @click="viewMode = 'kanban'"
            >
              <v-icon name="view_kanban" />
            </button>
          </div>
          <button class="task-add-button" type="button" title="Nuova task" @click="openTaskDialog">
            <v-icon name="add" />
          </button>
        </div>

        <div class="tasks-toolbar">
          <div class="tasks-search-group">
            <div class="tasks-search">
              <v-icon name="search" />
              <input v-model="searchInput" placeholder="Cerca…" />
            </div>
            <div ref="filterMenuRef" class="filters-button-wrapper">
              <button
                class="filters-button"
                type="button"
                aria-label="Filtri"
                title="Filtri"
                @click.stop="toggleFilterMenu"
              >
                <v-icon name="filter_list" />
              </button>
              <span v-if="activeFiltersCount > 0" class="filters-badge">
                Filtri: {{ activeFiltersCount }}
              </span>
              <transition name="filters-pop">
                <div v-if="filterMenuOpen" class="filters-popover" @click.stop>
                  <div class="filters-popover-header">
                    <span>Filtri</span>
                  </div>
                <div class="filter-row">
                  <label class="filter-label">Azione</label>
                  <select v-model="filterAction" class="filter-select">
                    <option value="all">Tutte</option>
                    <option value="richiamare">Richiamare</option>
                    <option value="visita">Visita</option>
                    <option value="appuntamento">Appuntamento</option>
                  </select>
                </div>
                  <div class="filter-row">
                    <label class="filter-label">Completate</label>
                    <select v-model="filterStatus" class="filter-select">
                      <option value="all">Tutte</option>
                      <option value="open">Da fare</option>
                      <option value="done">Completate</option>
                    </select>
                  </div>
                <div class="filter-row">
                  <label class="filter-label">Nome</label>
                  <input v-model="filterName" class="filter-input" type="text" placeholder="Cerca nome" />
                </div>
                <div class="filter-row">
                  <label class="filter-label">Telefono</label>
                  <input v-model="filterPhone" class="filter-input" type="text" placeholder="Cerca telefono" />
                </div>
                  <div class="filter-row">
                    <label class="filter-label">Data visita</label>
                    <div class="filter-date-range">
                      <div class="filter-date-single">
                        <input
                          :value="filterDateFromDisplay"
                          class="filter-input filter-date-input"
                          type="text"
                          placeholder="Da (gg/MM/aaaa)"
                          @input="updateFilterDateText($event.target.value, 'from')"
                        />
                        <input
                          ref="filterDateFromRef"
                          :value="filterDateFrom"
                          class="filter-date-hidden"
                          type="date"
                          @input="updateFilterDatePicker($event.target.value, 'from')"
                        />
                        <button class="filter-date-button" type="button" @click="openFilterDatePicker('from')">
                          <v-icon name="calendar_today" />
                        </button>
                      </div>
                      <div class="filter-date-single">
                        <input
                          :value="filterDateToDisplay"
                          class="filter-input filter-date-input"
                          type="text"
                          placeholder="A (gg/MM/aaaa)"
                          @input="updateFilterDateText($event.target.value, 'to')"
                        />
                        <input
                          ref="filterDateToRef"
                          :value="filterDateTo"
                          class="filter-date-hidden"
                          type="date"
                          @input="updateFilterDatePicker($event.target.value, 'to')"
                        />
                        <button class="filter-date-button" type="button" @click="openFilterDatePicker('to')">
                          <v-icon name="calendar_today" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="filter-row">
                    <label class="filter-label">Data creazione</label>
                    <div class="filter-date-range">
                      <div class="filter-date-single">
                        <input
                          :value="filterCreatedFromDisplay"
                          class="filter-input filter-date-input"
                          type="text"
                          placeholder="Da (gg/MM/aaaa)"
                          @input="updateCreatedDateText($event.target.value, 'from')"
                        />
                        <input
                          ref="filterCreatedFromRef"
                          :value="filterCreatedFrom"
                          class="filter-date-hidden"
                          type="date"
                          @input="updateCreatedDatePicker($event.target.value, 'from')"
                        />
                        <button class="filter-date-button" type="button" @click="openCreatedDatePicker('from')">
                          <v-icon name="calendar_today" />
                        </button>
                      </div>
                      <div class="filter-date-single">
                        <input
                          :value="filterCreatedToDisplay"
                          class="filter-input filter-date-input"
                          type="text"
                          placeholder="A (gg/MM/aaaa)"
                          @input="updateCreatedDateText($event.target.value, 'to')"
                        />
                        <input
                          ref="filterCreatedToRef"
                          :value="filterCreatedTo"
                          class="filter-date-hidden"
                          type="date"
                          @input="updateCreatedDatePicker($event.target.value, 'to')"
                        />
                        <button class="filter-date-button" type="button" @click="openCreatedDatePicker('to')">
                          <v-icon name="calendar_today" />
                        </button>
                      </div>
                    </div>
                  </div>
                <div class="filter-row">
                  <label class="filter-label">Oggetto richiesta</label>
                  <input v-model="filterProperty" class="filter-input" type="text" placeholder="Cerca oggetto richiesta" />
                </div>
                </div>
              </transition>
            </div>
          </div>
          <div class="task-toggle">
            <button
              :class="['task-chip', 'task-chip--yellow', { active: tagFilters.richiamare }]"
              type="button"
              @click="tagFilters.richiamare = !tagFilters.richiamare"
            >
              Richiamare
            </button>
            <button
              :class="['task-chip', 'task-chip--purple', { active: tagFilters.visita }]"
              type="button"
              @click="tagFilters.visita = !tagFilters.visita"
            >
              Visita
            </button>
            <button
              :class="['task-chip', 'task-chip--blue', { active: tagFilters.appuntamento }]"
              type="button"
              @click="tagFilters.appuntamento = !tagFilters.appuntamento"
            >
              Appuntamento
            </button>
            <button
              :class="['task-chip', 'task-chip--gray', { active: tagFilters.altro }]"
              type="button"
              @click="tagFilters.altro = !tagFilters.altro"
            >
              Altro
            </button>
            <button
              :class="['task-chip', 'task-chip--green', { active: showCompleted }]"
              type="button"
              @click="showCompleted = !showCompleted"
            >
              Completate
            </button>
          </div>
        </div>

        <div v-if="loadingTasks" class="loading">
          <v-progress-circular indeterminate small />
          <span>Caricamento...</span>
        </div>

        <div v-else-if="filteredTasks.length === 0" class="empty-state">
          Nessun task disponibile
        </div>

        <div v-else>
          <div v-if="viewMode === 'table'" class="tasks-table">
            <div class="tasks-table-header" :style="{ gridTemplateColumns: columnGridTemplate }">
              <span
                v-for="column in orderedColumns"
                :key="column.key"
                :class="[
                  column.className,
                  {
                    sortable: column.sortable,
                    'column-draggable': column.draggable,
                    'column-dragging': draggingColumnKey === column.key
                  }
                ]"
                :draggable="column.draggable"
                @click="handleColumnClick(column)"
                @dragstart="handleColumnDragStart(column)"
                @dragend="handleColumnDragEnd"
                @dragover.prevent="handleColumnDragOver(column)"
                @drop="handleColumnDrop(column)"
              >
                <span v-if="column.label">{{ column.label }}</span>
                <span v-if="column.sortable" class="sort-indicator">
                  {{ sortIndicator(column.sortKey) }}
                </span>
              </span>
            </div>
            <div
              v-for="task in filteredTasks"
              :key="task.id"
              class="tasks-row"
              :style="{ gridTemplateColumns: columnGridTemplate }"
              @click="openTaskEditor(task)"
            >
              <template v-for="column in orderedColumns" :key="`${task.id}-${column.key}`">
                <select
                  v-if="column.key === 'tag'"
                  v-model="task.type"
                  :class="['task-tag-select', `task-tag-select--${task.type}`]"
                  @focus="cacheTaskType(task)"
                  @change="updateTaskTag(task)"
                  @click.stop
                >
                  <option value="richiamare">Richiamare</option>
                  <option value="visita">Visita</option>
                  <option value="appuntamento">Appuntamento</option>
                  <option value="altro">Altro</option>
                </select>
                <span v-else-if="column.key === 'name'" class="task-text">{{ task.name || 'N/D' }}</span>
                <span v-else-if="column.key === 'contact'" class="task-text">{{ task.contact || 'N/D' }}</span>
                <span v-else-if="column.key === 'phone'" class="task-text">{{ task.phone || 'N/D' }}</span>
                <span v-else-if="column.key === 'property'" class="task-text">
                  <span v-if="task.propertyInfo" class="task-subtext">{{ task.propertyInfo }}</span>
                  <span v-else>N/D</span>
                </span>
                <span v-else-if="column.key === 'visitDate'" class="task-text">{{ task.visitDate || 'N/D' }}</span>
                <span v-else-if="column.key === 'createdDate'" class="task-text">{{ task.createdDate || 'N/D' }}</span>
                <span v-else-if="column.key === 'notes'" class="task-text">
                  <span v-if="task.notes" class="task-subtext">{{ task.notes }}</span>
                  <span v-else>N/D</span>
                </span>
                <div v-else-if="column.key === 'actions'" class="task-actions" @click.stop>
                  <button
                    :class="['task-complete', { active: task.completed }]"
                    type="button"
                    title="Completata"
                    @click.stop.prevent="toggleCompleted(task)"
                  >
                    <v-icon name="check" />
                  </button>
                  <button
                    class="task-action"
                    type="button"
                    title="Elimina"
                    @click.stop.prevent="confirmDeleteTask(task)"
                  >
                    <v-icon name="delete" />
                  </button>
                  <button
                    v-if="task.conversationId"
                    class="task-action"
                    type="button"
                    title="Apri conversazione"
                    @click.stop.prevent="openConversationInNewTab(task.conversationId)"
                  >
                    <v-icon name="open_in_new" />
                  </button>
                </div>
              </template>
            </div>
          </div>

          <div v-else class="tasks-kanban">
            <div
              class="kanban-column"
              @dragover.prevent
              @drop="handleDrop('richiamare')"
            >
              <div class="kanban-header">
                <span class="task-dot task-dot--yellow"></span>
                Richiamare
              </div>
              <div class="kanban-cards">
                <div
                  v-for="task in kanbanColumns.richiamare"
                  :key="task.id"
                  class="task-card"
                  draggable="true"
                  @dragstart="handleDragStart(task)"
                  @click="openTaskEditor(task)"
                >
                  <div class="task-card-title">
                    <span class="task-pill task-pill--yellow">Richiamare</span>
                    <span class="task-card-name">{{ task.name || 'N/D' }}</span>
                  </div>
                  <div class="task-card-row">
                    <v-icon name="call" />
                    <span>{{ task.phone || 'N/D' }}</span>
                  </div>
                  <div class="task-card-row">
                    <v-icon name="event" />
                    <span>{{ task.createdDate || 'N/D' }}</span>
                  </div>
            <div v-if="task.notes" class="task-card-row">
              <v-icon name="note" />
              <span>{{ task.notes }}</span>
            </div>
                  <div class="task-card-actions" @click.stop>
                    <button
                      :class="['task-complete', 'task-complete-card', { active: task.completed }]"
                      type="button"
                      @click.stop.prevent="toggleCompleted(task)"
                    >
                      Completata
                    </button>
                    <button
                      class="task-action task-action-card"
                      type="button"
                      title="Elimina"
                      @click.stop.prevent="confirmDeleteTask(task)"
                    >
                      <v-icon name="delete" />
                    </button>
                    <button
                      v-if="task.conversationId"
                      class="task-action task-action-card"
                      type="button"
                      title="Apri conversazione"
                      @click.stop.prevent="openConversationInNewTab(task.conversationId)"
                    >
                      <v-icon name="open_in_new" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div
              class="kanban-column"
              @dragover.prevent
              @drop="handleDrop('visita')"
            >
              <div class="kanban-header">
                <span class="task-dot task-dot--purple"></span>
                Visita
              </div>
              <div class="kanban-cards">
                <div
                  v-for="task in kanbanColumns.visita"
                  :key="task.id"
                  class="task-card"
                  draggable="true"
                  @dragstart="handleDragStart(task)"
                  @click="openTaskEditor(task)"
                >
                  <div class="task-card-title">
                    <span class="task-pill task-pill--purple">Visita</span>
                    <span class="task-card-name">{{ task.name || 'N/D' }}</span>
                  </div>
                  <div class="task-card-row">
                    <v-icon name="call" />
                    <span>{{ task.phone || 'N/D' }}</span>
                  </div>
                  <div class="task-card-row">
                    <v-icon name="home" />
                    <span>
                      <a v-if="task.propertyLink" :href="task.propertyLink" target="_blank" rel="noopener">
                        {{ task.propertyRef || task.propertyLink }}
                      </a>
                      <span v-else>{{ task.propertyRef || 'N/D' }}</span>
                    </span>
                  </div>
                  <div class="task-card-row">
                    <v-icon name="event" />
                    <span>{{ task.visitDate || 'N/D' }}</span>
                  </div>
                  <div class="task-card-row">
                    <v-icon name="event" />
                    <span>{{ task.createdDate || 'N/D' }}</span>
                  </div>
            <div v-if="task.notes" class="task-card-row">
              <v-icon name="note" />
              <span>{{ task.notes }}</span>
            </div>
                  <div class="task-card-actions" @click.stop>
                    <button
                      :class="['task-complete', 'task-complete-card', { active: task.completed }]"
                      type="button"
                      @click.stop.prevent="toggleCompleted(task)"
                    >
                      Completata
                    </button>
                    <button
                      class="task-action task-action-card"
                      type="button"
                      title="Elimina"
                      @click.stop.prevent="confirmDeleteTask(task)"
                    >
                      <v-icon name="delete" />
                    </button>
                    <button
                      v-if="task.conversationId"
                      class="task-action task-action-card"
                      type="button"
                      title="Apri conversazione"
                      @click.stop.prevent="openConversationInNewTab(task.conversationId)"
                    >
                      <v-icon name="open_in_new" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <v-dialog v-model="showTaskDialog" @esc="closeTaskDialog">
        <v-card class="task-dialog">
          <v-card-title class="task-dialog-title">
            Nuova task
          </v-card-title>
          <v-card-text class="task-dialog-content">
            <div class="task-form-row">
              <label>Nome</label>
              <input v-model="taskForm.nome" type="text" placeholder="Nome task" />
            </div>
            <div class="task-form-row">
              <label>Contatto</label>
              <input v-model="taskForm.contatto" type="text" placeholder="Contatto" />
            </div>
            <div class="task-form-row">
              <label>Telefono</label>
              <input v-model="taskForm.telefono" type="text" placeholder="Telefono" />
            </div>
            <div class="task-form-row">
              <label>Tipo</label>
              <select v-model="taskForm.tipo">
                <option value="Richiamare">Richiamare</option>
                <option value="Visita">Visita</option>
                <option value="Appuntamento">Appuntamento</option>
                <option value="Altro">Altro</option>
              </select>
            </div>
            <div v-if="taskForm.tipo === 'Visita'" class="task-form-row">
              <label>Data visita</label>
              <input v-model="taskForm.data" type="date" />
            </div>
            <div v-if="taskForm.tipo === 'Visita'" class="task-form-row">
              <label>Ora visita (opzionale)</label>
              <input v-model="taskForm.ora" type="time" />
            </div>
            <div v-if="taskForm.tipo === 'Visita'" class="task-form-row">
              <label>Oggetto richiesta</label>
              <input v-model="taskForm.oggetto_richiesta" type="text" placeholder="Oggetto richiesta" />
            </div>
            <div class="task-form-row">
              <label>Note</label>
              <textarea v-model="taskForm.note" rows="3" placeholder="Note"></textarea>
            </div>
          </v-card-text>
          <v-card-actions class="task-dialog-actions">
            <v-button @click="closeTaskDialog" secondary>Annulla</v-button>
            <v-button @click="createTask" :loading="savingTask">Crea</v-button>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="showEditDialog" @esc="closeEditDialog">
        <v-card class="task-dialog">
          <v-card-title class="task-dialog-title">
            Task
          </v-card-title>
          <v-card-text class="task-dialog-content">
            <div class="task-form-row">
              <label>Nome</label>
              <input v-model="editForm.nome" type="text" :disabled="editForm.readonly" />
            </div>
            <div class="task-form-row">
              <label>Contatto</label>
              <input v-model="editForm.contatto" type="text" :disabled="editForm.readonly" />
            </div>
            <div class="task-form-row">
              <label>Telefono</label>
              <input v-model="editForm.telefono" type="text" :disabled="editForm.readonly" />
            </div>
            <div class="task-form-row">
              <label>Tipo</label>
              <select v-model="editForm.tipo" :disabled="editForm.readonly">
                <option value="Richiamare">Richiamare</option>
                <option value="Visita">Visita</option>
                <option value="Appuntamento">Appuntamento</option>
                <option value="Altro">Altro</option>
              </select>
            </div>
            <div class="task-form-row">
              <label>Data</label>
              <input v-model="editForm.data" type="date" :disabled="editForm.readonly" />
            </div>
            <div class="task-form-row">
              <label>Ora (opzionale)</label>
              <input v-model="editForm.ora" type="time" :disabled="editForm.readonly" />
            </div>
            <div class="task-form-row">
              <label>Oggetto richiesta</label>
              <input v-model="editForm.oggetto_richiesta" type="text" :disabled="editForm.readonly" />
            </div>
            <div class="task-form-row">
              <label>Note</label>
              <textarea v-model="editForm.note" rows="3" :disabled="!editForm.allowNotes"></textarea>
            </div>
          </v-card-text>
          <v-card-actions class="task-dialog-actions">
            <v-button @click="closeEditDialog" secondary>Chiudi</v-button>
            <v-button v-if="editForm.allowNotes" @click="saveTaskEdits" :loading="savingEdit">Salva</v-button>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showDeleteDialog" @esc="cancelDelete">
        <v-card class="task-dialog">
          <v-card-title class="task-dialog-title">Elimina task</v-card-title>
          <v-card-text class="task-dialog-content">
            Sei sicuro di voler eliminare questa task?
          </v-card-text>
          <v-card-actions class="task-dialog-actions">
            <v-button @click="cancelDelete" secondary>Annulla</v-button>
            <v-button @click="confirmDelete" :loading="deletingTask">Elimina</v-button>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </private-view>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApi } from '@directus/extensions-sdk';
import AziendeDrawer from '../components/AziendeDrawer.vue';
import { useAziende } from '../composables/useAziende';
import { formatDate, formatTime } from '../utils/conversationUtils';

const TASK_COLLECTION = 'task';

const MANUAL_TASK_FIELDS = {
  name: 'nome',
  contact: 'contatto',
  phone: 'telefono',
  date: 'data',
  type: 'tipo',
  note: 'note',
  propertyInfo: 'oggetto_richiesta',
  azienda: 'azienda',
  completed: 'completata',
  deleted: 'task_deleted',
  user: 'id_user',
  conversationRef: 'riferimento_conv',
  createdAt: 'date_created'
};

const route = useRoute();
const router = useRouter();
const api = useApi();
const basePath = computed(() => route.path.replace(/\/(tabella|task)$/, ''));
const isTableRoute = computed(() => route.path.endsWith('/tabella'));
const isTaskRoute = computed(() => route.path.endsWith('/task'));
const isListRoute = computed(() => !isTableRoute.value && !isTaskRoute.value);

const {
  availableAziende,
  aziendaUserMap,
  selectedAzienda,
  loadingAziende,
  error: aziendeError,
  loadAziende,
  selectAzienda: selectAziendaUtil
} = useAziende();

const drawerOpen = ref(false);
const loadingTasks = ref(false);
const tasksError = ref(null);
const tasks = ref([]);
const viewMode = ref('table');
const searchInput = ref('');
const tagFilters = ref({ richiamare: true, visita: true, appuntamento: true, altro: true });
const currentUserId = ref(null);
const showTaskDialog = ref(false);
const savingTask = ref(false);
const showEditDialog = ref(false);
const savingEdit = ref(false);
const showDeleteDialog = ref(false);
const deletingTask = ref(false);
const taskToDelete = ref(null);
const editingTask = ref(null);
const editForm = ref({
  nome: '',
  contatto: '',
  telefono: '',
  data: '',
  ora: '',
  tipo: 'Richiamare',
  oggetto_richiesta: '',
  note: '',
  readonly: false,
  allowNotes: true
});
const taskForm = ref({
  nome: '',
  contatto: '',
  telefono: '',
  data: '',
  ora: '',
  tipo: 'Richiamare',
  oggetto_richiesta: '',
  note: ''
});
const sortKey = ref('visitDate');
const sortDir = ref('desc');
const columns = [
  { key: 'tag', label: '', className: 'col-tag', width: '90px', draggable: false },
  { key: 'name', label: 'Task', className: 'col-name', width: 'minmax(0, 1.1fr)', sortable: true, sortKey: 'name', draggable: true },
  { key: 'contact', label: 'Contatto', className: 'col-contact', width: 'minmax(0, 1fr)', sortable: true, sortKey: 'contact', draggable: true },
  { key: 'phone', label: 'Telefono', className: 'col-phone', width: 'minmax(0, 1fr)', sortable: true, sortKey: 'phone', draggable: true },
  { key: 'property', label: 'Oggetto richiesta', className: 'col-property', width: 'minmax(0, 1.2fr)', sortable: true, sortKey: 'property', draggable: true },
  { key: 'visitDate', label: 'Data', className: 'col-date', width: 'minmax(0, 0.9fr)', sortable: true, sortKey: 'visitDate', draggable: true },
  { key: 'createdDate', label: 'Data creazione', className: 'col-created', width: 'minmax(0, 0.9fr)', sortable: true, sortKey: 'createdDate', draggable: true },
  { key: 'notes', label: 'Note', className: 'col-notes', width: 'minmax(0, 1.2fr)', sortable: true, sortKey: 'notes', draggable: true },
  { key: 'actions', label: '', className: 'col-actions', width: '90px', draggable: false }
];
const columnOrder = ref(columns.map(column => column.key));
const draggingColumnKey = ref(null);
const filterMenuOpen = ref(false);
const filterMenuRef = ref(null);
const filterStatus = ref('all');
const filterAction = ref('all');
const filterDateFrom = ref('');
const filterDateTo = ref('');
const filterDateFromDisplay = ref('');
const filterDateToDisplay = ref('');
const filterCreatedFrom = ref('');
const filterCreatedTo = ref('');
const filterCreatedFromDisplay = ref('');
const filterCreatedToDisplay = ref('');
const filterProperty = ref('');
const filterName = ref('');
const filterPhone = ref('');
const filterDateFromRef = ref(null);
const filterDateToRef = ref(null);
const filterCreatedFromRef = ref(null);
const filterCreatedToRef = ref(null);
const draggingTaskId = ref(null);
const lastTaskType = ref({});
const showCompleted = ref(true);

const selectedAziendaUserId = computed(() => {
  if (!selectedAzienda.value) return null;
  return aziendaUserMap.value?.[selectedAzienda.value] || null;
});
const orderedColumns = computed(() => {
  return columnOrder.value
    .map(key => columns.find(column => column.key === key))
    .filter(Boolean);
});
const columnGridTemplate = computed(() => orderedColumns.value.map(column => column.width).join(' '));
function normalizeAzienda(value) {
  return String(value || '').trim().toLowerCase();
}

const filteredTasks = computed(() => {
  const search = searchInput.value.trim().toLowerCase();
  const activeTags = [];
  if (tagFilters.value.richiamare) activeTags.push('richiamare');
  if (tagFilters.value.visita) activeTags.push('visita');
  if (tagFilters.value.appuntamento) activeTags.push('appuntamento');
  if (tagFilters.value.altro) activeTags.push('altro');

  if (activeTags.length === 0) return [];

  const filtered = tasks.value.filter(task => {
    if (task.deleted) return false;
    if (selectedAzienda.value) {
      const selectedKey = normalizeAzienda(selectedAzienda.value);
      const taskKey = normalizeAzienda(task.azienda);
      if (!taskKey || taskKey !== selectedKey) return false;
    }
    if (activeTags.length > 0 && !activeTags.includes(task.type)) return false;
    if (filterAction.value !== 'all' && task.type !== filterAction.value) return false;
    if (filterStatus.value === 'done' && !task.completed) return false;
    if (filterStatus.value === 'open' && task.completed) return false;
    if (filterStatus.value === 'all' && !showCompleted.value && task.completed) return false;
    if (filterName.value.trim()) {
      const name = String(task.name || '').toLowerCase();
      if (!name.includes(filterName.value.trim().toLowerCase())) return false;
    }
    if (filterPhone.value.trim()) {
      const phone = String(task.phone || '').toLowerCase();
      if (!phone.includes(filterPhone.value.trim().toLowerCase())) return false;
    }
    if (filterProperty.value.trim()) {
      const prop = filterProperty.value.trim().toLowerCase();
      const requestSubject = String(task.propertyInfo || '').toLowerCase();
      if (!requestSubject.includes(prop)) return false;
    }
    if (filterDateFrom.value || filterDateTo.value) {
      if (!task.rawVisitDate) return false;
      const date = toISODate(task.rawVisitDate);
      if (filterDateFrom.value && date < filterDateFrom.value) return false;
      if (filterDateTo.value && date > filterDateTo.value) return false;
    }
    if (filterCreatedFrom.value || filterCreatedTo.value) {
      if (!task.rawCreatedDate) return false;
      const date = toISODate(task.rawCreatedDate);
      if (filterCreatedFrom.value && date < filterCreatedFrom.value) return false;
      if (filterCreatedTo.value && date > filterCreatedTo.value) return false;
    }
    if (!search) return true;
    return (
      String(task.name || '').toLowerCase().includes(search) ||
      String(task.contact || '').toLowerCase().includes(search) ||
      String(task.phone || '').toLowerCase().includes(search) ||
      String(task.propertyInfo || '').toLowerCase().includes(search) ||
      String(task.notes || '').toLowerCase().includes(search)
    );
  });

  return [...filtered].sort((a, b) => compareByKey(a, b, sortKey.value, sortDir.value));
});

const activeFiltersCount = computed(() => {
  let count = 0;
  if (filterAction.value !== 'all') count += 1;
  if (filterStatus.value !== 'all') count += 1;
  if (filterName.value.trim()) count += 1;
  if (filterPhone.value.trim()) count += 1;
  if (filterProperty.value.trim()) count += 1;
  if (filterDateFrom.value || filterDateTo.value) count += 1;
  if (filterCreatedFrom.value || filterCreatedTo.value) count += 1;
  return count;
});

const kanbanColumns = computed(() => ({
  richiamare: filteredTasks.value.filter(task => task.type === 'richiamare'),
  visita: filteredTasks.value.filter(task => task.type === 'visita')
}));

async function loadTasks() {
  loadingTasks.value = true;
  tasksError.value = null;
  try {
    const manualItems = await fetchManualTasks({ includeOptional: true });
    tasks.value = [
      ...manualItems
        .map(item => normalizeManualTask(item))
        .filter(task => ['richiamare', 'visita', 'appuntamento', 'altro'].includes(task.type))
    ];
  } catch (err) {
    const status = err.response?.status;
    if (status === 400 || status === 403) {
      try {
        const manualItems = await fetchManualTasks({ includeOptional: false });
        tasks.value = [
          ...manualItems
            .map(item => normalizeManualTask(item))
            .filter(task => ['richiamare', 'visita', 'appuntamento', 'altro'].includes(task.type))
        ];
        tasksError.value = null;
      } catch (fallbackErr) {
        console.error('Errore nel caricamento dei task:', fallbackErr);
        tasksError.value = 'Errore nel caricamento dei task. Verifica i permessi.';
        tasks.value = [];
      }
    } else {
      console.error('Errore nel caricamento dei task:', err);
      tasksError.value = 'Errore nel caricamento dei task. Verifica i permessi.';
      tasks.value = [];
    }
  } finally {
    loadingTasks.value = false;
  }
}

async function fetchManualTasks({ includeOptional }) {
  const baseFields = [
    'id',
    MANUAL_TASK_FIELDS.name,
    MANUAL_TASK_FIELDS.contact,
    MANUAL_TASK_FIELDS.date,
    MANUAL_TASK_FIELDS.type,
    MANUAL_TASK_FIELDS.note,
    MANUAL_TASK_FIELDS.completed,
    MANUAL_TASK_FIELDS.user,
    MANUAL_TASK_FIELDS.azienda,
    MANUAL_TASK_FIELDS.deleted,
    MANUAL_TASK_FIELDS.conversationRef,
    MANUAL_TASK_FIELDS.createdAt
  ];
  const fields = includeOptional
    ? [...baseFields, MANUAL_TASK_FIELDS.phone, MANUAL_TASK_FIELDS.propertyInfo]
    : baseFields;
  const response = await api.get(`/items/${TASK_COLLECTION}`, {
    params: {
      fields: fields.filter(Boolean).join(','),
      sort: '-date_created',
      limit: -1
    }
  });
  return response.data?.data || response.data || [];
}

function normalizeManualTask(item) {
  const rawType = String(item?.[MANUAL_TASK_FIELDS.type] || '').trim().toLowerCase();
  const type =
    rawType === 'richiamare'
      ? 'richiamare'
      : rawType === 'visita'
        ? 'visita'
        : rawType === 'appuntamento'
          ? 'appuntamento'
          : '';
  return {
    id: item?.id,
    type,
    label:
      type === 'richiamare'
        ? 'Richiamare'
        : type === 'appuntamento'
          ? 'Appuntamento'
          : 'Visita',
    name: item?.[MANUAL_TASK_FIELDS.name] || '',
    contact: item?.[MANUAL_TASK_FIELDS.contact] || '',
    phone: item?.[MANUAL_TASK_FIELDS.phone] || '',
    propertyInfo: item?.[MANUAL_TASK_FIELDS.propertyInfo] || '',
    propertyLink: '',
    propertyCode: '',
    visitDate: formatDateTime(item?.[MANUAL_TASK_FIELDS.date]),
    rawVisitDate: item?.[MANUAL_TASK_FIELDS.date] || '',
    createdDate: formatDate(item?.[MANUAL_TASK_FIELDS.createdAt]),
    rawCreatedDate: item?.[MANUAL_TASK_FIELDS.createdAt] || '',
    completed: !!item?.[MANUAL_TASK_FIELDS.completed],
    notes: item?.[MANUAL_TASK_FIELDS.note] || '',
    deleted: !!item?.[MANUAL_TASK_FIELDS.deleted],
    azienda: item?.[MANUAL_TASK_FIELDS.azienda] || '',
    conversationId: item?.[MANUAL_TASK_FIELDS.conversationRef] || null
  };
}
function openConversationInNewTab(id) {
  if (!id) return;
  const target = router.resolve({
    path: basePath.value,
    query: { id: String(id) }
  });
  if (typeof window !== 'undefined') {
    window.open(target.href, '_blank', 'noopener');
  }
}

function formatDateTime(value) {
  if (!value) return '';
  const datePart = formatDate(value);
  const timePart = formatTime(value);
  if (!timePart || timePart === '00:00') {
    return datePart;
  }
  return `${datePart} ${timePart}`;
}

function toISODate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function compareByKey(a, b, key, direction) {
  const dir = direction === 'asc' ? 1 : -1;
  const getValue = item => {
    if (key === 'name') return String(item.name || '').toLowerCase();
    if (key === 'contact') return String(item.contact || '').toLowerCase();
    if (key === 'phone') return String(item.phone || '').toLowerCase();
    if (key === 'property') {
      return String(item.propertyInfo || '').toLowerCase();
    }
    if (key === 'visitDate') {
      return item.rawVisitDate ? new Date(item.rawVisitDate).getTime() : 0;
    }
    if (key === 'createdDate') {
      return item.rawCreatedDate ? new Date(item.rawCreatedDate).getTime() : 0;
    }
    if (key === 'notes') return String(item.notes || '').toLowerCase();
    return '';
  };
  const aVal = getValue(a);
  const bVal = getValue(b);
  if (typeof aVal === 'number' && typeof bVal === 'number') {
    return (aVal - bVal) * dir;
  }
  return String(aVal).localeCompare(String(bVal), 'it') * dir;
}

function sortIndicator(key) {
  if (sortKey.value !== key) return '⇅';
  return sortDir.value === 'asc' ? '↑' : '↓';
}

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
}

function handleColumnClick(column) {
  if (!column?.sortable) return;
  toggleSort(column.sortKey);
}

function handleColumnDragStart(column) {
  if (!column?.draggable) return;
  draggingColumnKey.value = column.key;
}

function handleColumnDragOver(column) {
  if (!column?.draggable) return;
}

function handleColumnDrop(column) {
  if (!column?.draggable) return;
  if (!draggingColumnKey.value || draggingColumnKey.value === column.key) return;
  const nextOrder = [...columnOrder.value];
  const fromIndex = nextOrder.indexOf(draggingColumnKey.value);
  const toIndex = nextOrder.indexOf(column.key);
  if (fromIndex === -1 || toIndex === -1) return;
  nextOrder.splice(fromIndex, 1);
  nextOrder.splice(toIndex, 0, draggingColumnKey.value);
  columnOrder.value = nextOrder;
  draggingColumnKey.value = null;
}

function handleColumnDragEnd() {
  draggingColumnKey.value = null;
}

async function handleSelectAzienda(azienda) {
  selectAziendaUtil(azienda);
  drawerOpen.value = false;
  await loadTasks();
}

function retry() {
  loadAziende();
  loadTasks();
}

async function loadCurrentUser() {
  try {
    const response = await api.get('/users/me', { params: { fields: 'id' } });
    const data = response.data?.data || response.data;
    currentUserId.value = data?.id || null;
  } catch (err) {
    currentUserId.value = null;
  }
}

function openTaskDialog() {
  showTaskDialog.value = true;
}

function closeTaskDialog() {
  showTaskDialog.value = false;
  taskForm.value = {
    nome: '',
    contatto: '',
    telefono: '',
    data: '',
    ora: '',
    tipo: 'Richiamare',
    oggetto_richiesta: '',
    note: ''
  };
}

async function createTask() {
  if (savingTask.value) return;
  if (!taskForm.value.nome || !taskForm.value.tipo) return;
  savingTask.value = true;
  try {
    const payload = {
      [MANUAL_TASK_FIELDS.name]: taskForm.value.nome,
      [MANUAL_TASK_FIELDS.type]: taskForm.value.tipo,
      [MANUAL_TASK_FIELDS.note]: taskForm.value.note || ''
    };
    if (taskForm.value.contatto) {
      payload[MANUAL_TASK_FIELDS.contact] = taskForm.value.contatto;
    }
    if (selectedAzienda.value) {
      payload[MANUAL_TASK_FIELDS.azienda] = selectedAzienda.value;
    }
    if (taskForm.value.tipo === 'Visita') {
      const dateValue = taskForm.value.data;
      const timeValue = taskForm.value.ora;
      const composed = dateValue ? (timeValue ? `${dateValue}T${timeValue}` : dateValue) : null;
      payload[MANUAL_TASK_FIELDS.date] = normalizeDateTimeInput(composed);
    if (taskForm.value.oggetto_richiesta) {
      payload[MANUAL_TASK_FIELDS.propertyInfo] = taskForm.value.oggetto_richiesta;
      }
    }
    if (taskForm.value.telefono) {
      payload[MANUAL_TASK_FIELDS.phone] = taskForm.value.telefono;
    }
    const preferredUserId = selectedAziendaUserId.value || currentUserId.value;
    if (preferredUserId) {
      payload[MANUAL_TASK_FIELDS.user] = preferredUserId;
    }
    const response = await api.post(`/items/${TASK_COLLECTION}`, payload);
    const created = response.data?.data || response.data;
    if (created) {
      await loadTasks();
    }
    closeTaskDialog();
  } catch (err) {
    console.error('Errore creazione task:', err);
  } finally {
    savingTask.value = false;
  }
}

function openTaskEditor(task) {
  if (!task) return;
  editingTask.value = task;
  editForm.value = {
    nome: task.name || '',
    contatto: task.contact || '',
    telefono: task.phone || '',
    data: task.rawVisitDate ? toISODate(task.rawVisitDate) : '',
    ora: task.rawVisitDate ? toLocalTime(task.rawVisitDate) : '',
    tipo:
      task.type === 'visita'
        ? 'Visita'
        : task.type === 'appuntamento'
          ? 'Appuntamento'
          : task.type === 'richiamare'
            ? 'Richiamare'
            : 'Altro',
    oggetto_richiesta: task.propertyInfo || '',
    note: task.note || '',
    readonly: false,
    allowNotes: true
  };
  showEditDialog.value = true;
}

function closeEditDialog() {
  showEditDialog.value = false;
  editingTask.value = null;
}

async function saveTaskEdits() {
  if (!editingTask.value || savingEdit.value || !editForm.value.allowNotes) return;
  savingEdit.value = true;
  try {
    const payload = {
      [MANUAL_TASK_FIELDS.name]: editForm.value.nome,
      [MANUAL_TASK_FIELDS.type]: editForm.value.tipo,
      [MANUAL_TASK_FIELDS.note]: editForm.value.note || '',
      [MANUAL_TASK_FIELDS.date]: normalizeDateTimeInput(
        editForm.value.data
          ? editForm.value.ora
            ? `${editForm.value.data}T${editForm.value.ora}`
            : editForm.value.data
          : null
      ),
      [MANUAL_TASK_FIELDS.phone]: editForm.value.telefono || '',
      [MANUAL_TASK_FIELDS.propertyInfo]: editForm.value.oggetto_richiesta || '',
      [MANUAL_TASK_FIELDS.contact]: editForm.value.contatto || ''
    };
    await updateManualTask(editingTask.value.id, payload);
    await loadTasks();
    closeEditDialog();
  } catch (err) {
    console.error('Errore salvataggio task:', err);
  } finally {
    savingEdit.value = false;
  }
}

function confirmDeleteTask(task) {
  taskToDelete.value = task;
  showDeleteDialog.value = true;
}

function cancelDelete() {
  showDeleteDialog.value = false;
  taskToDelete.value = null;
}

async function confirmDelete() {
  if (!taskToDelete.value || deletingTask.value) return;
  const target = taskToDelete.value;
  showDeleteDialog.value = false;
  deletingTask.value = true;
  try {
    await updateManualTask(target.id, { [MANUAL_TASK_FIELDS.deleted]: true });
    tasks.value = tasks.value.filter(item => item.id !== target.id);
  } catch (err) {
    console.error('Errore eliminazione task:', err);
  } finally {
    deletingTask.value = false;
    taskToDelete.value = null;
  }
}

function toLocalTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = num => String(num).padStart(2, '0');
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${hours}:${minutes}`;
}

function normalizeDateTimeInput(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function toggleFilterMenu() {
  filterMenuOpen.value = !filterMenuOpen.value;
}

function handleFilterOutsideClick(event) {
  const wrapper = filterMenuRef.value;
  if (!wrapper) return;
  if (wrapper.contains(event.target)) return;
  filterMenuOpen.value = false;
}

function updateFilterDatePicker(value, key) {
  if (key === 'from') {
    filterDateFrom.value = value || '';
    filterDateFromDisplay.value = formatDateDisplay(value);
  } else {
    filterDateTo.value = value || '';
    filterDateToDisplay.value = formatDateDisplay(value);
  }
}

function updateFilterDateText(value, key) {
  if (key === 'from') {
    filterDateFromDisplay.value = value;
    filterDateFrom.value = parseDateInput(value);
  } else {
    filterDateToDisplay.value = value;
    filterDateTo.value = parseDateInput(value);
  }
}

function updateCreatedDatePicker(value, key) {
  if (key === 'from') {
    filterCreatedFrom.value = value || '';
    filterCreatedFromDisplay.value = formatDateDisplay(value);
  } else {
    filterCreatedTo.value = value || '';
    filterCreatedToDisplay.value = formatDateDisplay(value);
  }
}

function updateCreatedDateText(value, key) {
  if (key === 'from') {
    filterCreatedFromDisplay.value = value;
    filterCreatedFrom.value = parseDateInput(value);
  } else {
    filterCreatedToDisplay.value = value;
    filterCreatedTo.value = parseDateInput(value);
  }
}

function openFilterDatePicker(key) {
  const ref = key === 'from' ? filterDateFromRef.value : filterDateToRef.value;
  if (!ref) return;
  if (typeof ref.showPicker === 'function') {
    ref.showPicker();
  } else {
    ref.focus();
    ref.click();
  }
}

function openCreatedDatePicker(key) {
  const ref = key === 'from' ? filterCreatedFromRef.value : filterCreatedToRef.value;
  if (!ref) return;
  if (typeof ref.showPicker === 'function') {
    ref.showPicker();
  } else {
    ref.focus();
    ref.click();
  }
}

function formatDateDisplay(value) {
  if (!value) return '';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

function parseDateInput(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month}-${day}`;
  }
  return '';
}

async function updateManualTask(id, payload) {
  if (!id) return;
  await api.patch(`/items/${TASK_COLLECTION}/${id}`, payload);
}

async function toggleCompleted(task) {
  if (!task?.id) return;
  const nextValue = !task.completed;
  task.completed = nextValue;
  try {
    await updateManualTask(task.id, { [MANUAL_TASK_FIELDS.completed]: nextValue });
  } catch (err) {
    task.completed = !nextValue;
    console.error('Errore aggiornamento task completata:', err);
  }
}

async function updateTaskTag(task) {
  if (!task?.id) return;
  const previousType = lastTaskType.value[task.id] || task.type;
  const nextValue =
    task.type === 'visita'
      ? 'Visita'
      : task.type === 'appuntamento'
        ? 'Appuntamento'
        : 'Richiamare';
  try {
    await updateManualTask(task.id, { [MANUAL_TASK_FIELDS.type]: nextValue });
    task.label =
      task.type === 'richiamare'
        ? 'Richiamare'
        : task.type === 'appuntamento'
          ? 'Appuntamento'
          : 'Visita';
  } catch (err) {
    task.type = previousType;
    task.label =
      previousType === 'richiamare'
        ? 'Richiamare'
        : previousType === 'appuntamento'
          ? 'Appuntamento'
          : 'Visita';
    console.error('Errore aggiornamento tag:', err);
  }
}

function cacheTaskType(task) {
  if (!task?.id) return;
  lastTaskType.value = { ...lastTaskType.value, [task.id]: task.type };
}

function handleDragStart(task) {
  draggingTaskId.value = task.id;
}

async function handleDrop(targetType) {
  if (!draggingTaskId.value) return;
  const task = tasks.value.find(item => item.id === draggingTaskId.value);
  draggingTaskId.value = null;
  if (!task || task.type === targetType) return;
  const previousType = task.type;
  task.type = targetType;
  task.label = targetType === 'richiamare' ? 'Richiamare' : 'Visita';
  try {
    await updateManualTask(task.id, { [MANUAL_TASK_FIELDS.type]: task.label });
  } catch (err) {
    task.type = previousType;
    task.label =
      previousType === 'richiamare'
        ? 'Richiamare'
        : previousType === 'appuntamento'
          ? 'Appuntamento'
          : 'Visita';
    console.error('Errore aggiornamento tag:', err);
  }
}

watch(selectedAzienda, () => {
  loadTasks();
});

watch(filterMenuOpen, (open) => {
  if (!open) return;
  filterDateFromDisplay.value = filterDateFromDisplay.value || formatDateDisplay(filterDateFrom.value);
  filterDateToDisplay.value = filterDateToDisplay.value || formatDateDisplay(filterDateTo.value);
  filterCreatedFromDisplay.value = filterCreatedFromDisplay.value || formatDateDisplay(filterCreatedFrom.value);
  filterCreatedToDisplay.value = filterCreatedToDisplay.value || formatDateDisplay(filterCreatedTo.value);
});

onMounted(async () => {
  await loadCurrentUser();
  await loadAziende();
  if (availableAziende.value.length > 0 && !selectedAzienda.value) {
    await handleSelectAzienda(availableAziende.value[0].value);
  } else {
    await loadTasks();
  }
});

onMounted(() => {
  document.addEventListener('click', handleFilterOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleFilterOutsideClick);
});
</script>

<style scoped>
.tasks-dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--background-page);
}

.tasks-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px 20px;
  height: 100%;
  box-sizing: border-box;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0;
}

.module-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(94, 114, 228, 0.1) 0%, rgba(168, 184, 216, 0.1) 100%);
  border: 1px solid rgba(94, 114, 228, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(94, 114, 228, 0.1);
}

.module-icon {
  width: 24px;
  height: 24px;
  color: #5e72e4;
}

.module-title-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.module-subtitle {
  font-size: 11px;
  font-weight: 500;
  color: var(--foreground-subdued, #6b7280);
  line-height: 1.4;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.module-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--foreground, #1f2937);
  line-height: 1.2;
  letter-spacing: -0.6px;
}

.tasks-topbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.azienda-select-button {
  width: 100%;
  max-width: 260px;
  font-size: 12px;
  font-weight: 600;
}

.azienda-select-button :deep(.v-button) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  min-height: 36px;
  width: 100%;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
}

.azienda-button-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  font-size: 12px;
}

.view-toggle {
  display: inline-flex;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 10px;
  overflow: hidden;
}

.task-add-button {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(94, 114, 228, 0.2);
  background: rgba(94, 114, 228, 0.12);
  color: #5e72e4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.task-add-button:hover {
  background: rgba(94, 114, 228, 0.2);
}

.view-button {
  width: 30px;
  height: 30px;
  border: none;
  background: var(--background, #ffffff);
  cursor: pointer;
  color: var(--foreground-subdued, #6b7280);
}

.view-button.active {
  background: var(--background-subdued, #f3f4f6);
  color: var(--foreground, #1f2937);
}

.tasks-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tasks-search-group {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.tasks-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  width: 320px;
  height: 44px;
}

.tasks-search input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 12px;
}

.task-toggle {
  display: flex;
  gap: 8px;
}

.task-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #1f2937;
  background: #f3f4f6;
}

.task-chip.active {
  box-shadow: 0 0 0 2px rgba(94, 114, 228, 0.15);
}

.task-chip--yellow {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

.task-chip--purple {
  background: rgba(139, 92, 246, 0.18);
  color: #6d28d9;
}

.task-chip--blue {
  background: rgba(59, 130, 246, 0.18);
  color: #1d4ed8;
}

.task-chip--green {
  background: rgba(16, 185, 129, 0.18);
  color: #059669;
}

.task-chip--gray {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}

.task-chip--yellow:not(.active),
.task-chip--purple:not(.active),
.task-chip--blue:not(.active),
.task-chip--green:not(.active),
.task-chip--gray:not(.active) {
  background: #f3f4f6;
  color: #9ca3af;
}

.task-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.task-dot--yellow {
  background: #f59e0b;
}

.task-dot--purple {
  background: #8b5cf6;
}

.filters-button-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.filters-button {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(94, 114, 228, 0.2);
  background: rgba(94, 114, 228, 0.15);
  color: #5e72e4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.filters-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(94, 114, 228, 0.15);
  color: #5e72e4;
  font-size: 11px;
  font-weight: 600;
}

.filters-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 560px;
  max-width: 760px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  z-index: 20;
}

.filters-popover-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground, #1f2937);
  margin-bottom: 10px;
}

.filters-popover::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 14px;
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-left: 1px solid var(--border-color-subdued, #e5e7eb);
  border-top: 1px solid var(--border-color-subdued, #e5e7eb);
  transform: rotate(45deg);
}

.filters-pop-enter-active,
.filters-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.filters-pop-enter-from,
.filters-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.filter-row {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
}

.sort-indicator {
  font-size: 11px;
  color: var(--foreground-subdued, #6b7280);
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.column-draggable {
  cursor: grab;
}

.column-dragging {
  opacity: 0.6;
  cursor: grabbing;
}

.task-subtext {
  display: block;
  font-size: 12px;
  color: var(--foreground-subdued, #6b7280);
}

.filter-label {
  font-size: 11px;
  color: var(--foreground-subdued, #6b7280);
}

.filter-select,
.filter-input {
  width: 100%;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: #ffffff;
  font-size: 12px;
  padding: 0 8px;
  color: var(--foreground, #1f2937);
}

.filter-date-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.filter-date-single {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-date-input {
  padding-right: 26px;
}

.filter-date-hidden {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
}

.filter-date-button {
  position: absolute;
  right: 4px;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--foreground-subdued, #6b7280);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.task-tag-select {
  height: 24px;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  min-width: unset;
  width: auto;
  min-width: 0;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  text-align-last: center;
  appearance: none;
  background-image: none;
}

.task-tag-select::-ms-expand {
  display: none;
}

.task-tag-select--richiamare {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

.task-tag-select--visita {
  background: rgba(139, 92, 246, 0.18);
  color: #6d28d9;
}

.task-tag-select--appuntamento {
  background: rgba(59, 130, 246, 0.18);
  color: #1d4ed8;
}

.task-tag-select--altro {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}

.task-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
  justify-self: end;
}

.task-complete {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  color: var(--foreground-subdued, #6b7280);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.task-complete.active {
  background: rgba(16, 185, 129, 0.2);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.4);
}

.task-complete-card {
  align-self: flex-start;
  width: auto;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
}

.task-dialog {
  max-width: 520px;
  width: 90vw;
}

.task-dialog-title {
  font-size: 18px;
  font-weight: 600;
  padding: 20px 20px 0 20px;
}

.task-dialog-content {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--foreground-subdued, #6b7280);
}

.task-form-row input,
.task-form-row select,
.task-form-row textarea {
  border-radius: 10px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
}

.task-dialog-actions {
  padding: 0 20px 20px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.tasks-table {
  display: grid;
  gap: 8px;
  padding-bottom: 20px;
}

.tasks-table-header,
.tasks-row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.2fr) 90px;
  gap: 12px;
  align-items: center;
}

.tasks-table-header {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--foreground-subdued, #6b7280);
  padding: 8px 12px;
}

.tasks-table-header > span,
.tasks-row > span {
  justify-self: start;
  text-align: left;
}

.tasks-row {
  background: #ffffff;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 12px;
  cursor: pointer;
}

.tasks-row:hover {
  border-color: var(--border-normal, #d1d5db);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
}

.task-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.task-pill--yellow {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

.task-pill--purple {
  background: rgba(139, 92, 246, 0.18);
  color: #7c3aed;
}

.task-text a {
  color: var(--primary, #5e72e4);
  text-decoration: none;
}

.tasks-table-header > span,
.tasks-row > span,
.task-text {
  min-width: 0;
}

.tasks-kanban {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding-bottom: 20px;
}

.kanban-column {
  background: #ffffff;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 12px;
  padding: 12px;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kanban-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground, #1f2937);
}

.kanban-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-card {
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--background, #ffffff);
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
}

.task-card:hover {
  border-color: var(--border-normal, #d1d5db);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.06);
}

.task-card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-action {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid var(--border-color-subdued, #e5e7eb);
  background: var(--background, #ffffff);
  color: var(--foreground-subdued, #6b7280);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.task-action:hover {
  background: var(--background-subdued, #f3f4f6);
  color: var(--foreground, #1f2937);
}

.task-action-card {
  width: auto;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
}

.task-card-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.task-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground, #1f2937);
}

.task-card-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--foreground-subdued, #6b7280);
}

.loading {
  padding: 24px 16px;
  text-align: center;
  color: var(--foreground-subdued);
  font-size: 13px;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--foreground-subdued);
  font-size: 14px;
}

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

.nav-item.nav-item--active .v-list-item-content {
  color: var(--foreground, #1a1a1a);
  font-weight: 600;
}

.nav-item.nav-item--active .v-icon {
  color: var(--foreground, #1a1a1a);
  opacity: 0.9;
}
</style>
