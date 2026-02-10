import { defineAsyncComponent } from 'vue';

export default {
	id: 'hide-ui-elements',
	name: 'Hide UI Elements',
	icon: 'visibility_off',
	routes: [
		{
			path: '',
			component: defineAsyncComponent(() => import('./app.vue')),
		},
	],
};
