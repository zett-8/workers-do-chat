import { Hono } from 'hono'
import { parseHTML } from 'linkedom'
import { setMiddlewares } from './middlewares'
import { getRandomWikiPage } from './utils/wikipage'

const app = new Hono<HonoENV>()

setMiddlewares(app)

app.get('/api/check', (c) => c.json({ status: 'ok' }))

app.get('/api/ws/:gameId', async (c) => {
  const id = c.env.GAME_ROOM.idFromName(c.req.param('gameId'))
  const stub = c.env.GAME_ROOM.get(id)
  return stub.fetch(c.req.raw)
})

app.get('/api/random', async (c) => {
  const [page1, page2] = await getRandomWikiPage()
  return c.json([page1, page2])
})

app.get('/api/page/check/:pageTitle', async (c) => {
  try {
    const pageTitle = c.req.param('pageTitle')
    const res = await fetch(
      `https://ja.wikipedia.org/w/api.php?action=query&titles=${pageTitle.replaceAll(' ', '_')}&format=json`
    )
    const json = (await res.json()) as { query: { pages: { [key: string]: { pageid: unknown } } } }
    console.log(json)
    const pageId = Object.keys(json.query.pages)[0]
    return c.json({ result: pageId !== '-1' })
  } catch (e) {
    console.error(e)
    return c.json({ result: false })
  }
})

app.get('/api/proxy', async (c) => {
  const url = c.req.query('url')
  if (!url || !url.startsWith('https://')) {
    return c.text('Invalid URL', 400)
  }

  try {
    const res = await fetch(url)
    const html = await res.text()
    const { document } = parseHTML(html)

    const head = document.querySelector('head')
    const wikiCSS = document.createElement('link')
    wikiCSS.setAttribute('rel', 'stylesheet')
    wikiCSS.setAttribute(
      'href',
      'https://ja.wikipedia.org/w/load.php?debug=false&lang=ja&modules=site.styles&only=styles&skin=vector'
    )
    head?.appendChild(wikiCSS)
    const base = document.createElement('base')
    base.setAttribute('href', 'https://ja.wikipedia.org/')
    head?.insertBefore(base, head.firstChild)

    const aTags = document.querySelectorAll('a')
    for (const a of aTags) {
      const href = a.getAttribute('href') || ''
      a.setAttribute('href', 'javascript:void(0)')
      a.setAttribute(
        'onclick',
        `
        console.log('📤 sending postMessage', { type: 'pm_traverse', url: '${href}' });
        window.parent.postMessage({ type: 'pm_traverse', url: '${href}' }, '*');
        return false;
      `
      )
    }

    const script = document.createElement('script')

    document.body.appendChild(script)

    const modifiedHTML = '<!DOCTYPE html>' + document.documentElement.outerHTML

    return new Response(modifiedHTML, {
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'access-control-allow-origin': '*',
      },
    })
  } catch (e) {
    console.error(e)
    return c.text('Error fetching target page', 500)
  }
})

export default app
