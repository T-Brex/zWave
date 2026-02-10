<template>
	<div style="display: none;"></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useStores } from '@directus/extensions-sdk';

const { useUserStore } = useStores();
const userStore = useUserStore();

let styleElement = null;
let observer = null;
let intervalId = null;

onMounted(() => {
	// Verifica se l'utente non è admin
	const isAdmin = userStore.currentUser?.role?.admin_access;
	
	if (!isAdmin) {
		// Crea un elemento style per nascondere la sidebar destra
		styleElement = document.createElement('style');
		styleElement.id = 'hide-right-sidebar-non-admin';
		styleElement.textContent = `
			/* Nascondi la sidebar destra per i non admin */
			body.non-admin .layout-sidebar-right,
			body.non-admin [class*="sidebar-right"],
			body.non-admin [class*="right-sidebar"],
			body.non-admin .v-navigation-drawer[data-sidebar="right"],
			body.non-admin aside[class*="sidebar"]:not([class*="left"]):not([class*="main"]),
			body.non-admin .sidebar-right-panel,
			body.non-admin .v-navigation-drawer[aria-label*="right"],
			body.non-admin .v-navigation-drawer[aria-label*="Right"],
			body.non-admin [data-testid*="sidebar-right"] {
				display: none !important;
				visibility: hidden !important;
				width: 0 !important;
				opacity: 0 !important;
				transform: translateX(100%) !important;
			}
			
			/* Nascondi anche eventuali overlay o backdrop della sidebar destra */
			body.non-admin .v-overlay[class*="sidebar-right"],
			body.non-admin .v-overlay[class*="right-sidebar"] {
				display: none !important;
			}
			
			/* Assicurati che il contenuto principale si espanda correttamente */
			body.non-admin .layout-content {
				margin-right: 0 !important;
				padding-right: 0 !important;
			}
		`;
		
		// Aggiungi classe al body per identificare non admin
		document.body.classList.add('non-admin');
		
		document.head.appendChild(styleElement);
		
		// Funzione per nascondere la sidebar destra
		const hideSidebar = () => {
			// Cerca elementi sidebar destra comuni in Directus
			const rightSidebars = document.querySelectorAll(
				'.layout-sidebar-right, ' +
				'[class*="sidebar-right"], ' +
				'[class*="right-sidebar"], ' +
				'.v-navigation-drawer[data-sidebar="right"], ' +
				'aside[class*="sidebar"]:not([class*="left"]):not([class*="main"])'
			);
			
			rightSidebars.forEach(sidebar => {
				if (sidebar && !sidebar.closest('.admin-only')) {
					sidebar.style.cssText = 'display: none !important; visibility: hidden !important; width: 0 !important; opacity: 0 !important;';
				}
			});
		};
		
		// Nascondi immediatamente
		hideSidebar();
		
		// Nascondi anche dopo che il DOM è completamente caricato
		const timeouts = [100, 500, 1000, 2000];
		timeouts.forEach(delay => {
			setTimeout(hideSidebar, delay);
		});
		
		// Usa MutationObserver per nascondere sidebar che vengono aggiunte dinamicamente
		observer = new MutationObserver(() => {
			hideSidebar();
		});
		
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['class', 'style']
		});
		
		// Usa anche un interval per assicurarsi che la sidebar rimanga nascosta
		intervalId = setInterval(hideSidebar, 500);
	}
});

onUnmounted(() => {
	// Rimuovi lo style e l'observer quando il componente viene distrutto
	if (styleElement && styleElement.parentNode) {
		styleElement.parentNode.removeChild(styleElement);
	}
	if (observer) {
		observer.disconnect();
	}
	if (intervalId) {
		clearInterval(intervalId);
	}
	document.body.classList.remove('non-admin');
});
</script>
