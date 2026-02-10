<template>
	<private-view title="Automazioni">
		<template #navigation>
			<v-list nav>
				<v-list-item class="nav-item nav-item--active" :active="true">
					<v-list-item-icon class="nav-icon-whatsapp">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" class="nav-icon-whatsapp-svg">
							<path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
						</svg>
					</v-list-item-icon>
					<v-list-item-content>WhatsApp</v-list-item-content>
				</v-list-item>
			</v-list>
		</template>

		<!-- Drawer selezione azienda (come Approfondimenti / Deviazione Chiamate) -->
		<v-drawer v-model="drawerOpen" side="right" :title="drawerTitle" width="320">
			<div class="drawer-content">
				<div class="drawer-header">
					<div class="drawer-header-title">
						<v-icon name="business" />
						<span>Seleziona Azienda</span>
					</div>
					<v-button icon secondary @click="loadList" :loading="loading">
						<v-icon name="refresh" />
					</v-button>
				</div>
				<v-info
					v-if="aziendeList.length === 0 && !loading"
					icon="info"
					title="Nessuna azienda"
					text="Nessuna azienda nella collection clienti. Verifica il campo azienda."
				/>
				<v-list v-else nav class="aziende-list">
					<v-list-item
						v-for="azienda in aziendeList"
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
					<div class="selected-azienda-label">Azienda selezionata:</div>
					<div class="selected-azienda-name">
						<v-icon name="check_circle" />
						<span>{{ selectedAzienda }}</span>
					</div>
				</div>
			</div>
		</v-drawer>

		<div class="whatsapp-view">
			<header class="whatsapp-header">
				<v-button
					class="azienda-select-btn"
					:secondary="!!selectedAzienda"
					:type="selectedAzienda ? 'secondary' : 'primary'"
					@click="drawerOpen = true"
				>
					<v-icon name="business" left />
					<span>{{ selectedAzienda || 'Seleziona azienda' }}</span>
					<v-icon name="arrow_drop_down" right />
				</v-button>
			</header>

			<div v-if="loading" class="list-loading">
				<v-progress-circular indeterminate />
				<span>Caricamento...</span>
			</div>
			<v-info
				v-else-if="error"
				type="danger"
				icon="error"
				title="Errore"
				:text="error"
			>
				<template #append>
					<v-button @click="loadList" :loading="loading">Riprova</v-button>
				</template>
			</v-info>
			<v-info
				v-else-if="!selectedAzienda"
				icon="info"
				title="Seleziona un'azienda"
				:text="promptSelectAzienda"
				class="prompt-info"
			/>
			<div v-else-if="aziendeList.length === 0" class="list-empty">
				Nessuna azienda nella collection clienti. Verifica il campo azienda e i permessi.
			</div>
			<div v-else-if="selectedPrimary" class="phone-card-wrap">
				<div v-if="selectedAzienda" class="phone-card-badge">{{ selectedAzienda }}</div>
				<div class="phone-card">
					<div class="phone-card__label">
						<v-icon name="phone" class="phone-card__label-icon" />
						Numeri WhatsApp per invio riassunto
					</div>
					<div v-if="(selectedPrimary.telefonoArray?.length ?? 0) > 0" class="phone-list">
						<div
							v-for="(num, idx) in selectedPrimary.telefonoArray"
							:key="idx"
							class="phone-card__row"
						>
							<div class="phone-card__row-content">
								<span v-if="num.nome" class="phone-card__name">{{ num.nome }}</span>
								<span class="phone-card__value">{{ formatFullNumber(num.numero) }}</span>
							</div>
							<v-button class="phone-card__edit-btn" icon secondary title="Modifica" @click="startEdit(idx)" :disabled="saving">
								<v-icon name="edit" />
							</v-button>
							<v-button class="phone-card__remove-btn" icon secondary title="Rimuovi" @click="removeNumber(idx)" :disabled="saving">
								<v-icon name="delete" />
							</v-button>
						</div>
					</div>
					<div v-if="!isEditing" class="phone-card__actions phone-card__actions--add">
						<v-button type="button" secondary @click="startEdit(null)">
							<v-icon name="add" left />
							Aggiungi numero
						</v-button>
					</div>
					<template v-else>
						<form class="phone-card__form" @submit.prevent="saveNumber">
							<div class="phone-card__form-group">
								<label class="phone-card__form-label">Nome persona (opzionale)</label>
								<input
									v-model="editName"
									type="text"
									class="phone-card__input"
									placeholder="es. Mario Rossi"
									:disabled="saving"
								/>
							</div>
							<div class="phone-card__input-row">
								<select v-model="selectedPrefix" class="phone-card__prefix" :disabled="saving">
									<option v-for="p in prefixOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
								</select>
								<input
									v-model="editNumber"
									type="text"
									class="phone-card__input phone-card__input--number"
									placeholder="es. 333 3544435"
									:disabled="saving"
								/>
							</div>
							<div v-if="numberValidationError" class="phone-card__validation-error">{{ numberValidationError }}</div>
							<div class="phone-card__actions">
								<v-button type="button" secondary @click.prevent="cancelEdit">Annulla</v-button>
								<button type="submit" class="phone-card__submit" :disabled="saving || !editNumber.trim() || !numberIsValid">
									{{ saving ? 'Salvataggio...' : (editingIndex !== null && editingIndex >= 0 ? 'Salva modifiche' : 'Aggiungi numero') }}
								</button>
							</div>
						</form>
						<v-info v-if="saveSuccess" type="success" icon="check_circle" title="Salvato" :text="saveSuccessMessage" class="phone-card__msg" />
						<v-info v-else-if="saveError" type="danger" icon="error" title="Errore" :text="saveError" class="phone-card__msg" />
					</template>
				</div>
			</div>
			<v-info
				v-else
				icon="info"
				title="Nessun cliente per questa azienda"
				:text="noNumeroMessage"
				class="prompt-info"
			/>
		</div>
	</private-view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();
