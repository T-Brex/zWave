# Refactoring del Modulo IA

## Struttura Refactorizzata

Il modulo è stato diviso in componenti più piccoli e modulari per migliorare la manutenibilità.

### Componenti UI

- **`PromptEditor.vue`** - Gestione editor prompt e primo messaggio
- **`KnowledgeBaseView.vue`** - Vista principale con tab per FAQ, Sito Web e File
- **`IframeModal.vue`** - Modale per iframe (fallback anti-403)

### Composables

- **`usePrompt.js`** - Logica per gestione prompt (caricamento, editing, salvataggio)
- **`useCollections.js`** - Risoluzione e gestione delle collezioni

### Utils

- **`collectionResolver.js`** - Funzioni per risolvere nomi di collezioni
- **`iframeHelpers.js`** - Helper per gestione iframe e scraping DOM

## Migrazione

Il file `module.vue` originale (1837 righe) è stato ridotto a ~100 righe, delegando la logica ai componenti e composables.

### Vecchia Struttura
```
module.vue (1837 righe)
├── Tutta la logica prompt
├── Tutta la logica collezioni
├── Tutta la logica iframe
└── Tutti i componenti inline
```

### Nuova Struttura
```
module.vue (~100 righe)
├── Navigation
├── KnowledgeBaseView
│   ├── FaqTab
│   ├── SitoWebTab
│   └── FileTab
├── PromptEditor
│   └── usePrompt composable
└── IframeModal
    └── iframeHelpers utils
```

## Benefici

1. **Manutenibilità**: Codice più facile da capire e modificare
2. **Riutilizzabilità**: Composables possono essere riutilizzati
3. **Testabilità**: Componenti più piccoli sono più facili da testare
4. **Separazione delle responsabilità**: Ogni componente ha un ruolo chiaro
