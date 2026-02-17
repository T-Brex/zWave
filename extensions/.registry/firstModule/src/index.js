import ModuleComponent from './module.vue';

export default {
	id: 'first',
	name: 'First',
	icon: 'box',
	routes: [
		{
			path: '',
			component: ModuleComponent,
		},
	],
};
