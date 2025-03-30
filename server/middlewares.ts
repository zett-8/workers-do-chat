import type { Hono } from 'hono'
import { contextStorage } from 'hono/context-storage'
import { logger } from 'hono/logger'

export const setMiddlewares = (app: Hono<HonoENV>): Hono<HonoENV> => {
  app.use(logger())
  app.use(contextStorage())

  return app
}
