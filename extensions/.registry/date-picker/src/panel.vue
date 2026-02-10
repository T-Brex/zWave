<template>
	<div class="keplero-container">
		<div class="sidebar">
			<div class="menu-title">Periodo</div>
			<button @click="selectPeriod('today')" :class="{ active: selected === 'today' }">Oggi</button>
			<button @click="selectPeriod('week')" :class="{ active: selected === 'week' }">Ultima settimana</button>
			<button @click="selectPeriod('month')" :class="{ active: selected === 'month' }">Ultimo mese</button>
			<button @click="selectPeriod('year')" :class="{ active: selected === 'year' }">Ultimo anno</button>
		</div>

		<div class="content">
			<div class="info">
				<p>Dal: <b>{{ displayStart }}</b></p>
				<p>Al: <b>{{ displayEnd }}</b></p>
			</div>
			<div class="note">
				Copia queste date nelle variabili globali "min_data" e "max_data".
			</div>
		</div>
	</div>
</template>

<script>
import { ref } from 'vue';

export default {
	setup() {
		const selected = ref('week');
		const displayStart = ref('');
		const displayEnd = ref('');

		function formatDate(date) {
			return date.toISOString().split('T')[0];
		}

		function selectPeriod(type) {
			selected.value = type;
			const end = new Date();
			const start = new Date();

			if (type === 'today') {
				// Oggi rimane oggi
			} else if (type === 'week') {
				start.setDate(end.getDate() - 7);
			} else if (type === 'month') {
				start.setMonth(end.getMonth() - 1);
			} else if (type === 'year') {
				start.setFullYear(end.getFullYear() - 1);
			}

			displayStart.value = formatDate(start);
			displayEnd.value = formatDate(end);
			
			// NOTA: Qui servirebbe il collegamento segreto allo "Store" di Directus 
			// per aggiornare automaticamente i grafici.
			// Per ora visualizziamo solo le date calcolate.
		}

		// Inizializza con ultima settimana
		selectPeriod('week');

		return { selected, selectPeriod, displayStart, displayEnd };
	},
};
</script>

<style scoped>
.keplero-container {
	display: flex;
	height: 100%;
	background-color: white;
	padding: 0;
	font-family: sans-serif;
	overflow: hidden;
}

.sidebar {
	width: 150px;
	background-color: #f8f9fa;
	border-right: 1px solid #e9ecef;
	display: flex;
	flex-direction: column;
	padding: 10px;
}

.menu-title {
	font-weight: bold;
	margin-bottom: 10px;
	font-size: 0.8rem;
	color: #6c757d;
	text-transform: uppercase;
}

button {
	background: none;
	border: none;
	text-align: left;
	padding: 8px 10px;
	cursor: pointer;
	border-radius: 4px;
	color: #333;
	font-size: 14px;
	margin-bottom: 2px;
}

button:hover {
	background-color: #e2e6ea;
}

button.active {
	background-color: #e7f1ff;
	color: #0056b3;
	font-weight: 600;
}

.content {
	flex: 1;
	padding: 20px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

.info p {
	margin: 5px 0;
	font-size: 1.1rem;
}

.note {
	margin-top: 20px;
	font-size: 0.8rem;
	color: #888;
	background: #fff3cd;
	padding: 10px;
	border-radius: 4px;
}
</style>