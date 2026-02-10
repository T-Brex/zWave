import { defineModule } from '@directus/extensions-sdk';
import Module from './module.vue';

export default defineModule({
  id: 'ia',
  name: 'IA',
  icon: 'psychology',
  routes: [
    {
      path: '',
      component: Module,
    },
  ],
});
