import { useRef, useState, useEffect } from 'react'
import { data, useParams, useSearchParams } from 'react-router'
import { GlobalDialog, IframeDialog, GameDialog } from '@app/components/globalDialog'
import { getWsUrl } from '@app/utils/api.client'
import { createResizeHandler } from '@app/utils/resizeUtils'
import { getOrCreateUserId } from '@app/utils/userId.server'
import type { Protocol } from '../../../server/gameRoom'
import type { Route } from './+types/$gameId'

type PageData = { url: string; date: number }

const PLAY_MODE = {
  vs: 'vs',
  solo: 'solo',
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { userId, headers } = await getOrCreateUserId(request)
  return data({ userId, wikiOrigin: 'https://ja.wikipedia.org' }, { headers })
}

const GamePage = ({ loaderData }: Route.ComponentProps) => {
  const { userId, wikiOrigin } = loaderData
  const { gameId } = useParams()
  const [searchParams] = useSearchParams()
  const playMode = PLAY_MODE[searchParams.get('playMode') as keyof typeof PLAY_MODE] || 'vs'
  const containerRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const leftIframeRef = useRef<HTMLIFrameElement>(null)
  const rightIframeRef = useRef<HTMLIFrameElement>(null)
  const [_, setIsDragging] = useState(false)
  const [leftWidth, setLeftWidth] = useState(50) // %
  const [iframeVisible, setIframeVisible] = useState(true)
  const hasLoadedOnce = useRef(false)
  const socketRef = useRef<WebSocket | null>(null)
  const lastScrollSent = useRef(0)

  const [connection, setConnection] = useState<'loading' | 'error' | 'connected' | 'disconnected'>('loading')
  const [roomIsReady, setRoomIsReady] = useState(false)

  const [startPage, setStartPage] = useState<PageData | null>(null)
  const [goalPage, setGoalPage] = useState<PageData | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [opponentPage, setOpponentPage] = useState<PageData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [popupUrl, setPopupUrl] = useState<string | null>(null)

  const [gameResult, setGameResult] = useState<boolean | null>(null)

  const [onGame, setOnGame] = useState(false)
  const onGameRef = useRef(onGame)
  useEffect(() => {
    onGameRef.current = onGame
  }, [onGame])

  const handleMouseDown = createResizeHandler({
    containerRef,
    currentWidth: leftWidth,
    setWidth: setLeftWidth,
    setIsDragging,
    setIframeVisible,
  })

  // WS
  useEffect(() => {
    const ws = new WebSocket(getWsUrl() + `/${gameId}`)

    socketRef.current = ws

    ws.onopen = () => {
      socketRef.current?.send(
        JSON.stringify({ type: 'hello', player: userId, data: { playMode: playMode }, date: Date.now() })
      )
      console.log('WebSocket opened')
      setConnection('connected')
    }

    ws.onerror = (event) => {
      console.error('WebSocket error', event)
      setConnection('error')
    }

    ws.onmessage = (event) => {
      const ping = JSON.parse(event.data) as Protocol
      console.log('-onmessage', ping)
      const { type, player, data } = ping

      if (type === 'winner') {
        setOnGame(false)
        if (Date.now() - ping.date > 3000) return

        if (player === userId) {
          setGameResult(true)
        } else {
          setGameResult(false)
        }
      }

      if (type === 'status' && data === 'roomIsReady') {
        setRoomIsReady(true)
      }

      if (type === 'command' && data === 'startGame') {
        setOnGame(true)
      }

      if (type === 'startUrl') {
        if (!startPage || startPage.date < ping.date) setStartPage({ url: ping.data, date: ping.date })
      }

      if (type === 'goalUrl') {
        if (!goalPage || goalPage.date < ping.date) setGoalPage({ url: ping.data, date: ping.date })
      }

      if (type === 'traversed') {
        if (!rightIframeRef.current || !leftIframeRef.current) return

        if (player === 'system') {
          leftIframeRef.current.src = `/api/proxy?url=${data}`
          rightIframeRef.current.src = `/api/proxy?url=${data}`
        } else if (player === userId) {
          leftIframeRef.current.src = `/api/proxy?url=${data}`
        } else {
          rightIframeRef.current.src = `/api/proxy?url=${data}`
          setOpponentPage({ url: data, date: ping.date })
        }
      }

      if (type === 'scrolled') {
        if (!rightIframeRef.current || player === userId) return

        const ratio = parseFloat(ping.data)
        if (!isNaN(ratio) && rightIframeRef.current?.contentWindow?.document?.documentElement) {
          const el = rightIframeRef.current.contentWindow.document.documentElement
          const y = el.scrollHeight * ratio
          rightIframeRef.current.contentWindow.scrollTo({ top: y, behavior: 'smooth' })
        }
      }
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
      setConnection('disconnected')
    }
    return () => ws.close()
  }, [gameId, userId])

  // Detect page change
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, url } = event.data || {}

      if (type === 'pm_traverse' && typeof url === 'string') {
        // const msg: Ping = { type: 'traverse', player: 'player1', data: url }
        // socketRef.current?.send(JSON.stringify(msg))
        if (!onGameRef.current) return

        if (leftIframeRef.current) {
          leftIframeRef.current.src = `/api/proxy?url=${wikiOrigin + url}`
          socketRef.current?.send(JSON.stringify({ type: 'traversed', player: userId, data: wikiOrigin + url }))
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  // Scroll 監視
  useEffect(() => {
    const iframe = leftIframeRef.current
    const onScroll = () => {
      try {
        const now = Date.now()
        if (now - lastScrollSent.current < 100) return
        lastScrollSent.current = now

        const el = iframe?.contentDocument?.documentElement
        if (!el) return
        const ratio = el.scrollTop / el.scrollHeight
        socketRef.current?.send(JSON.stringify({ type: 'scrolled', player: userId, data: ratio.toString() }))
      } catch (e) {
        console.error('error onScroll', e)
      }
    }
    const setup = () => {
      try {
        iframe?.contentWindow?.addEventListener('scroll', onScroll)
      } catch (e) {
        console.error('error setup', e)
      }
    }
    const interval = setInterval(setup, 1000) // 遅延読み込みに対応
    return () => {
      clearInterval(interval)
      try {
        iframe?.contentWindow?.removeEventListener('scroll', onScroll)
      } catch (e) {
        console.error('error cleanup', e)
      }
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedOnce.current && leftIframeRef.current && rightIframeRef.current) {
      // leftIframeRef.current.src = `/api/proxy?url=${START_PAGE.url}`
      // rightIframeRef.current.src = `/api/proxy?url=${START_PAGE.url}`
      hasLoadedOnce.current = true

      console.log('set initial src')
    }
  }, [])

  const retireGame = async () => {
    socketRef.current?.send(JSON.stringify({ type: 'action', player: userId, data: 'retireGame', date: Date.now() }))
  }

  // =============================================================================================================================
  // ================================================ ↓ Waiting for WS connection ================================================
  if (connection === 'loading') {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xl font-medium animate-pulse">Connecting to game server...</div>
        </div>
      </div>
    )
  }
  // ================================================ ↑ Waiting for WS connection ↑ ===============================================

  // ==============================================================================================================================
  // ================================================ ↓ Wainting for an opponent ↓ ================================================
  if (!roomIsReady) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-xl font-medium animate-pulse">Waiting for an opponent...</div>
      </div>
    )
  }
  // ================================================ ↑ Wainting for an opponent ↑ ================================================

  return (
    <>
      <div className="w-full h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <header className="w-full h-14 bg-black text-white flex items-center px-4 justify-between text-sm z-20">
          <div className="font-bold">Wikitraverze</div>
          <div className="flex gap-4 items-center">
            {onGame && startPage?.url && goalPage?.url && (
              <>
                <span>
                  Route:{' '}
                  <button className="hover:underline" onClick={() => setPopupUrl(startPage.url)}>
                    {decodeURIComponent(startPage.url.split('/wiki/')[1]).replaceAll('_', ' ')}
                  </button>{' '}
                  ➡️{' '}
                  <button className="hover:underline" onClick={() => setPopupUrl(goalPage.url)}>
                    {decodeURIComponent(goalPage.url.split('/wiki/')[1]).replaceAll('_', ' ')}
                  </button>
                </span>
                {opponentPage?.url && (
                  <span>
                    Opponent:{' '}
                    <button className="hover:underline" onClick={() => setPopupUrl(opponentPage.url)}>
                      {decodeURIComponent(opponentPage.url.split('/wiki/')[1]).replaceAll('_', ' ')}
                    </button>
                  </span>
                )}
              </>
            )}
          </div>
          <div>
            {onGame ? (
              <button
                className="bg-white text-black px-3 py-1 rounded hover:bg-gray-200 transition"
                onClick={retireGame}
              >
                RETIRE💀
              </button>
            ) : (
              <button
                className="bg-white text-black px-3 py-1 rounded hover:bg-gray-200 transition"
                onClick={() => setIsDialogOpen(true)}
              >
                New Game🎓
              </button>
            )}
          </div>
        </header>

        <div ref={containerRef} className="flex-1 flex relative select-none overflow-hidden">
          <div ref={leftRef} className="h-full relative" style={{ width: `${leftWidth}%` }}>
            <iframe
              // sandbox="allow-scripts allow-same-origin"
              ref={leftIframeRef}
              className="w-full h-full border-none"
              title="You"
              style={{ visibility: iframeVisible ? 'visible' : 'hidden' }}
            />
            {!iframeVisible && <div className="absolute inset-0 bg-gray-100 pointer-events-none" />}
          </div>

          <div
            role="slider"
            aria-valuenow={0}
            tabIndex={0}
            onKeyDown={() => null}
            onMouseDown={handleMouseDown}
            className="w-1.5 cursor-col-resize bg-gray-300 hover:bg-gray-500 z-10"
            aria-orientation="vertical"
          />

          <div ref={rightRef} className="h-full relative" style={{ width: `${100 - leftWidth}%` }}>
            <iframe
              // sandbox="allow-scripts allow-same-origin"
              ref={rightIframeRef}
              className="w-full h-full border-none pointer-events-none"
              title="Opponent"
              style={{ visibility: iframeVisible ? 'visible' : 'hidden' }}
            />
            {!iframeVisible && <div className="absolute inset-0 bg-gray-100 pointer-events-none" />}
          </div>
        </div>
      </div>
      <GlobalDialog
        isOpen={isDialogOpen}
        closeDialog={() => setIsDialogOpen(false)}
        socketRef={socketRef}
        userId={userId}
        wikiOrigin={wikiOrigin}
      />
      <IframeDialog closeDialog={() => setPopupUrl(null)} url={popupUrl} />
      <GameDialog closeDialog={() => setGameResult(null)} gameResult={gameResult} />
    </>
  )
}

export default GamePage
