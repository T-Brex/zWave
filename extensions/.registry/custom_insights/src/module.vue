<template>
	<private-view title="Approfondimenti">
		<template #navigation>
			<v-list nav>
				<v-list-item class="nav-item nav-item--active" :active="true">
					<v-list-item-icon class="nav-icon-approfondimenti">
						<v-icon name="insights" />
					</v-list-item-icon>
					<v-list-item-content>Approfondimenti</v-list-item-content>
				</v-list-item>
			</v-list>
		</template>

		<!-- Drawer selezione azienda (destra) -->
		<v-drawer v-model="drawerOpen" side="right" :title="drawerTitle" width="320">
			<div class="drawer-content">
				<div class="drawer-header">
					<div class="drawer-header-title">
						<v-icon name="business" />
						<span>Seleziona Azienda</span>
					</div>
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
				<div v-if="aziendeLoading" class="drawer-loading">
					<v-progress-circular indeterminate />
					<span>Caricamento aziende...</span>
				</div>
				<v-info
					v-else-if="aziendeError"
					type="danger"
					icon="error"
					:title="aziendeError.title || 'Errore'"
					:text="aziendeError.message || ''"
				>
					<template #append>
						<v-button @click="loadAziende" :loading="aziendeLoading">Riprova</v-button>
					</template>
				</v-info>
				<v-info
					v-else-if="aziendeList.length === 0"
					icon="info"
					title="Nessuna azienda"
					text="Non sono state trovate aziende nella collection clienti."
				/>
				<v-list v-else nav class="aziende-list">
					<v-list-item
						v-for="client in aziendeList"
						:key="client.id"
						class="azienda-item"
						:class="{ 'azienda-item--active': selectedClientId === client.id }"
						@click="selectAzienda(client)"
					>
						<v-list-item-icon>
							<v-icon :name="selectedClientId === client.id ? 'check_circle' : 'business'" />
						</v-list-item-icon>
						<v-list-item-content>
							<v-list-item-title>{{ client.azienda || 'Senza nome' }}</v-list-item-title>
						</v-list-item-content>
						<v-list-item-icon v-if="selectedClientId === client.id">
							<v-icon name="check" />
						</v-list-item-icon>
					</v-list-item>
				</v-list>
				<div v-if="selectedAziendaLabel" class="selected-azienda-info">
					<div class="selected-azienda-label">Azienda attualmente selezionata:</div>
					<div class="selected-azienda-name">
						<v-icon name="check_circle" />
						<span>{{ selectedAziendaLabel }}</span>
					</div>
				</div>
			</div>
		</v-drawer>

		<div class="approfondimenti-view">
			<div class="page-header">
				<div class="page-header-left">
					<h1 class="approfondimenti-view__title">Dashboard</h1>
				</div>
				<v-button
					v-tooltip="selectedAziendaLabel ? 'Cambia azienda' : 'Seleziona azienda'"
					:secondary="!!selectedAziendaLabel"
					:type="selectedAziendaLabel ? 'secondary' : 'primary'"
					class="azienda-select-button"
					@click="drawerOpen = true"
				>
					<v-icon name="business" left />
					<span class="azienda-button-text">{{ selectedAziendaLabel || 'Seleziona azienda' }}</span>
					<v-icon name="arrow_drop_down" right />
				</v-button>
			</div>

			<div v-if="!selectedClientId" class="chart-empty chart-empty--prompt">
				<v-icon name="business" class="chart-empty-icon" />
				<span>Seleziona un'azienda per vedere il diagramma dei minuti.</span>
			</div>
			<div v-else-if="chartLoading" class="chart-loading">
				<v-progress-circular indeterminate />
				<span>Caricamento...</span>
			</div>
			<div v-else-if="chartError" class="chart-error">
				<v-icon name="error" />
				<span>{{ chartError }}</span>
			</div>
			<div v-else-if="chartTotal === 0" class="chart-empty">
				Nessun dato minuti per questa azienda.
			</div>
			<div v-else class="chart-container">
				<!-- Card Minuti: totali, rimanenti, usati (stile dashboard) -->
				<div class="minuti-kpi-card">
					<div class="minuti-kpi-title">Minuti</div>
					<div class="minuti-kpi-columns">
						<div class="minuti-kpi-col">
							<div class="minuti-kpi-label">Rimanenti</div>
							<div class="minuti-kpi-value minuti-kpi-value--teal">{{ formatMinuti(chartData.minuti_rimanenti) }}</div>
						</div>
						<div class="minuti-kpi-col">
							<div class="minuti-kpi-label">Totali</div>
							<div class="minuti-kpi-value">{{ formatMinuti(chartData.minuti_totali) }}</div>
						</div>
						<div class="minuti-kpi-col">
							<div class="minuti-kpi-label">Usati</div>
							<div class="minuti-kpi-value">{{ formatMinuti(chartData.minuti_usati) }}</div>
						</div>
					</div>
				</div>

				<!-- Diagramma a torta: solo rimanenti e usati, con percentuali nelle fette -->
				<div class="pie-wrapper" :class="{ 'pie-has-hover': pieHoveredIndex != null }" ref="pieWrapRef">
					<svg
						class="pie-chart"
						viewBox="0 0 200 200"
						xmlns="http://www.w3.org/2000/svg"
						@mousemove="onPieMouseMove"
						@mouseleave="pieHoveredIndex = null"
					>
						<g transform="translate(100, 100)">
							<path
								v-for="(slice, i) in pieSlices"
								:key="i"
								:d="slice.path"
								:fill="slice.color"
								:stroke="pieHoveredIndex === i ? '#fff' : 'none'"
								:stroke-width="pieHoveredIndex === i ? 3 : 0"
								class="pie-slice"
								:class="{ 'pie-slice--hover': pieHoveredIndex === i }"
								@mouseenter="onPieSliceEnter($event, i)"
								@mouseleave="pieHoveredIndex = null"
							/>
							<text
								v-for="(slice, i) in pieSlices"
								:key="'label-' + i"
								:x="slice.labelX"
								:y="slice.labelY"
								class="pie-slice-label"
								text-anchor="middle"
								dominant-baseline="middle"
								pointer-events="none"
							>{{ slice.percent }}%</text>
						</g>
					</svg>
					<div
						v-if="pieTooltipSlice"
						class="pie-tooltip"
						:style="{ left: pieTooltipX + 'px', top: pieTooltipY + 'px' }"
					>
						<div class="pie-tooltip-label">{{ pieTooltipSlice.label }}</div>
						<div class="pie-tooltip-value">{{ formatMinuti(pieTooltipSlice.value) }} min</div>
						<div class="pie-tooltip-percent">{{ pieTooltipSlice.percent }}%</div>
					</div>
				</div>
			</div>

			<!-- Sezione dati filtrati per date (Chiamate + Prenotazioni) -->
			<div v-if="selectedClientId && !chartLoading && !chartError && chartTotal > 0" class="date-filtered-section">
				<div class="date-filter-bar">
					<h2 class="date-filter-title">Seleziona un periodo:</h2>
					<div class="filter-row">
						<div class="filter-group">
							<label class="filter-label">
								<v-icon name="event" class="filter-label-icon" />
								<span>Dal:</span>
							</label>
							<div ref="dateStartWrapRef" class="date-input-wrap" @click="openCustomCalendar('start')">
								<span class="date-input-display">{{ formatDateItalian(filterDateStart) }}</span>
								<input
									ref="dateStartInputRef"
									v-model="filterDateStart"
									type="date"
									class="date-input-native"
									:max="filterDateEnd || undefined"
									title="Scegli data"
								/>
								<button
									type="button"
									class="date-input-calendar-btn"
									aria-label="Apri calendario"
									@click.stop="openCustomCalendar('start')"
								>
									<v-icon name="calendar_today" />
								</button>
								<button
									v-if="filterDateStart"
									type="button"
									class="date-input-clear"
									aria-label="Cancella data"
									@click.stop="filterDateStart = ''"
								>
									<v-icon name="close" />
								</button>
							</div>
						</div>
						<div class="filter-group">
							<label class="filter-label">
								<v-icon name="event" class="filter-label-icon" />
								<span>Fino al:</span>
							</label>
							<div ref="dateEndWrapRef" class="date-input-wrap" @click="openCustomCalendar('end')">
								<span class="date-input-display">{{ formatDateItalian(filterDateEnd) }}</span>
								<input
									ref="dateEndInputRef"
									v-model="filterDateEnd"
									type="date"
									class="date-input-native"
									:min="filterDateStart || undefined"
									title="Scegli data"
								/>
								<button
									type="button"
									class="date-input-calendar-btn"
									aria-label="Apri calendario"
									@click.stop="openCustomCalendar('end')"
								>
									<v-icon name="calendar_today" />
								</button>
								<button
									v-if="filterDateEnd"
									type="button"
									class="date-input-clear"
									aria-label="Cancella data"
									@click.stop="filterDateEnd = ''"
								>
									<v-icon name="close" />
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Calendario custom: backdrop poi popover sopra -->
				<div v-if="calendarOpen" class="calendar-backdrop" @click="calendarOpen = null" />
				<div
					v-if="calendarOpen"
					ref="calendarPopoverRef"
					class="calendar-popover"
					:style="calendarPopoverStyle"
					@click.stop
				>
					<div class="calendar-popover-header">
						<button type="button" class="calendar-nav" aria-label="Mese precedente" @click="calendarPrevMonth">
							<v-icon name="chevron_left" />
						</button>
						<span class="calendar-month-label">{{ calendarMonthLabel }}</span>
						<button type="button" class="calendar-nav" aria-label="Mese successivo" @click="calendarNextMonth">
							<v-icon name="chevron_right" />
						</button>
					</div>
					<div class="calendar-weekdays">
						<span v-for="w in weekdays" :key="w" class="calendar-weekday">{{ w }}</span>
					</div>
					<div class="calendar-grid">
						<button
							v-for="(cell, i) in calendarGrid"
							:key="i"
							type="button"
							class="calendar-day"
							:class="{
								'calendar-day--other': !cell.isCurrentMonth,
								'calendar-day--selected': cell.isSelected,
								'calendar-day--today': cell.isToday,
								'calendar-day--disabled': cell.isDisabled,
							}"
							:disabled="cell.isDisabled"
							@click="selectCalendarDate(cell)"
						>
							{{ cell.day }}
						</button>
					</div>
					<button type="button" class="calendar-now-btn" @click="setCalendarToToday">
						Imposta ad adesso
					</button>
				</div>

				<!-- Sezione Chiamate: numero, tempo medio, grafico chiamate per data -->
				<div class="chiamate-section">
					<div class="chiamate-kpi-card">
						<div class="chiamate-kpi-title">Chiamate</div>
						<div class="chiamate-kpi-columns">
							<div class="chiamate-kpi-col">
								<div class="chiamate-kpi-label">Numero chiamate</div>
								<div class="chiamate-kpi-value">{{ numeroChiamate }}</div>
							</div>
							<div class="chiamate-kpi-col">
								<div class="chiamate-kpi-label">Tempo medio (min)</div>
								<div class="chiamate-kpi-value minuti-kpi-value--teal">{{ formatTempoMedio(tempoMedioChiamate) }}</div>
							</div>
						</div>
					</div>
					<div class="chiamate-chart-wrapper">
						<div class="chiamate-chart-header">
							<div class="chiamate-chart-title">Grafico numero chiamate</div>
						</div>
						<div v-if="chiamateLoading" class="chiamate-chart-loading">
							<v-progress-circular indeterminate small />
							<span>Caricamento...</span>
						</div>
						<div v-else-if="filteredCallsByDate.length === 0" class="chiamate-chart-empty">
							Nessuna chiamata per questa azienda nel periodo.
						</div>
						<div v-else ref="chartWrapRef" class="chiamate-chart-svg-wrap">
							<svg
								class="chiamate-chart"
								:viewBox="`0 0 ${chartWidth} ${chartHeight}`"
								preserveAspectRatio="xMidYMid meet"
								@mousemove="onChartMouseMove"
								@mouseleave="onChartMouseLeave"
							>
							<g class="chart-line-group">
								<path :d="chartAreaPath" class="chart-area" />
								<path
									:d="chartLinePath"
									class="chart-line"
									fill="none"
									stroke="#5e72e4"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<circle
									v-for="(point, i) in chartPoints"
									:key="i"
									:cx="point.cx"
									:cy="point.y"
									r="4"
									class="chart-line-point"
								/>
							</g>
							<g class="chart-labels-x">
								<text
									v-for="(point, i) in visibleXLabels"
									:key="'x-' + i"
									:x="point.cx"
									:y="chartHeight - marginBottom + 14"
									:transform="`rotate(-40, ${point.cx}, ${chartHeight - marginBottom + 14})`"
									class="chart-tick-label chart-tick-label-x"
									text-anchor="end"
								>{{ point.dateLabel }}</text>
							</g>
							<g class="chart-labels-y">
								<text
									v-for="tick in yTicks"
									:key="tick"
									:x="marginLeft - 4"
									:y="chartHeight - marginBottom - (tick / chartYScaleMax) * chartPlotHeight + 4"
									class="chart-tick-label chart-tick-label-y"
									text-anchor="end"
								>{{ tick }}</text>
							</g>
							</svg>
							<div
								v-if="tooltipPoint"
								class="chart-tooltip"
								:style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
							>
								<div class="chart-tooltip-date">{{ tooltipPoint.dateFull }}</div>
								<div class="chart-tooltip-row">
									<span class="chart-tooltip-label">Chiamate</span>
									<span class="chart-tooltip-value">{{ tooltipPoint.count }}</span>
								</div>
							</div>
							<p class="chiamate-chart-hint">Scorrendo con il mouse sul grafico puoi vedere i dettagli per data.</p>
						</div>
					</div>
				</div>

				<!-- Grafico Prenotazioni (SI/NO) - sotto il grafico a linee -->
				<div class="prenotazioni-section">
					<div class="prenotazioni-card">
						<div class="prenotazioni-title">Prenotazioni</div>
						<div v-if="prenotazioniDonutSlices.length === 0" class="prenotazioni-empty">
							Nessuna chiamata nel periodo per mostrare le prenotazioni.
						</div>
						<div v-else ref="prenotazioniWrapRef" class="prenotazioni-chart-row" :class="{ 'prenotazioni-has-hover': prenotazioniHoveredIndex != null }">
							<svg
								class="prenotazioni-donut"
								viewBox="0 0 200 200"
								xmlns="http://www.w3.org/2000/svg"
								@mousemove="onPrenotazioniMouseMove"
								@mouseleave="prenotazioniHoveredIndex = null"
							>
								<g transform="translate(100, 100)">
									<path
										v-for="(slice, i) in prenotazioniDonutSlices"
										:key="i"
										:d="slice.path"
										:fill="slice.color"
										:stroke="prenotazioniHoveredIndex === i ? '#fff' : 'none'"
										:stroke-width="prenotazioniHoveredIndex === i ? 3 : 0"
										class="prenotazioni-slice"
										:class="{ 'prenotazioni-slice--hover': prenotazioniHoveredIndex === i }"
										@mouseenter="onPrenotazioniSliceEnter($event, i)"
										@mouseleave="prenotazioniHoveredIndex = null"
									/>
									<text
										v-for="(slice, i) in prenotazioniDonutSlices"
										:key="'pct-' + i"
										:x="slice.labelX"
										:y="slice.labelY"
										class="prenotazioni-slice-label"
										text-anchor="middle"
										dominant-baseline="middle"
										pointer-events="none"
									>{{ slice.percent }}%</text>
								</g>
							</svg>
							<div
								v-if="prenotazioniTooltipSlice"
								class="pie-tooltip prenotazioni-tooltip"
								:style="{ left: prenotazioniTooltipX + 'px', top: prenotazioniTooltipY + 'px' }"
							>
								<div class="pie-tooltip-label">{{ prenotazioniTooltipSlice.label }}</div>
								<div class="pie-tooltip-value">{{ prenotazioniTooltipSlice.value }} chiamate</div>
								<div class="pie-tooltip-percent">{{ prenotazioniTooltipSlice.percent }}%</div>
							</div>
							<div class="prenotazioni-legend">
								<div
									v-for="(slice, i) in prenotazioniDonutSlices"
									:key="i"
									class="prenotazioni-legend-item"
								>
									<span class="prenotazioni-legend-dot" :style="{ background: slice.color }" />
									<span class="prenotazioni-legend-label">{{ slice.label }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</private-view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();
const COLLECTION_NAME = 'clienti';
const COLLECTION_CHIAMATE = 'Chiamate';
const STORAGE_KEY = 'insights_selected_client_id';

const drawerOpen = ref(false);
const aziendeList = ref([]);
const aziendeLoading = ref(false);
const aziendeError = ref(null);
const selectedClientId = ref(null);

const chartData = ref({ minuti_totali: 0, minuti_rimanenti: 0, minuti_usati: 0 });
const chartLoading = ref(true);
const chartError = ref(null);

const chiamateList = ref([]);
const chiamateLoading = ref(false);
const chiamateError = ref(null);

function getTodayISO() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MESI_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
function formatDateItalian(isoDate) {
	if (!isoDate || typeof isoDate !== 'string') return '';
	const [y, m, d] = isoDate.split('-').map(Number);
	if (!y || !m || !d) return '';
	const monthName = MESI_IT[m - 1];
	if (!monthName) return isoDate;
	return `${d} ${monthName} ${y}`;
}

const filterDateStart = ref('');
const filterDateEnd = ref(getTodayISO());
const dateStartInputRef = ref(null);
const dateEndInputRef = ref(null);
const dateStartWrapRef = ref(null);
const dateEndWrapRef = ref(null);
const calendarPopoverRef = ref(null);

const calendarOpen = ref(null);
const calendarViewMonth = ref(new Date().getMonth());
const calendarViewYear = ref(new Date().getFullYear());

const weekdays = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

const calendarMonthLabel = computed(() => {
	const m = calendarViewMonth.value;
	const y = calendarViewYear.value;
	return `${MESI_IT[m]} ${y}`;
});

const calendarPopoverStyle = computed(() => {
	const wrap = calendarOpen.value === 'start' ? dateStartWrapRef.value : dateEndWrapRef.value;
	if (!wrap) return { left: '0', top: '0' };
	const rect = wrap.getBoundingClientRect();
	return {
		left: `${rect.left}px`,
		top: `${rect.bottom + 4}px`,
	};
});

const calendarGrid = computed(() => {
	const year = calendarViewYear.value;
	const month = calendarViewMonth.value;
	const first = new Date(year, month, 1);
	const startWeekday = first.getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const isStart = calendarOpen.value === 'start';
	const minISO = isStart ? null : (filterDateStart.value || null);
	const maxISO = isStart ? (filterDateEnd.value || null) : null;
	const selectedISO = isStart ? filterDateStart.value : filterDateEnd.value;
	const today = new Date();
	const todayISO = getTodayISO();
	const cells = [];
	for (let i = 0; i < startWeekday; i++) {
		const d = new Date(year, month, -startWeekday + i + 1);
		cells.push(makeCell(d.getDate(), d.getMonth(), d.getFullYear(), false, selectedISO, todayISO, minISO, maxISO));
	}
	for (let day = 1; day <= daysInMonth; day++) {
		cells.push(makeCell(day, month, year, true, selectedISO, todayISO, minISO, maxISO));
	}
	const remaining = 42 - cells.length;
	for (let day = 1; day <= remaining; day++) {
		const d = new Date(year, month + 1, day);
		cells.push(makeCell(d.getDate(), d.getMonth(), d.getFullYear(), false, selectedISO, todayISO, minISO, maxISO));
	}
	return cells;
});

function makeCell(day, month, year, isCurrentMonth, selectedISO, todayISO, minISO, maxISO) {
	const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	const isSelected = selectedISO === iso;
	const isToday = todayISO === iso;
	const isDisabled = (minISO && iso < minISO) || (maxISO && iso > maxISO);
	return { day, month, year, isCurrentMonth, isSelected, isToday, isDisabled, iso };
}

function openCustomCalendar(which) {
	calendarOpen.value = which;
	const iso = which === 'start' ? filterDateStart.value : filterDateEnd.value;
	if (iso) {
		const [y, m] = iso.split('-').map(Number);
		calendarViewMonth.value = m - 1;
		calendarViewYear.value = y;
	} else {
		const now = new Date();
		calendarViewMonth.value = now.getMonth();
		calendarViewYear.value = now.getFullYear();
	}
}

function calendarPrevMonth() {
	if (calendarViewMonth.value === 0) {
		calendarViewMonth.value = 11;
		calendarViewYear.value -= 1;
	} else {
		calendarViewMonth.value -= 1;
	}
}

function calendarNextMonth() {
	if (calendarViewMonth.value === 11) {
		calendarViewMonth.value = 0;
		calendarViewYear.value += 1;
	} else {
		calendarViewMonth.value += 1;
	}
}

function selectCalendarDate(cell) {
	if (cell.isDisabled) return;
	const iso = cell.iso;
	if (calendarOpen.value === 'start') filterDateStart.value = iso;
	else filterDateEnd.value = iso;
	calendarOpen.value = null;
}

function setCalendarToToday() {
	const iso = getTodayISO();
	if (calendarOpen.value === 'start') filterDateStart.value = iso;
	else filterDateEnd.value = iso;
	calendarOpen.value = null;
}

const chartWrapRef = ref(null);
const chartHoveredIndex = ref(null);
const tooltipX = ref(0);
const tooltipY = ref(0);

const drawerTitle = computed(() => 'Azienda');
const selectedAziendaLabel = computed(() => {
	if (!selectedClientId.value) return null;
	const c = aziendeList.value.find((x) => x.id === selectedClientId.value);
	return c?.azienda ?? null;
});

function toNum(v) {
	const n = Number(v);
	return Number.isFinite(n) ? Math.max(0, n) : 0;
}

async function loadAziende() {
	aziendeLoading.value = true;
	aziendeError.value = null;
	try {
		const response = await api.get(`/items/${COLLECTION_NAME}`, {
			params: { fields: ['id', 'azienda'], limit: -1 },
		});
		const items = response.data?.data ?? response.data ?? [];
		const list = Array.isArray(items) ? items : [];
		const withName = list
			.filter((item) => item?.id != null)
			.map((item) => ({ id: item.id, azienda: item?.azienda != null ? String(item.azienda).trim() : '' }));
		aziendeList.value = withName.sort((a, b) => (a.azienda || '').localeCompare(b.azienda || ''));
		if (aziendeList.value.length > 0 && !selectedClientId.value) {
			const saved = localStorage.getItem(STORAGE_KEY);
			const id = saved != null && saved !== '' ? (Number(saved) || saved) : null;
			if (id != null && aziendeList.value.some((c) => c.id === id)) selectedClientId.value = id;
			else selectedClientId.value = aziendeList.value[0].id;
		}
	} catch (e) {
		const msg = e?.response?.data?.errors?.[0]?.message || e?.message || 'Errore caricamento aziende.';
		aziendeError.value = { title: 'Errore', message: msg };
		aziendeList.value = [];
	} finally {
		aziendeLoading.value = false;
	}
}

function selectAzienda(client) {
	if (!client || client.id == null) return;
	selectedClientId.value = client.id;
	localStorage.setItem(STORAGE_KEY, String(client.id));
	drawerOpen.value = false;
	loadChartData();
	loadChiamateData();
}

async function loadChartData() {
	if (selectedClientId.value == null) {
		chartData.value = { minuti_totali: 0, minuti_rimanenti: 0, minuti_usati: 0 };
		chartLoading.value = false;
		return;
	}
	chartLoading.value = true;
	chartError.value = null;
	try {
		const response = await api.get(`/items/${COLLECTION_NAME}`, {
			params: {
				fields: ['minuti_totali', 'minuti_rimanenti', 'minuti_usati'],
				filter: { id: { _eq: selectedClientId.value } },
				limit: 1,
			},
		});
		const items = response.data?.data ?? response.data ?? [];
		const item = Array.isArray(items) ? items[0] : items;
		if (!item) {
			chartData.value = { minuti_totali: 0, minuti_rimanenti: 0, minuti_usati: 0 };
			return;
		}
		chartData.value = {
			minuti_totali: toNum(item.minuti_totali),
			minuti_rimanenti: toNum(item.minuti_rimanenti),
			minuti_usati: toNum(item.minuti_usati),
		};
	} catch (e) {
		chartError.value =
			e?.response?.data?.errors?.[0]?.message ||
			e?.message ||
			'Errore nel caricamento. Verifica permessi sulla collection Clienti.';
		chartData.value = { minuti_totali: 0, minuti_rimanenti: 0, minuti_usati: 0 };
	} finally {
		chartLoading.value = false;
	}
}

async function loadChiamateData() {
	if (!selectedAziendaLabel.value) {
		chiamateList.value = [];
		return;
	}
	chiamateLoading.value = true;
	chiamateError.value = null;
	try {
		const response = await api.get(`/items/${COLLECTION_CHIAMATE}`, {
			params: {
				fields: ['date_created', 'durata_minuti', 'prenotazione_effettuata'],
				filter: { azienda: { _eq: selectedAziendaLabel.value } },
				limit: -1,
				sort: 'date_created',
			},
		});
		const raw = response.data?.data ?? response.data ?? [];
		chiamateList.value = Array.isArray(raw) ? raw : [];
		if (chiamateList.value.length > 0) {
			const dates = chiamateList.value.map((item) => getDateFromItem(item)).filter(Boolean);
			if (dates.length > 0) {
				const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
				filterDateStart.value = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`;
			}
		}
	} catch (e) {
		chiamateError.value = e?.response?.data?.errors?.[0]?.message || e?.message || 'Errore caricamento Chiamate.';
		chiamateList.value = [];
	} finally {
		chiamateLoading.value = false;
	}
}

const chartTotal = computed(() => {
	const d = chartData.value;
	return d.minuti_totali + d.minuti_rimanenti + d.minuti_usati;
});

function formatMinuti(n) {
	const v = Number(n);
	if (!Number.isFinite(v)) return '0';
	return Math.round(v) === v ? String(Math.round(v)) : v.toFixed(2);
}

const COLORS = ['#2dce89', '#f5365c'];

function describeArc(cx, cy, r, startAngle, endAngle) {
	const start = polarToCartesian(cx, cy, r, startAngle);
	const end = polarToCartesian(cx, cy, r, endAngle);
	const sweepAngle = endAngle - startAngle;
	const largeArc = sweepAngle <= 180 ? 0 : 1;
	return ['M', cx, cy, 'L', start.x, start.y, 'A', r, r, 0, largeArc, 1, end.x, end.y, 'Z'].join(' ');
}

function polarToCartesian(cx, cy, r, angleDeg) {
	const rad = ((angleDeg - 90) * Math.PI) / 180;
	return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const PIE_LABELS = ['Minuti rimanenti', 'Minuti usati'];

const pieSlices = computed(() => {
	const d = chartData.value;
	const rimanenti = toNum(d.minuti_rimanenti);
	const usati = toNum(d.minuti_usati);
	const pieTotal = rimanenti + usati;
	if (pieTotal === 0) return [];
	const items = [
		{ value: rimanenti, label: PIE_LABELS[0] },
		{ value: usati, label: PIE_LABELS[1] },
	].filter((item) => item.value > 0);
	if (items.length === 0) return [];
	const r = 80;
	const labelRadius = 48;
	const cx = 0;
	const cy = 0;
	let start = 0;
	return items.map((item, i) => {
		const ratio = item.value / pieTotal;
		const angle = 360 * ratio;
		const isLast = i === items.length - 1;
		const end = isLast ? 360 : start + angle;
		const path = describeArc(cx, cy, r, start, end);
		const midAngle = (start + end) / 2;
		const pos = polarToCartesian(cx, cy, labelRadius, midAngle);
		start = end;
		return {
			path,
			label: item.label,
			value: item.value,
			percent: (100 * ratio).toFixed(1),
			color: COLORS[i % COLORS.length],
			labelX: pos.x,
			labelY: pos.y,
		};
	});
});

const pieWrapRef = ref(null);
const pieHoveredIndex = ref(null);
const pieTooltipX = ref(0);
const pieTooltipY = ref(0);

const pieTooltipSlice = computed(() => {
	const idx = pieHoveredIndex.value;
	if (idx == null) return null;
	const slices = pieSlices.value;
	return slices[idx] ?? null;
});

function onPieSliceEnter(ev, i) {
	pieHoveredIndex.value = i;
	if (pieWrapRef.value) {
		const rect = pieWrapRef.value.getBoundingClientRect();
		pieTooltipX.value = ev.clientX - rect.left;
		pieTooltipY.value = ev.clientY - rect.top;
	}
}

function onPieMouseMove(ev) {
	if (pieWrapRef.value && pieHoveredIndex.value != null) {
		const rect = pieWrapRef.value.getBoundingClientRect();
		pieTooltipX.value = ev.clientX - rect.left;
		pieTooltipY.value = ev.clientY - rect.top;
	}
}

const filteredChiamateForKpi = computed(() => {
	const list = chiamateList.value;
	const start = filterDateStart.value ? filterDateStart.value.replace(/-/g, '') : null;
	const end = filterDateEnd.value ? filterDateEnd.value.replace(/-/g, '') : null;
	if (!start && !end) return list;
	return list.filter((item) => {
		const d = getDateFromItem(item);
		if (!d) return false;
		const key = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
		if (start && key < start) return false;
		if (end && key > end) return false;
		return true;
	});
});

function normalizePrenotazione(value) {
	const s = String(value ?? '').trim().toUpperCase();
	if (s === 'SI' || s === 'SÌ' || s === 'YES' || s === 'Y' || s === '1' || s === 'TRUE') return 'SI';
	if (s === 'NO' || s === 'N' || s === '0' || s === 'FALSE') return 'NO';
	return s || 'NO';
}

const prenotazioniCounts = computed(() => {
	const list = filteredChiamateForKpi.value;
	const counts = { SI: 0, NO: 0 };
	for (const item of list) {
		const v = normalizePrenotazione(item?.prenotazione_effettuata);
		if (v === 'SI') counts.SI += 1;
		else counts.NO += 1;
	}
	return counts;
});

const PRENOTAZIONI_COLORS = { SI: '#0d9488', NO: '#67e8f9' };

function describeDonutArc(cx, cy, ri, ro, startAngle, endAngle) {
	const so = polarToCartesian(cx, cy, ro, startAngle);
	const eo = polarToCartesian(cx, cy, ro, endAngle);
	const ei = polarToCartesian(cx, cy, ri, endAngle);
	const si = polarToCartesian(cx, cy, ri, startAngle);
	const large = endAngle - startAngle > 180 ? 1 : 0;
	return [
		'M', so.x, so.y,
		'A', ro, ro, 0, large, 1, eo.x, eo.y,
		'L', ei.x, ei.y,
		'A', ri, ri, 0, large, 0, si.x, si.y,
		'Z',
	].join(' ');
}

const prenotazioniDonutSlices = computed(() => {
	const { SI, NO } = prenotazioniCounts.value;
	const total = SI + NO;
	if (total === 0) return [];
	const ri = 45;
	const ro = 80;
	const cx = 0;
	const cy = 0;
	const labelRadius = (ri + ro) / 2;
	const items = [
		{ label: 'NO', value: NO },
		{ label: 'SI', value: SI },
	].filter((item) => item.value > 0);
	if (items.length === 0) return [];
	let start = 0;
	return items.map((item, i) => {
		const ratio = item.value / total;
		const angle = 360 * ratio;
		const isLast = i === items.length - 1;
		const end = isLast ? 360 : start + angle;
		const path = describeDonutArc(cx, cy, ri, ro, start, end);
		const midAngle = (start + end) / 2;
		const pos = polarToCartesian(cx, cy, labelRadius, midAngle);
		start = end;
		return {
			path,
			label: item.label,
			value: item.value,
			percent: (100 * ratio).toFixed(0),
			color: PRENOTAZIONI_COLORS[item.label] || '#94a3b8',
			labelX: pos.x,
			labelY: pos.y,
		};
	});
});

const prenotazioniWrapRef = ref(null);
const prenotazioniHoveredIndex = ref(null);
const prenotazioniTooltipX = ref(0);
const prenotazioniTooltipY = ref(0);

const prenotazioniTooltipSlice = computed(() => {
	const idx = prenotazioniHoveredIndex.value;
	if (idx == null) return null;
	const slices = prenotazioniDonutSlices.value;
	return slices[idx] ?? null;
});

function onPrenotazioniSliceEnter(ev, i) {
	prenotazioniHoveredIndex.value = i;
	if (prenotazioniWrapRef.value) {
		const rect = prenotazioniWrapRef.value.getBoundingClientRect();
		prenotazioniTooltipX.value = ev.clientX - rect.left;
		prenotazioniTooltipY.value = ev.clientY - rect.top;
	}
}

function onPrenotazioniMouseMove(ev) {
	if (prenotazioniWrapRef.value && prenotazioniHoveredIndex.value != null) {
		const rect = prenotazioniWrapRef.value.getBoundingClientRect();
		prenotazioniTooltipX.value = ev.clientX - rect.left;
		prenotazioniTooltipY.value = ev.clientY - rect.top;
	}
}

const numeroChiamate = computed(() => filteredChiamateForKpi.value.length);

const tempoMedioChiamate = computed(() => {
	const list = filteredChiamateForKpi.value;
	if (list.length === 0) return 0;
	let sum = 0;
	let count = 0;
	for (const item of list) {
		const d = Number(item?.durata_minuti);
		if (Number.isFinite(d) && d >= 0) {
			sum += d;
			count += 1;
		}
	}
	return count === 0 ? 0 : sum / count;
});

function formatTempoMedio(n) {
	const v = Number(n);
	if (!Number.isFinite(v) || v === 0) return '0';
	return Math.round(v * 100) / 100 === Math.round(v) ? String(Math.round(v)) : v.toFixed(2);
}

function getDateFromItem(item) {
	const raw = item?.date_created ?? item?.data_chiamata ?? item?.data ?? item?.created_at;
	if (!raw) return null;
	const d = new Date(raw);
	return Number.isNaN(d.getTime()) ? null : d;
}

const callsByDate = computed(() => {
	const list = chiamateList.value;
	const byDate = new Map();
	for (const item of list) {
		const d = getDateFromItem(item);
		if (!d) continue;
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		byDate.set(key, (byDate.get(key) || 0) + 1);
	}
	const entries = Array.from(byDate.entries())
		.map(([date, count]) => ({ date, count }))
		.sort((a, b) => a.date.localeCompare(b.date));
	return entries;
});

const filteredCallsByDate = computed(() => {
	const data = callsByDate.value;
	const start = filterDateStart.value ? filterDateStart.value.replace(/-/g, '') : null;
	const end = filterDateEnd.value ? filterDateEnd.value.replace(/-/g, '') : null;
	if (!start && !end) return data;
	return data.filter(({ date }) => {
		const d = date.replace(/-/g, '');
		if (start && d < start) return false;
		if (end && d > end) return false;
		return true;
	});
});

function formatDateShort(isoDate) {
	if (!isoDate || isoDate.length < 10) return isoDate;
	const [y, m, d] = isoDate.split('-');
	return `${d}/${m}`;
}

const chartWidth = 640;
const chartHeight = 240;
const marginBottom = 52;
const marginLeft = 44;
const chartPlotHeight = chartHeight - marginBottom - 16;
const chartPlotWidth = chartWidth - marginLeft - 16;

const chartYMax = computed(() => {
	const data = filteredCallsByDate.value;
	if (data.length === 0) return 1;
	const max = Math.max(...data.map((d) => d.count));
	return max < 1 ? 1 : max;
});

function roundScaleMax(max) {
	if (max <= 1) return 1;
	if (max <= 5) return 5;
	if (max <= 10) return 10;
	if (max <= 20) return 20;
	if (max <= 50) return Math.ceil(max / 10) * 10;
	if (max <= 100) return Math.ceil(max / 20) * 20;
	return Math.ceil(max / 50) * 50;
}

const chartYScaleMax = computed(() => roundScaleMax(chartYMax.value));

const yTicks = computed(() => {
	const scaleMax = chartYScaleMax.value;
	const step = scaleMax <= 5 ? 1 : scaleMax <= 20 ? 2 : scaleMax <= 50 ? 5 : scaleMax <= 100 ? 10 : 20;
	const arr = [];
	for (let v = 0; v <= scaleMax; v += step) arr.push(v);
	if (arr[arr.length - 1] !== scaleMax && scaleMax <= 20) arr.push(scaleMax);
	return arr.length > 8 ? arr.filter((_, i) => i % 2 === 0 || i === arr.length - 1) : arr;
});

const chartPoints = computed(() => {
	const data = filteredCallsByDate.value;
	const w = chartPlotWidth;
	const h = chartPlotHeight;
	const scaleMax = chartYScaleMax.value;
	if (data.length === 0) return [];
	const plotSpan = chartWidth - marginLeft - 8;
	const step = data.length === 1 ? 0 : plotSpan / (data.length - 1);
	return data.map((point, i) => {
		const cx = marginLeft + i * step;
		const lineH = scaleMax > 0 ? (point.count / scaleMax) * h : 0;
		const y = chartHeight - marginBottom - lineH;
		return {
			cx,
			y,
			dateLabel: formatDateShort(point.date),
		};
	});
});

const visibleXLabels = computed(() => {
	const points = chartPoints.value;
	if (points.length <= 15) return points;
	const step = points.length <= 25 ? 2 : 3;
	return points.filter((_, i) => i % step === 0 || i === points.length - 1);
});

const chartLinePath = computed(() => {
	const points = chartPoints.value;
	if (points.length === 0) return '';
	if (points.length === 1) return `M ${points[0].cx} ${points[0].y} h 0`;
	return points.map((p, i) => (i === 0 ? `M ${p.cx} ${p.y}` : `L ${p.cx} ${p.y}`)).join(' ');
});

const chartAreaPath = computed(() => {
	const points = chartPoints.value;
	const baseline = chartHeight - marginBottom;
	if (points.length === 0) return '';
	if (points.length === 1) return `M ${points[0].cx} ${baseline} L ${points[0].cx} ${points[0].y} L ${points[0].cx} ${baseline} Z`;
	const linePath = points.map((p, i) => (i === 0 ? `M ${p.cx} ${p.y}` : `L ${p.cx} ${p.y}`)).join(' ');
	const first = points[0];
	const last = points[points.length - 1];
	return `${linePath} L ${last.cx} ${baseline} L ${first.cx} ${baseline} Z`;
});

function formatDateFull(isoDate) {
	if (!isoDate || isoDate.length < 10) return isoDate;
	const d = new Date(isoDate + 'T12:00:00');
	if (Number.isNaN(d.getTime())) return isoDate;
	const day = d.getDate();
	const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
	const month = months[d.getMonth()];
	return `${day} ${month} ${d.getFullYear()}`;
}

const tooltipPoint = computed(() => {
	const idx = chartHoveredIndex.value;
	if (idx == null) return null;
	const data = filteredCallsByDate.value;
	const points = chartPoints.value;
	if (idx < 0 || idx >= data.length || idx >= points.length) return null;
	const point = data[idx];
	return {
		dateFull: formatDateFull(point.date),
		count: point.count,
	};
});

function onChartMouseMove(ev) {
	const points = chartPoints.value;
	if (points.length === 0) {
		chartHoveredIndex.value = null;
		return;
	}
	const svg = ev.currentTarget;
	const rect = svg.getBoundingClientRect();
	const x = ((ev.clientX - rect.left) / rect.width) * chartWidth;
	const idx = points.reduce(
		(best, p, i) => (Math.abs(p.cx - x) < Math.abs(points[best].cx - x) ? i : best),
		0
	);
	chartHoveredIndex.value = idx;
	const wrap = chartWrapRef.value;
	if (wrap) {
		const wrapRect = wrap.getBoundingClientRect();
		tooltipX.value = ev.clientX - wrapRect.left;
		tooltipY.value = ev.clientY - wrapRect.top - 44;
	}
}

function onChartMouseLeave() {
	chartHoveredIndex.value = null;
}

onMounted(async () => {
	await loadAziende();
	if (selectedClientId.value != null) {
		loadChartData();
		loadChiamateData();
	} else {
		chartLoading.value = false;
	}
});
</script>

<style scoped>
.page-header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 20px;
	width: 100%;
	max-width: 960px;
	margin: 0 auto 24px;
	padding: 0 0 16px;
	box-sizing: border-box;
}

.page-header-left {
	flex: 1;
	min-width: 0;
}

.nav-icon-approfondimenti {
	display: flex;
	align-items: center;
	justify-content: center;
}

.approfondimenti-view {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	width: 100%;
	max-width: 960px;
	margin: 0 auto;
	padding: 24px 32px 48px;
	box-sizing: border-box;
}

.approfondimenti-view__title {
	margin: 0 0 4px;
	font-size: 50px;
	font-weight: 600;
	color: var(--foreground, #1a1a1a);
	letter-spacing: -0.02em;
}

.approfondimenti-view__intro {
	margin: 0;
	font-size: 14px;
	line-height: 1.5;
	color: var(--foreground-subdued, #5f6368);
}

.azienda-select-button {
	font-size: 13px;
	font-weight: 600;
	flex-shrink: 0;
}

.azienda-select-button :deep(.v-button) {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 18px;
	min-height: 44px;
	border-radius: 10px;
	border: 1px solid var(--border-color-subdued, #e5e7eb);
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.azienda-select-button :deep(.v-button .v-icon) {
	flex-shrink: 0;
	width: 20px !important;
	height: 20px !important;
}

.azienda-button-text {
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	font-size: 13px;
}

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
	padding: 16px 20px;
	background: var(--background-subdued, #f8f9fa);
	border-radius: 12px;
	border: 1px solid var(--border-normal, #e8e8e8);
}

.drawer-header-title {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 15px;
	font-weight: 600;
	color: var(--foreground, #1a1a1a);
}

.drawer-loading {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 32px 20px;
	color: var(--foreground-subdued, #5f6368);
}

.aziende-list {
	flex: 1;
	overflow-y: auto;
}

.azienda-item {
	cursor: pointer;
	transition: all 0.2s ease;
	border-radius: 8px;
	margin-bottom: 4px;
}

.azienda-item:hover {
	background: var(--background-subdued, #f9fafb);
}

.azienda-item--active {
	background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
	border-radius: 8px;
	border: 1px solid var(--border-normal, #e8e8e8);
}

.azienda-item--active :deep(.v-list-item-content) {
	font-weight: 600;
}

.azienda-item--active :deep(.v-icon) {
	opacity: 0.9;
}

.selected-azienda-info {
	margin-top: auto;
	padding: 16px;
	background: var(--background-subdued, #f8f9fa);
	border-radius: 12px;
	border: 1px solid var(--border-normal, #e8e8e8);
}

.selected-azienda-label {
	font-size: 12px;
	color: var(--foreground-subdued, #5f6368);
	margin-bottom: 6px;
}

.selected-azienda-name {
	display: flex;
	align-items: center;
	gap: 8px;
	font-weight: 600;
	color: var(--foreground, #1a1a1a);
}

.chart-empty--prompt {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 48px 24px;
	color: var(--foreground-subdued, #5f6368);
}

.chart-empty-icon {
	opacity: 0.5;
	width: 48px;
	height: 48px;
}

.chart-loading,
.chart-error {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 32px;
	color: var(--foreground-subdued, #5f6368);
}

.chart-error {
	color: var(--danger, #e54d42);
}

.chart-empty {
	padding: 32px;
	text-align: center;
	color: var(--foreground-subdued, #5f6368);
}

.chart-container {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 28px;
	padding: 24px;
	background: var(--background-normal, #fff);
	border-radius: 12px;
	border: 1px solid var(--border-normal, #e8e8e8);
}

.minuti-kpi-card {
	width: 100%;
	padding: 20px 24px;
	background: var(--background-normal, #fff);
	border-radius: 12px;
	border: 1px solid var(--border-normal, #e8e8e8);
	box-sizing: border-box;
}

.minuti-kpi-title {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 30px;
	font-weight: 400;
	color: #9ca3af;
	letter-spacing: 0.01em;
	margin-bottom: 16px;
}

.minuti-kpi-columns {
	display: flex;
	flex-wrap: wrap;
	gap: 32px;
}

.minuti-kpi-col {
	flex: 1;
	min-width: 100px;
}

.minuti-kpi-label {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 14px;
	font-weight: 400;
	color: #6b7280;
	margin-bottom: 4px;
}

.minuti-kpi-value {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 28px;
	font-weight: 700;
	color: #363a42;
	letter-spacing: -0.02em;
	line-height: 1.2;
}

.minuti-kpi-value--teal {
	color: #24cc96;
}

.pie-wrapper {
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
}

.pie-tooltip {
	position: absolute;
	pointer-events: none;
	transform: translate(-50%, calc(-100% - 10px));
	min-width: 140px;
	padding: 10px 14px;
	background: var(--background-normal, #fff);
	border: 1px solid var(--border-normal, #e5e7eb);
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 13px;
	z-index: 10;
}

.pie-tooltip-label {
	font-weight: 600;
	color: var(--foreground, #1a1a1a);
	margin-bottom: 4px;
}

.pie-tooltip-value {
	color: var(--foreground-subdued, #6b7280);
	font-size: 14px;
}

.pie-tooltip-percent {
	font-weight: 600;
	color: var(--foreground, #1a1a1a);
	font-size: 14px;
	margin-top: 2px;
}

.pie-slice--hover {
	cursor: pointer;
	filter: brightness(1.15);
}

.pie-slice:not(.pie-slice--hover) {
	transition: opacity 0.15s ease;
}

.pie-wrapper.pie-has-hover .pie-slice:not(.pie-slice--hover) {
	opacity: 0.7;
}

.date-filtered-section {
	margin-top: 32px;
	padding-top: 28px;
	border-top: 1px solid var(--border-normal, #e8e8e8);
	width: 100%;
}

.date-filter-bar {
	background: var(--background-subdued, #f5f5f5);
	border-radius: 12px;
	border: 1px solid var(--border-normal, #e8e8e8);
	padding: 20px 24px;
	margin-bottom: 16px;
	box-sizing: border-box;
}

.date-filter-title {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 16px;
	font-weight: 700;
	color: var(--foreground, #363a42);
	text-align: center;
	margin: 0 0 20px 0;
}

.filter-row {
	display: flex;
	align-items: center;
	gap: 24px;
	flex-wrap: wrap;
	justify-content: center;
}

.filter-group {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.filter-label {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 14px;
	font-weight: 400;
	color: var(--foreground, #363a42);
	cursor: default;
	margin: 0;
}

.filter-label-icon {
	color: var(--foreground-subdued, #9ca3af);
	font-size: 18px;
}

.date-input-wrap {
	position: relative;
	display: inline-flex;
	align-items: center;
	min-width: 200px;
	height: 40px;
	padding: 0 12px 0 12px;
	background: var(--background-normal, #fff);
	border: 1px solid var(--border-normal, #d1d5db);
	border-radius: 8px;
	box-sizing: border-box;
	cursor: pointer;
}
.date-input-wrap:focus-within {
	border-color: var(--primary, #263238);
	outline: none;
	box-shadow: 0 0 0 2px rgba(38, 50, 56, 0.15);
}

.date-input-native {
	position: absolute;
	left: -9999px;
	width: 1px;
	height: 1px;
	opacity: 0;
	pointer-events: none;
}

.date-input-display {
	flex: 1;
	min-width: 0;
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 14px;
	color: var(--foreground, #363a42);
	user-select: none;
}

.date-input-calendar-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	margin: 0 4px;
	padding: 0;
	border: none;
	background: none;
	color: var(--foreground-subdued, #6b7280);
	cursor: pointer;
	border-radius: 6px;
	transition: color 0.15s, background 0.15s;
	flex-shrink: 0;
}
.date-input-calendar-btn:hover {
	color: var(--primary, #263238);
	background: var(--background-subdued, #f3f4f6);
}
.date-input-calendar-btn .v-icon {
	--v-icon-size: 20px;
}

.date-input-clear {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	margin-left: 4px;
	border: none;
	background: none;
	color: var(--foreground-subdued, #6b7280);
	cursor: pointer;
	border-radius: 4px;
	transition: color 0.15s, background 0.15s;
	flex-shrink: 0;
}

.date-input-clear:hover {
	color: var(--foreground, #1a1a1a);
	background: var(--background-subdued, #f3f4f6);
}

.date-input-clear .v-icon {
	--v-icon-size: 18px;
}

/* Calendario custom popover */
.calendar-backdrop {
	position: fixed;
	inset: 0;
	z-index: 50;
	background: transparent;
}

.calendar-popover {
	position: fixed;
	z-index: 51;
	min-width: 280px;
	padding: 12px;
	background: var(--background-normal, #fff);
	border: 1px solid var(--border-normal, #e5e7eb);
	border-radius: 8px;
	box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

.calendar-popover-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.calendar-nav {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border: none;
	background: none;
	color: var(--foreground-subdued, #6b7280);
	cursor: pointer;
	border-radius: 6px;
}
.calendar-nav:hover {
	background: var(--background-subdued, #f3f4f6);
	color: var(--foreground, #1a1a1a);
}
.calendar-nav .v-icon {
	--v-icon-size: 20px;
}

.calendar-month-label {
	font-size: 14px;
	font-weight: 700;
	color: var(--foreground, #363a42);
}

.calendar-weekdays {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 2px;
	margin-bottom: 8px;
	text-align: center;
}

.calendar-weekday {
	font-size: 11px;
	font-weight: 600;
	color: var(--foreground-subdued, #6b7280);
}

.calendar-grid {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 2px;
}

.calendar-day {
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 13px;
	border: none;
	border-radius: 6px;
	background: none;
	color: var(--foreground, #363a42);
	cursor: pointer;
}
.calendar-day:hover:not(.calendar-day--disabled) {
	background: var(--background-subdued, #f3f4f6);
}
.calendar-day--other {
	color: var(--foreground-subdued, #9ca3af);
}
.calendar-day--selected {
	background: var(--primary, #263238);
	color: #fff;
}
.calendar-day--today {
	font-weight: 700;
}
.calendar-day--selected.calendar-day--today {
	background: var(--primary, #263238);
	color: #fff;
}
.calendar-day--disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.calendar-now-btn {
	width: 100%;
	margin-top: 12px;
	padding: 8px 12px;
	font-size: 13px;
	font-weight: 500;
	color: var(--foreground-subdued, #6b7280);
	background: none;
	border: none;
	border-radius: 6px;
	cursor: pointer;
	text-align: center;
}
.calendar-now-btn:hover {
	background: var(--background-subdued, #f3f4f6);
	color: var(--foreground, #1a1a1a);
}

.prenotazioni-section {
	width: 100%;
	margin-top: 24px;
	padding-top: 24px;
	border-top: 1px solid var(--border-normal, #e8e8e8);
}

.prenotazioni-card {
	width: 100%;
	padding: 20px 24px;
	background: var(--background-normal, #fff);
	border-radius: 12px;
	border: 1px solid var(--border-normal, #e8e8e8);
	box-sizing: border-box;
}

.prenotazioni-title {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 16px;
	font-weight: 700;
	color: var(--foreground, #1a1a1a);
	margin-bottom: 20px;
}

.prenotazioni-chart-row {
	position: relative;
	display: flex;
	align-items: center;
	gap: 24px;
	flex-wrap: wrap;
}

.prenotazioni-tooltip {
	position: absolute;
	transform: translate(-50%, calc(-100% - 10px));
}

.prenotazioni-slice {
	transition: opacity 0.15s ease;
	cursor: default;
}

.prenotazioni-slice--hover {
	cursor: pointer;
	filter: brightness(1.15);
}

.prenotazioni-chart-row.prenotazioni-has-hover .prenotazioni-slice:not(.prenotazioni-slice--hover) {
	opacity: 0.7;
}

.prenotazioni-donut {
	width: 200px;
	height: 200px;
	flex-shrink: 0;
}

.prenotazioni-slice-label {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 14px;
	font-weight: 700;
	fill: #fff;
	pointer-events: none;
	user-select: none;
}

.prenotazioni-legend {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.prenotazioni-legend-item {
	display: flex;
	align-items: center;
	gap: 10px;
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 14px;
	font-weight: 600;
	color: var(--foreground, #1a1a1a);
}

.prenotazioni-legend-dot {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	flex-shrink: 0;
}

.prenotazioni-empty {
	padding: 24px;
	text-align: center;
	color: var(--foreground-subdued, #6b7280);
	font-size: 14px;
}

.pie-chart {
	width: 220px;
	height: 220px;
	flex-shrink: 0;
}

.pie-slice {
	transition: opacity 0.2s;
	cursor: default;
}

.pie-slice:hover {
	opacity: 0.9;
}

.pie-slice-label {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 14px;
	font-weight: 700;
	fill: #fff;
	pointer-events: none;
	user-select: none;
}

.chiamate-section {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 20px;
	margin-top: 8px;
	padding-top: 24px;
	border-top: 1px solid var(--border-normal, #e8e8e8);
}

.chiamate-kpi-card {
	width: 100%;
	padding: 20px 24px;
	background: var(--background-normal, #fff);
	border-radius: 12px;
	border: 1px solid var(--border-normal, #e8e8e8);
	box-sizing: border-box;
}

.chiamate-kpi-title {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 30px;
	font-weight: 400;
	color: #9ca3af;
	letter-spacing: 0.01em;
	margin-bottom: 16px;
}

.chiamate-kpi-columns {
	display: flex;
	flex-wrap: wrap;
	gap: 32px;
}

.chiamate-kpi-col {
	min-width: 120px;
}

.chiamate-kpi-label {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 14px;
	font-weight: 400;
	color: #6b7280;
	margin-bottom: 4px;
}

.chiamate-kpi-value {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 28px;
	font-weight: 700;
	color: #363a42;
	letter-spacing: -0.02em;
	line-height: 1.2;
}

.chiamate-chart-wrapper {
	width: 100%;
	padding: 20px;
	background: var(--background-subdued, #f9fafb);
	border-radius: 12px;
	border: 1px solid var(--border-normal, #e8e8e8);
	box-sizing: border-box;
}

.chiamate-chart-title {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 14px;
	font-weight: 600;
	color: var(--foreground, #1a1a1a);
	margin-bottom: 16px;
}

.chiamate-chart-loading,
.chiamate-chart-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 32px;
	color: var(--foreground-subdued, #5f6368);
	font-size: 14px;
}

.chiamate-chart-svg-wrap {
	position: relative;
	width: 100%;
	max-width: 640px;
}

.chiamate-chart {
	width: 100%;
	max-width: 640px;
	height: 240px;
	display: block;
}

.chart-area {
	fill: rgba(94, 114, 228, 0.18);
}

.chart-line {
	stroke: #5e72e4;
	transition: opacity 0.2s;
}

.chart-line-point {
	fill: #5e72e4;
	stroke: #fff;
	stroke-width: 2;
	transition: opacity 0.2s;
}

.chart-line-point:hover {
	opacity: 0.85;
}

.chart-tick-label {
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 11px;
	fill: #6b7280;
}

.chart-tick-label-x {
	font-size: 10px;
	white-space: nowrap;
}

.chart-tick-label-y {
	font-size: 11px;
}

.chart-tooltip {
	position: absolute;
	pointer-events: none;
	transform: translate(-50%, 0);
	min-width: 140px;
	padding: 10px 14px;
	background: var(--background-normal, #fff);
	border: 1px solid var(--border-normal, #e5e7eb);
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
	font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
	font-size: 13px;
	z-index: 10;
}

.chart-tooltip-date {
	font-weight: 600;
	color: var(--foreground, #1a1a1a);
	margin-bottom: 6px;
}

.chart-tooltip-row {
	display: flex;
	justify-content: space-between;
	gap: 16px;
	color: var(--foreground-subdued, #6b7280);
}

.chart-tooltip-value {
	font-weight: 600;
	color: var(--foreground, #1a1a1a);
}

.chiamate-chart-hint {
	margin: 12px 0 0;
	font-size: 12px;
	color: var(--foreground-subdued, #6b7280);
	line-height: 1.4;
}
</style>
