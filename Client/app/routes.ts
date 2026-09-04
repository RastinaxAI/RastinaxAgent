import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/chat.tsx', { id: 'root-chat' }),
  route('chat', 'routes/chat.tsx', { id: 'chat' }),
  route('home', 'routes/home.tsx', { id: 'home' }),
] satisfies RouteConfig;
