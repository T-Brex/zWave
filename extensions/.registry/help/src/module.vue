<template>
	<private-view title="Help">
		<template #navigation>
			<v-list nav>
				<v-list-item class="nav-item nav-item--active" :active="true">
					<v-list-item-icon>
						<v-icon name="help" />
					</v-list-item-icon>
					<v-list-item-content>Help</v-list-item-content>
				</v-list-item>
			</v-list>
		</template>

		<!-- Drawer selezione azienda -->
		<v-drawer v-model="drawerOpen" side="right" :title="drawerTitle" width="320">
			<div class="drawer-content">
				<div class="drawer-header">
					<div class="drawer-header-title">
						<v-icon name="business" />
						<span>Seleziona Azienda</span>
					</div>
					<v-button icon secondary @click="loadAziende" :loading="loadingAziende">
						<v-icon name="refresh" />
					</v-button>
				</div>
				<v-info
					v-if="aziendeList.length === 0 && !loadingAziende"
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

		<div class="help-view">
			<div class="help-card">
				<div class="help-header">
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
					<v-icon name="contact_support" class="help-header-icon" />
					<h2 class="help-title">Contattaci</h2>
					<p class="help-subtitle">
						Dai un feedback, segnala un problema o richiedi una funzionalità.
					</p>
				</div>

				<form class="help-form" @submit.prevent="onSubmit">
					<div class="form-group">
						<label class="form-label">Tipo</label>
						<v-select
							v-model="form.tipo"
							:items="tipoOptions"
							item-text="text"
							item-value="value"
							:disabled="sending"
						/>
					</div>

					<div class="form-group">
						<label class="form-label">Descrizione</label>
						<v-textarea
							v-model="form.descrizione"
							placeholder="Descrivi la tua richiesta..."
							rows="6"
							:disabled="sending"
						/>
						<div v-if="errors.descrizione" class="field-error">
							<v-icon name="error" />
							{{ errors.descrizione }}
						</div>
					</div>

					<div class="form-group">
						<label class="form-label">Email (opzionale)</label>
						<v-input
							v-model="form.email"
							type="email"
							placeholder="tua@email.com"
							:disabled="sending"
						/>
						<div v-if="errors.email" class="field-error">
							<v-icon name="error" />
							{{ errors.email }}
						</div>
					</div>

					<div v-if="submitError" class="submit-error">
						<v-icon name="error" />
						{{ submitError }}
					</div>

					<div v-if="submitSuccess" class="submit-success">
						<v-icon name="check_circle" />
						Messaggio inviato correttamente. Grazie per la segnalazione.
					</div>

					<div class="form-actions">
						<v-button
							type="submit"
							:loading="sending"
							:disabled="sending"
						>
							<v-icon name="send" left />
							Invia segnalazione
						</v-button>
					</div>
				</form>
			</div>
		</div>
	</private-view>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';

// URL del webhook n8n: crea un nodo "Webhook" in n8n e incolla qui l'URL generato.
const N8N_WEBHOOK_URL = 'https://n8n.srv1075424.hstgr.cloud/webhook/145077cf-81be-44af-9619-2ea821819d45';
const CLIENTI_COLLECTION = 'clienti';
const AZIENDA_STORAGE_KEY = 'help_selected_azienda';

const TIPO_OPTIONS = [
	{ value: 'feedback', text: 'Feedback' },
	{ value: 'problema', text: 'Problema / Errore' },
	{ value: 'richiesta', text: 'Richiesta di funzionalità' },
	{ value: 'altro', text: 'Altro' },
];

function normalizeAziendaName(s) {
	if (s == null || typeof s !== 'string') return '';
	return s.trim().replace(/\s+/g, ' ');
}

