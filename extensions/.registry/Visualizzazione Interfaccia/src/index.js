export default ({ filter }, { services, getSchema }) => {
	// Hook per filtrare le impostazioni e nascondere Collections, Utenti, Documentazione, Files e sidebar destra per i non admin
	filter('settings.read', async (items, meta, context) => {
		const { accountability } = context || meta;
		
		// Se l'utente non è admin, nascondi i moduli: Collections, Elenco Utenti, Documentazione e Libreria File
		if (accountability && !accountability.admin) {
			// items è un array; il primo oggetto contiene le impostazioni generali
			if (items && items.length > 0) {
				const settings = items[0];
				
				// Filtra la barra dei moduli per rimuovere i moduli non permessi
				if (settings.module_bar && Array.isArray(settings.module_bar)) {
					settings.module_bar = settings.module_bar.filter(mod => {
						// Moduli da nascondere per i non admin
						const hiddenModuleIds = [
							'content',          // Collections/Content
							'users',            // Elenco Utenti
							'user-directory',   // Alternativa per Elenco Utenti
							'docs',             // Documentazione
							'documentation',    // Alternativa per Documentazione
							'help',             // Alternativa per Documentazione
							'files',            // Libreria File
							'file-library'      // Alternativa per Libreria File
						];
						
						// Escludi i moduli nascosti
						return !hiddenModuleIds.includes(mod.id);
					});
				}
				
				// Aggiungi un flag per indicare che l'utente non è admin (utile per l'interfaccia)
				settings.hideRightSidebar = true;
			}
		}
		
		return items;
	});
};
