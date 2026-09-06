import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx', { id: 'home-index' }),
  route('chat', 'routes/chat.tsx', { id: 'chat' }),
  route('home', 'routes/home.tsx', { id: 'home' }),
] satisfies RouteConfig;