const CLIENTI_COLLECTION = 'clienti';
const STORAGE_KEY = 'settings_whatsapp_selected_azienda';

/** Prefissi paese: Italia in testa (default), poi ordine alfabetico per nome paese (per parsing si ordina per lunghezza dove serve) */
const _prefixOptionsRaw = [
	{ value: '+39', label: '+39 Italia' },
	{ value: '+1', label: '+1 USA/Canada' },
	{ value: '+44', label: '+44 UK' },
	{ value: '+33', label: '+33 Francia' },
	{ value: '+49', label: '+49 Germania' },
	{ value: '+34', label: '+34 Spagna' },
	{ value: '+41', label: '+41 Svizzera' },
	{ value: '+31', label: '+31 Olanda' },
	{ value: '+32', label: '+32 Belgio' },
	{ value: '+43', label: '+43 Austria' },
	{ value: '+36', label: '+36 Ungheria' },
	{ value: '+48', label: '+48 Polonia' },
	{ value: '+351', label: '+351 Portogallo' },
	{ value: '+358', label: '+358 Finlandia' },
	{ value: '+46', label: '+46 Svezia' },
	{ value: '+47', label: '+47 Norvegia' },
	{ value: '+45', label: '+45 Danimarca' },
	{ value: '+30', label: '+30 Grecia' },
	{ value: '+353', label: '+353 Irlanda' },
	{ value: '+61', label: '+61 Australia' },
	{ value: '+81', label: '+81 Giappone' },
	{ value: '+86', label: '+86 Cina' },
	{ value: '+91', label: '+91 India' },
	{ value: '+55', label: '+55 Brasile' },
	{ value: '+52', label: '+52 Messico' },
	{ value: '+54', label: '+54 Argentina' },
	{ value: '+57', label: '+57 Colombia' },
	{ value: '+58', label: '+58 Venezuela' },
	{ value: '+7', label: '+7 Russia' },
	{ value: '+90', label: '+90 Turchia' },
	{ value: '+20', label: '+20 Egitto' },
	{ value: '+27', label: '+27 Sudafrica' },
	{ value: '+971', label: '+971 UAE' },
	{ value: '+966', label: '+966 Arabia Saudita' },
	{ value: '+972', label: '+972 Israele' },
	{ value: '+213', label: '+213 Algeria' },
	{ value: '+212', label: '+212 Marocco' },
];
const prefixOptions = [_prefixOptionsRaw[0], ..._prefixOptionsRaw.slice(1).sort((a, b) => a.label.localeCompare(b.label, 'it'))];