export default {
	setup() {
		const api = useApi();
		const sending = ref(false);
		const submitError = ref('');
		const submitSuccess = ref(false);

		const selectedAzienda = ref(null);
		const drawerOpen = ref(false);
		const aziendeList = ref([]);
		const loadingAziende = ref(false);

		const form = reactive({
			tipo: 'feedback',
			descrizione: '',
			email: '',
		});

		const errors = reactive({
			descrizione: '',
			email: '',
		});

		const tipoOptions = TIPO_OPTIONS;
		const drawerTitle = computed(() => `Aziende (${aziendeList.value.length})`);

		async function loadAziende() {
			loadingAziende.value = true;
			try {
				const res = await api.get(`/items/${CLIENTI_COLLECTION}`, {
					params: {
						fields: ['azienda'],
						limit: -1,
						filter: { azienda: { _nnull: true } },
						sort: ['id'],
					},
				});
				const data = res.data?.data ?? res.data ?? [];
				const rows = Array.isArray(data) ? data : [data];
				const set = new Set();
				for (const row of rows) {
					const a = normalizeAziendaName(row?.azienda);
					if (a) set.add(a);
				}
				aziendeList.value = [...set].sort();
				if (aziendeList.value.length > 0 && selectedAzienda.value === null) {
					try {
						const saved = localStorage.getItem(AZIENDA_STORAGE_KEY);
						if (saved && aziendeList.value.includes(saved)) selectedAzienda.value = saved;
					} catch (_) {}
				}
			} catch (_) {
				aziendeList.value = [];
			} finally {
				loadingAziende.value = false;
			}
		}

		function selectAzienda(azienda) {
			selectedAzienda.value = azienda;
			try {
				localStorage.setItem(AZIENDA_STORAGE_KEY, azienda || '');
			} catch (_) {}
			drawerOpen.value = false;
		}

		const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		function isValidEmail(value) {
			return EMAIL_REGEX.test((value || '').trim());
		}

		function validate() {
			errors.descrizione = '';
			errors.email = '';
			if (!selectedAzienda.value || !String(selectedAzienda.value).trim()) {
				submitError.value = 'Seleziona un\'azienda prima di inviare la segnalazione.';
				return false;
			}
			if (!(form.descrizione || '').trim()) {
				errors.descrizione = 'Inserisci una descrizione.';
				return false;
			}
			const emailTrimmed = (form.email || '').trim();
			if (emailTrimmed && !isValidEmail(emailTrimmed)) {
				errors.email = 'Inserisci un indirizzo email valido.';
				return false;
			}
			return true;
		}

		async function getUserInfo() {
			try {
				const res = await api.get('/users/me', {
					params: { fields: 'id,email,first_name,last_name' },
				});
				return res.data?.data || null;
			} catch {
				return null;
			}
		}

		async function onSubmit() {
			submitError.value = '';
			submitSuccess.value = false;
			if (!validate()) return;

			if (!N8N_WEBHOOK_URL || !N8N_WEBHOOK_URL.trim()) {
				submitError.value =
					'URL webhook n8n non configurato. Imposta N8N_WEBHOOK_URL in src/module.vue.';
				return;
			}

			sending.value = true;
			try {
				const user = await getUserInfo();
				const payload = {
					tipo: form.tipo,
					descrizione: (form.descrizione || '').trim(),
					email: (form.email || '').trim() || user?.email || '',
					user_id: user?.id ?? null,
					user_name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || null,
					invio_at: new Date().toISOString(),
					azienda: selectedAzienda.value || null,
				};

				const response = await fetch(N8N_WEBHOOK_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});

				if (!response.ok) {
					throw new Error(
						response.statusText || `Errore HTTP ${response.status}`
					);
				}

				submitSuccess.value = true;
				form.descrizione = '';
				form.email = '';
			} catch (e) {
				submitError.value =
					e.message || 'Impossibile inviare la segnalazione. Riprova più tardi.';
			} finally {
				sending.value = false;
			}
		}

		onMounted(() => loadAziende());

		return {
			form,
			errors,
			tipoOptions,
			sending,
			submitError,
			submitSuccess,
			onSubmit,
			selectedAzienda,
			drawerOpen,
			aziendeList,
			loadingAziende,
			loadAziende,
			selectAzienda,
			drawerTitle,
		};
	},
};
</script>

<style scoped>
.help-view {
	padding: 24px;
	max-width: 640px;
	margin: 0 auto;
}

.help-card {
	background: var(--background-normal);
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	padding: 24px;
	border: 1px solid var(--border-normal);
}

.help-header {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-bottom: 24px;
}

.help-header-icon {
	color: var(--primary);
	margin-right: 8px;
	vertical-align: middle;
}

.help-title {
	font-size: 1.25rem;
	font-weight: 600;
	margin: 0 0 8px 0;
	color: var(--foreground-normal);
}

.help-subtitle {
	margin: 0;
	color: var(--foreground-subdued);
	font-size: 0.9rem;
}

.help-form {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.form-label {
	font-weight: 500;
	color: var(--foreground-normal);
	font-size: 0.9rem;
}

.field-error,
.submit-error {
	display: flex;
	align-items: center;
	gap: 6px;
	color: var(--danger);
	font-size: 0.85rem;
}

.submit-success {
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--primary);
	font-size: 0.95rem;
}

.form-actions {
	margin-top: 8px;
}

/* Drawer e selettore azienda */
.drawer-content {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}
.drawer-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid var(--border-normal);
}
.drawer-header-title {
	display: flex;
	align-items: center;
	gap: 8px;
	font-weight: 600;
}
.aziende-list {
	flex: 1;
	overflow-y: auto;
}
.azienda-item {
	cursor: pointer;
	transition: background 0.2s ease;
}
.azienda-item:hover {
	background: var(--background-subdued);
}
.azienda-item--active {
	background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
	border-radius: 8px;
}
.azienda-item--active :deep(.v-list-item-content) {
	font-weight: 600;
}
.selected-azienda-info {
	margin-top: auto;
	padding: 16px;
	border-top: 1px solid var(--border-normal);
}
.selected-azienda-label {
	font-size: 12px;
	color: var(--foreground-subdued);
	margin-bottom: 4px;
}
.selected-azienda-name {
	display: flex;
	align-items: center;
	gap: 8px;
	font-weight: 600;
}
.azienda-select-btn {
	flex-shrink: 0;
	align-self: flex-start;
}
</style>
