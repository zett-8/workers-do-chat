import handle from 'hono-react-router-adapter/cloudflare-workers'
import * as build from './build/server'
import { getLoadContext } from './load-context'
import server from './server'
import { ChatRoom } from './server/chatRoom'

export default handle(build, server, { getLoadContext })
export { ChatRoom }