/** Per ogni azienda (nome normalizzato) il "primario" cliente: { id, telefono } (telefono = array JSON) */
const primaryByAzienda = ref({});
const loading = ref(false);
const error = ref(null);
const selectedAzienda = ref(null);
const drawerOpen = ref(false);
const isEditing = ref(false);
/** Indice del numero in modifica (null = aggiunta nuovo) */
const editingIndex = ref(null);
const selectedPrefix = ref('+39');
const editNumber = ref('');
const editName = ref('');
const saving = ref(false);
const saveError = ref(null);
const saveSuccess = ref(false);
const saveSuccessMessage = ref('');

const promptSelectAzienda = 'Clicca su "Seleziona azienda" per scegliere l\'agenzia e gestire i numeri WhatsApp per l\'invio del riassunto.';
const noNumeroMessage = computed(() => `Nessun record cliente per l\'azienda «${selectedAzienda.value ?? ''}». Verifica la collection clienti.`);

const drawerTitle = computed(() => `Aziende (${aziendeList.value.length})`);
const aziendeList = computed(() => Object.keys(primaryByAzienda.value).sort());
/** Normalizza il nome per il confronto (trim + spazi multipli → uno) */
function normalizeAziendaName(s) {
	return String(s ?? '').trim().replace(/\s+/g, ' ');
}

/** Normalizza id_user per confronto (trim + lowercase, UUID case-insensitive) */
function normalizeIdUser(u) {
	return String(u ?? '').trim().toLowerCase();
}

/** Tutti gli id_user dei clienti con l’azienda selezionata (più clienti possono avere la stessa azienda) */

/** Normalizza un elemento telefono (stringa legacy o oggetto { numero, nome }) in { numero, nome } */
function normalizeTelefonoItem(item) {
	if (item == null) return null;
	if (typeof item === 'string') {
		const n = String(item).trim();
		return n ? { numero: n, nome: '' } : null;
	}
	if (typeof item === 'object' && item !== null && item.numero != null) {
		return { numero: String(item.numero).trim(), nome: String(item.nome ?? '').trim() };
	}
	return null;
}

const selectedPrimary = computed(() => {
	if (!selectedAzienda.value) return null;
	const key = normalizeAziendaName(selectedAzienda.value);
	const primary = primaryByAzienda.value[key];
	if (!primary) return null;
	let arr = primary.telefono;
	if (arr == null) arr = [];
	if (typeof arr === 'string') {
		try { arr = JSON.parse(arr); } catch (_) { arr = []; }
	}
	if (!Array.isArray(arr)) arr = [];
	const telefonoArray = arr.map(normalizeTelefonoItem).filter(Boolean);
	return { id: primary.id, telefonoArray };
});
	// (rimosso) prova tutti gli id_user associati all’azienda (da WEBHOOK_FILTRO_CLIENTI_LIST)

const currentNumberDisplay = computed(() => {
	const prefix = selectedPrefix.value;
	const rest = editNumber.value?.trim();
	if (!rest) return '—';
	return prefix + ' ' + rest.replace(/\s/g, ' ');
});

/** Solo le cifre del numero inserito (senza spazi né altri caratteri) */
const numberDigitsOnly = computed(() => String(editNumber.value ?? '').replace(/\D/g, ''));

/** true se il numero contiene solo cifre e ha lunghezza minima sensata (almeno 6 cifre) */
const numberIsValid = computed(() => {
	const digits = numberDigitsOnly.value;
	return digits.length >= 6 && /^\d+$/.test(digits);
});

/** Messaggio di errore se il numero non è valido (solo in modifica) */
const numberValidationError = computed(() => {
	const raw = String(editNumber.value ?? '').trim();
	if (!raw) return '';
	const digits = numberDigitsOnly.value;
	if (digits.length === 0) return 'Inserisci solo cifre (0-9).';
	if (digits.length < 6) return 'Il numero deve avere almeno 6 cifre.';
	if (raw.replace(/\s/g, '') !== digits) return 'Il numero può contenere solo cifre e spazi.';
	return '';
});

/** Formatta numero completo per visualizzazione (es. 393333544435 -> +39 333 3544435) */
function formatFullNumber(fullNum) {
	const raw = String(fullNum ?? '').replace(/\s/g, '').replace(/^\+/, '');
	if (!raw) return '—';
	const sorted = [...prefixOptions].sort((a, b) => b.value.length - a.value.length);
	for (const p of sorted) {
		const digits = p.value.replace(/^\+/, '');
		if (raw.startsWith(digits) && raw.length > digits.length) {
			const rest = raw.slice(digits.length);
			return p.value + ' ' + rest.replace(/(\d{3})(?=\d)/g, '$1 ');
		}
	}
	return '+' + raw;
}

