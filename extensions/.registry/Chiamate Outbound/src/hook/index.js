/**
 * Hook: alla creazione di una riga nella collection "leads"
 * invia un webhook con la riga lead, la riga clienti e la riga chiamate_outbound corrispondenti (stesso azienda).
 */
const WEBHOOK_LEAD_CREATED =
	'https://n8n.srv1075424.hstgr.cloud/webhook/fd14fc6a-c93f-4500-845b-9e4b81044e59';
const LEADS_COLLECTION = 'leads';
const CLIENTI_COLLECTION = 'clienti';
const CHIAMATE_OUTBOUND_COLLECTION = 'chiamate_outbound';

export default ({ action }, { database, logger }) => {
	action('items.create', async (meta, context) => {
		if (meta.collection !== LEADS_COLLECTION) return;

		const key = meta.key;
		const payload = meta.payload ?? {};

		try {
			// Leggi la riga lead completa (payload può essere parziale)
			const db = context?.database ?? database;
			if (!db) return;
			const leadRow = await db(LEADS_COLLECTION).where('id', key).first();
			const lead = leadRow ?? { id: key, ...payload };

			const azienda = lead?.azienda ?? payload?.azienda;
			let cliente = null;
			let chiamateOutbound = null;
			if (azienda != null && String(azienda).trim() !== '') {
				const clienteRow = await db(CLIENTI_COLLECTION)
					.where('azienda', azienda)
					.first();
				cliente = clienteRow ?? null;

				const outboundQuery = db(CHIAMATE_OUTBOUND_COLLECTION).where('azienda', azienda);
				if (cliente?.id_user != null) {
					outboundQuery.where('id_user', cliente.id_user);
				}
				const outboundRow = await outboundQuery.first();
				chiamateOutbound = outboundRow ?? null;
			}

			const body = JSON.stringify({ lead, cliente, chiamate_outbound: chiamateOutbound });
			const response = await fetch(WEBHOOK_LEAD_CREATED, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body,
			});

			if (!response.ok && logger) {
				logger.warn(
					`[chiamate-outbound] Webhook lead created risposto ${response.status} per lead ${key}`
				);
			}
		} catch (err) {
			if (logger) {
				logger.error(
					`[chiamate-outbound] Errore webhook lead created: ${err?.message ?? err}`
				);
			}
		}
	});
};
