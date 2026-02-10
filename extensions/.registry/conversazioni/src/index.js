import ModuleComponent from './module.vue';
import ConversationsTable from './pages/ConversationsTable.vue';
import TasksView from './pages/TasksView.vue';

export default {
  id: 'conversazioni',
  name: 'Conversazioni',
  icon: 'chat',
  routes: [
    {
      path: '',
      component: ModuleComponent,
    },
    {
      path: 'tabella',
      component: ConversationsTable,
    },
    {
      path: 'task',
      component: TasksView,
    },
  ],
};