/** Da numero completo (es. 393333544435) ricava prefisso e parte nazionale */
function parseFullNumber(fullNum) {
	const raw = String(fullNum ?? '').replace(/\s/g, '').replace(/^\+/, '');
	if (!raw) return { prefix: '+39', rest: '' };
	// Prova i prefissi dalla lista: prima i più lunghi (es. +351 prima di +35)
	const sorted = [...prefixOptions].sort((a, b) => b.value.length - a.value.length);
	for (const p of sorted) {
		const digits = p.value.replace(/^\+/, '');
		if (raw.startsWith(digits) && raw.length > digits.length) {
			return { prefix: p.value, rest: raw.slice(digits.length) };
		}
	}
	// Nessun prefisso riconosciuto: tutto come numero, prefisso default
	return { prefix: '+39', rest: raw };
}

watch(selectedPrimary, () => {
	editingIndex.value = null;
	isEditing.value = false;
	editNumber.value = '';
	editName.value = '';
	selectedPrefix.value = '+39';
}, { immediate: true });

function startEdit(index = null) {
	editingIndex.value = index;
	if (index !== null && selectedPrimary.value?.telefonoArray?.[index] != null) {
		const item = selectedPrimary.value.telefonoArray[index];
		const { prefix, rest } = parseFullNumber(item.numero);
		selectedPrefix.value = prefix;
		editNumber.value = rest;
		editName.value = item.nome ?? '';
	} else {
		selectedPrefix.value = '+39';
		editNumber.value = '';
		editName.value = '';
	}
	isEditing.value = true;
	saveError.value = null;
	saveSuccess.value = false;
}

function cancelEdit() {
	editingIndex.value = null;
	editNumber.value = '';
	editName.value = '';
	selectedPrefix.value = '+39';
	isEditing.value = false;
	saveError.value = null;
}

async function removeNumber(index) {
	const primary = selectedPrimary.value;
	if (!primary || index < 0 || index >= (primary.telefonoArray?.length ?? 0)) return;
	const newArray = primary.telefonoArray.filter((_, i) => i !== index);
	saving.value = true;
	saveError.value = null;
	try {
		const telefonoValue = JSON.stringify(newArray);
		await api.patch(`/items/${CLIENTI_COLLECTION}/${primary.id}`, { telefono: telefonoValue });
		const key = normalizeAziendaName(selectedAzienda.value);
		primaryByAzienda.value = { ...primaryByAzienda.value, [key]: { ...primaryByAzienda.value[key], telefono: telefonoValue } };
		if (editingIndex.value === index) { editingIndex.value = null; isEditing.value = false; editNumber.value = ''; editName.value = ''; }
		else if (editingIndex.value != null && editingIndex.value > index) editingIndex.value--;
	} catch (err) {
		saveError.value = err?.response?.data?.errors?.[0]?.message ?? err?.message ?? 'Errore durante la rimozione.';
	} finally {
		saving.value = false;
	}
}

function selectAzienda(azienda) {
	selectedAzienda.value = azienda;
	try { localStorage.setItem(STORAGE_KEY, azienda); } catch (_) {}
	drawerOpen.value = false;
}

async function loadList() {
	loading.value = true;
	error.value = null;
	try {
		const clientiRes = await api.get(`/items/${CLIENTI_COLLECTION}`, {
			params: {
				fields: ['id', 'azienda', 'telefono'],
				limit: -1,
				filter: { azienda: { _nnull: true } },
				sort: ['id'],
			},
		});
		const clientiData = clientiRes.data?.data ?? clientiRes.data ?? [];
		const rows = Array.isArray(clientiData) ? clientiData : [clientiData];
		const byAzienda = {};
		for (const row of rows) {
			const a = normalizeAziendaName(row?.azienda);
			if (a && !byAzienda[a]) byAzienda[a] = { id: row.id, telefono: row.telefono };
		}
		primaryByAzienda.value = byAzienda;

		if (aziendeList.value.length > 0 && selectedAzienda.value === null) {
			try {
				const saved = localStorage.getItem(STORAGE_KEY);
				if (saved && aziendeList.value.includes(saved)) selectedAzienda.value = saved;
			} catch (_) {}
		}
	} catch (err) {
		const msg = err?.response?.data?.errors?.[0]?.message ?? err?.message ?? 'Impossibile caricare.';
		error.value = msg;
		primaryByAzienda.value = {};
	} finally {
		loading.value = false;
	}
}

