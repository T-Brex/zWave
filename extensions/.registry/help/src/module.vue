<template>
	<private-view title="Help">
		<template #navigation>
			<v-list nav>
				<v-list-item class="nav-item nav-item--active" :active="true" :to="modulePath">
					<v-list-item-icon>
						<v-icon name="help" />
					</v-list-item-icon>
					<v-list-item-content>Contattaci</v-list-item-content>
				</v-list-item>
			</v-list>
		</template>
		<template #actions>
			<CompanySelector
				v-model="selectedClientId"
				@selected="onAziendaSelected"
			/>
		</template>

		<div class="help-module-root">
			<div class="header-separator" />
			<div class="help-view">

			<div class="help-card">
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
		</div>
	</private-view>
</template>

<script>
import { ref, reactive, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useApi } from '@directus/extensions-sdk';
import CompanySelector from '../../common/components/CompanySelector.vue';

// URL del webhook n8n: crea un nodo "Webhook" in n8n e incolla qui l'URL generato.
const N8N_WEBHOOK_URL = 'https://n8n.srv1075424.hstgr.cloud/webhook/145077cf-81be-44af-9619-2ea821819d45';

const TIPO_OPTIONS = [
	{ value: 'feedback', text: 'Feedback' },
	{ value: 'problema', text: 'Problema / Errore' },
	{ value: 'richiesta', text: 'Richiesta di funzionalità' },
	{ value: 'altro', text: 'Altro' },
];

export default {
	components: { CompanySelector },
	setup() {
		const route = useRoute();
		const modulePath = computed(() => route.path);
		const api = useApi();
		const sending = ref(false);
		const submitError = ref('');
		const submitSuccess = ref(false);

		const selectedClientId = ref(null);
		const selectedAzienda = ref(null);

		function onAziendaSelected(payload) {
			selectedAzienda.value = payload?.azienda ?? null;
		}

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

		return {
			modulePath,
			form,
			errors,
			tipoOptions,
			sending,
			submitError,
			submitSuccess,
			onSubmit,
			selectedClientId,
			selectedAzienda,
			onAziendaSelected,
		};
	},
};
</script>

<style scoped>
.help-module-root {
	width: 100%;
	min-width: 0;
	overflow-x: hidden;
}

.header-separator {
	height: 1px;
	background: #dadada;
	margin: 0 24px;
}

.help-view {
	padding: 24px;
	max-width: 640px;
	margin: 0 auto;
}

.help-card {
	margin-top: 24px;
	background: var(--background-normal);
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	padding: 24px;
	border: 1px solid var(--border-normal);
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
</style>
