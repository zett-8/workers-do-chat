import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [index('routes/home.tsx'), route('/game/:gameId', 'routes/game/$gameId.tsx')] satisfies RouteConfig
