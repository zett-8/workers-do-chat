import handle from 'hono-react-router-adapter/cloudflare-workers'
import * as build from './build/server'
import { getLoadContext } from './load-context'
import server from './server'
import { GameRoom } from './server/gameRoom'

export default handle(build, server, { getLoadContext })
export { GameRoom }
