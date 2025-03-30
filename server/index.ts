import { Hono } from 'hono'
import { setMiddlewares } from './middlewares'

const app = new Hono<HonoENV>()

setMiddlewares(app)

app.get('/api/check', (c) => c.json({ status: 'ok' }))

app.get('/api/ws/:room', async (c) => {
  const id = c.env.CHAT_ROOM.idFromName(c.req.param('room'))
  const stub = c.env.CHAT_ROOM.get(id)
  return stub.fetch(c.req.raw)
})

export default app