async function saveNumber() {
	const numberPart = numberDigitsOnly.value;
	if (!numberPart || numberPart.length < 6) {
		saveError.value = 'Il numero deve contenere solo cifre e almeno 6 caratteri.';
		return;
	}
	if (!/^\d+$/.test(numberPart)) {
		saveError.value = 'Il numero può contenere solo cifre (0-9).';
		return;
	}
	const prefixDigits = selectedPrefix.value?.replace(/^\+/, '') ?? '';
	const telefono = prefixDigits + numberPart;
	const primary = selectedPrimary.value;
	if (!primary) return;
	saving.value = true;
	saveError.value = null;
	saveSuccess.value = false;
	const nomePersona = (editName.value ?? '').trim();
	try {
		let newArray = [...(primary.telefonoArray || [])];
		const newItem = { numero: telefono, nome: nomePersona };
		if (editingIndex.value !== null && editingIndex.value >= 0 && editingIndex.value < newArray.length) {
			newArray[editingIndex.value] = newItem;
		} else {
			if (newArray.some((item) => item.numero === telefono)) {
				saveError.value = 'Questo numero è già presente.';
				saving.value = false;
				return;
			}
			newArray.push(newItem);
		}
		const telefonoValue = JSON.stringify(newArray);
		await api.patch(`/items/${CLIENTI_COLLECTION}/${primary.id}`, { telefono: telefonoValue });
		const key = normalizeAziendaName(selectedAzienda.value);
		primaryByAzienda.value = { ...primaryByAzienda.value, [key]: { ...primaryByAzienda.value[key], telefono: telefonoValue } };
		saveSuccessMessage.value = editingIndex.value !== null ? 'Numero e nome aggiornati.' : 'Numero e nome aggiunti.';
		saveSuccess.value = true;
		isEditing.value = false;
		editingIndex.value = null;
		editNumber.value = '';
		editName.value = '';
		setTimeout(() => { saveSuccess.value = false; }, 4000);
	} catch (err) {
		saveError.value = err?.response?.data?.errors?.[0]?.message ?? err?.message ?? 'Errore durante il salvataggio.';
	} finally {
		saving.value = false;
	}
}

onMounted(() => loadList());
</script>

