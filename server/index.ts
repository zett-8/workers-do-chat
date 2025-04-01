import { Hono } from 'hono'
import { parseHTML } from 'linkedom'
import { setMiddlewares } from './middlewares'

const app = new Hono<HonoENV>()

setMiddlewares(app)

app.get('/api/check', (c) => c.json({ status: 'ok' }))

app.get('/api/ws/:gameId', async (c) => {
  const id = c.env.GAME_ROOM.idFromName(c.req.param('gameId'))
  const stub = c.env.GAME_ROOM.get(id)
  return stub.fetch(c.req.raw)
})

app.get('/api/proxy', async (c) => {
  const url = c.req.query('url')
  if (!url || !url.startsWith('https://')) {
    return c.text('Invalid URL', 400)
  }

  // const match = url.match(/^https:\/\/[^.]+\.wikipedia\.org\/wiki\/([^?#]+)/)
  // if (!match) {
  //   return c.text('Invalid URL', 400)
  // }
  // const cacheKey = match[1]
  // const cachedPage = await c.env.PAGE_CACHE.get(cacheKey)
  // if (cachedPage) {
  //   return new Response(cachedPage, {
  //     headers: {
  //       'content-type': 'text/html; charset=UTF-8',
  //       'access-control-allow-origin': '*',
  //     },
  //   })
  // }

  try {
    const res = await fetch(url)
    const html = await res.text()
    const { document } = parseHTML(html)

    const head = document.querySelector('head')
    const wikiCSS = document.createElement('link')
    wikiCSS.setAttribute('rel', 'stylesheet')
    wikiCSS.setAttribute(
      'href',
      'https://en.wikipedia.org/w/load.php?debug=false&lang=ja&modules=site.styles&only=styles&skin=vector'
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
        console.log('📤 sending postMessage', { type: 'traverse', url: '${href}' });
        window.parent.postMessage({ type: 'traverse', url: '${href}' }, '*');
        return false;
      `
      )
    }

    const script = document.createElement('script')
    // script.innerHTML = `window.history.pushState({}, '', window.location.href);`
    // script.innerHTML = `
    //   window.history.pushState(null, '', window.location.href);

    //   window.onInternalLinkClick = function(href) {
    //     history.pushState({}, '', href);
    //     // window.dispatchEvent(new Event('popstate'));
    //   };

    //   const originalPushState = history.pushState;
    //   history.pushState = function () {
    //     originalPushState.apply(this, arguments);
    //     window.parent.postMessage({ type: 'traverse', url: location.href }, '*');
    //   };

    //   window.addEventListener('popstate', () => {
    //     window.parent.postMessage({ type: 'traverse', url: location.href }, '*');
    //   });
    // `
    document.body.appendChild(script)

    const modifiedHTML = '<!DOCTYPE html>' + document.documentElement.outerHTML

    // await c.env.PAGE_CACHE.put(cacheKey, modifiedHTML, {
    //   expirationTtl: 60 * 60 * 24 * 30, // 30 days
    // })

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
