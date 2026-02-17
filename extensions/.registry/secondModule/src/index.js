import ModuleComponent from './module.vue';

export default {
	id: 'second',
	name: 'Second',
	icon: 'box',
	routes: [
		{
			path: '',
			component: ModuleComponent,
		},
	],
};