<style scoped>
.nav-item { cursor: pointer; border-radius: 8px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.nav-item:hover { background: var(--background-subdued, #f9fafb); }
.nav-item.nav-item--active {
	background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
	border-radius: 8px;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
	border: 1px solid var(--border-normal, #e8e8e8);
}
.nav-item.nav-item--active :deep(.v-list-item-content) { color: var(--foreground, #1a1a1a); font-weight: 600; }
.nav-icon-whatsapp { display: flex; align-items: center; justify-content: center; }
.nav-icon-whatsapp-svg {
	width: 24px;
	height: 24px;
	color: inherit;
}
.nav-item .nav-icon-whatsapp-svg { color: var(--foreground-subdued, #5f6368); }
.nav-item.nav-item--active .nav-icon-whatsapp-svg { color: var(--foreground, #1a1a1a); }

.drawer-content { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-normal, #e8e8e8); }
.drawer-header-title { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.aziende-list { flex: 1; overflow-y: auto; }
.azienda-item { cursor: pointer; transition: all 0.2s ease; }
.azienda-item:hover { background: var(--background-subdued, #f9fafb); }
.azienda-item--active { background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%); border-radius: 8px; }
.azienda-item--active :deep(.v-list-item-content) { font-weight: 600; }
.selected-azienda-info { margin-top: auto; padding: 16px; border-top: 1px solid var(--border-normal, #e8e8e8); }
.selected-azienda-label { font-size: 12px; color: var(--foreground-subdued, #5f6368); margin-bottom: 4px; }
.selected-azienda-name { display: flex; align-items: center; gap: 8px; font-weight: 600; }

.whatsapp-view { padding: 24px 32px; min-height: 400px; }

.whatsapp-header {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-bottom: 28px;
	padding-bottom: 16px;
	border-bottom: 1px solid var(--border-subdued, #eee);
}
.azienda-select-btn { flex-shrink: 0; }

.list-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding: 48px 24px;
	color: var(--foreground-subdued, #666);
	font-size: 0.95rem;
}
.list-empty {
	padding: 32px 24px;
	background: var(--background-subdued, #f8f9fa);
	border-radius: 12px;
	font-size: 0.9rem;
	color: var(--foreground-subdued, #666);
	max-width: 420px;
}
.prompt-info { margin-top: 1rem; max-width: 420px; }

.phone-card-wrap { max-width: 480px; margin-top: 8px; }
.phone-card-badge {
	display: inline-block;
	margin-bottom: 12px;
	padding: 6px 14px;
	font-size: 0.8rem;
	font-weight: 500;
	color: var(--primary, #6644ff);
	background: rgba(102, 68, 255, 0.08);
	border-radius: 20px;
}

.phone-card {
	padding: 24px 28px;
	background: var(--background-page, #fff);
	border: 1px solid var(--border-normal, #e8e8e8);
	border-radius: 16px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
	transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
.phone-card:hover { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); }

.phone-card__label {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.8rem;
	color: var(--foreground-subdued, #666);
	margin-bottom: 12px;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	font-weight: 600;
}
.phone-card__label-icon { color: #25d366; flex-shrink: 0; }

.phone-card__row {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-top: 4px;
	padding: 12px 16px;
	background: var(--background-subdued, #f6f7f8);
	border-radius: 10px;
	border: 1px solid transparent;
}
.phone-card__row-content {
	display: flex;
	flex-direction: column;
	gap: 2px;
	flex: 1;
	min-width: 0;
}
.phone-card__name {
	font-size: 0.9rem;
	font-weight: 600;
	color: var(--foreground, #1a1a1a);
}
.phone-card__value {
	font-size: 1rem;
	font-weight: 500;
	color: var(--foreground-subdued, #5f6368);
	letter-spacing: 0.02em;
}
.phone-card__edit-btn { flex-shrink: 0; }
.phone-card__remove-btn { flex-shrink: 0; color: var(--danger, #d32f2f); }
.phone-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.phone-card__actions--add { margin-top: 8px; }

.phone-card__form { margin-top: 12px; }
.phone-card__form-group { margin-bottom: 14px; }
.phone-card__form-label {
	display: block;
	font-size: 0.8rem;
	font-weight: 600;
	color: var(--foreground-subdued, #666);
	margin-bottom: 6px;
}
.phone-card__input-row {
	display: flex;
	gap: 10px;
	margin-bottom: 14px;
}
.phone-card__prefix {
	flex-shrink: 0;
	min-width: 120px;
	padding: 12px 14px;
	font-size: 0.95rem;
	border: 1px solid var(--border-normal, #e0e0e0);
	border-radius: 10px;
	background: var(--background-page, #fff);
	color: var(--foreground, #1a1a1a);
	cursor: pointer;
	transition: border-color 0.2s ease;
}
.phone-card__prefix:focus {
	outline: none;
	border-color: #25d366;
}
.phone-card__prefix:disabled { opacity: 0.7; cursor: not-allowed; }
.phone-card__input {
	box-sizing: border-box;
	padding: 12px 16px;
	font-size: 1rem;
	border: 1px solid var(--border-normal, #e0e0e0);
	border-radius: 10px;
	background: var(--background-page, #fff);
	color: var(--foreground, #1a1a1a);
	transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.phone-card__input--number { flex: 1; min-width: 0; }
.phone-card__input:focus {
	outline: none;
	border-color: #25d366;
	box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.15);
}
.phone-card__input:disabled { opacity: 0.7; cursor: not-allowed; }

.phone-card__validation-error {
	font-size: 0.875rem;
	color: var(--danger, #d32f2f);
	margin-bottom: 10px;
}
.phone-card__actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 12px;
	width: 100%;
	box-sizing: border-box;
}
.phone-card__submit {
	padding: 10px 20px;
	font-size: 0.95rem;
	font-weight: 600;
	color: #fff;
	background: #25d366;
	border: none;
	border-radius: 10px;
	cursor: pointer;
	transition: background 0.2s ease, opacity 0.2s ease;
}
.phone-card__submit:hover:not(:disabled) { background: #20bd5a; }
.phone-card__submit:disabled { opacity: 0.6; cursor: not-allowed; }
.phone-card__msg { margin-top: 14px; }
</style>
