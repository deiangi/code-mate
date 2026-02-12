import ChatApp from './components/chat/ChatApp.svelte';

const app = new ChatApp({
  target: document.getElementById('app')!
});

export default app;
