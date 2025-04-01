import { createCookieSessionStorage } from 'react-router'

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__game_userid_session',
    secrets: ['wikitraverze-secret'],
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secure: true,
  },
})

export const getOrCreateUserId = async (request: Request) => {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')
  if (userId) {
    return { userId, headers: {} }
  }
  return createUserId(request)
}

export const createUserId = async (request: Request) => {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'))
  const userId = crypto.randomUUID()
  session.set('userId', userId)
  const headers = new Headers({
    'Set-Cookie': await sessionStorage.commitSession(session),
  })
  return { userId, headers }
}
