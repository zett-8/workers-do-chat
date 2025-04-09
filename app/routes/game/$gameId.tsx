import { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { data, Link, useParams, useSearchParams } from 'react-router'
import { GlobalDialog, IframeDialog, GameDialog } from '@app/components/globalDialog'
import { getWsUrl } from '@app/utils/api.client'
import { ProtocolHandler } from '@app/utils/protocolHandlers'
import { createResizeHandler } from '@app/utils/resizeUtils'
import { getOrCreateUserId } from '@app/utils/userId.server'
import type { Protocol } from '../../../server/gameRoom'
import type { Route } from './+types/$gameId'

type PageData = { url: string; date: number }

const PLAY_MODE = {
  vs: 'vs',
  solo: 'solo',
  random: 'random',
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { userId, headers } = await getOrCreateUserId(request)
  return data({ userId, wikiOrigin: 'https://ja.wikipedia.org' }, { headers })
}

const GamePage = ({ loaderData }: Route.ComponentProps) => {
  const { userId, wikiOrigin } = loaderData
  const { gameId } = useParams()
  const [searchParams] = useSearchParams()
  // @ts-expect-error index typere
  const playMode = (PLAY_MODE[searchParams.get('playMode')] || 'vs') as keyof typeof PLAY_MODE
  const containerRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const leftIframeRef = useRef<HTMLIFrameElement>(null)
  const rightIframeRef = useRef<HTMLIFrameElement>(null)
  const [_, setIsDragging] = useState(false)
  const [leftWidth, setLeftWidth] = useState(playMode === 'solo' ? 100 : 50) // %
  const [iframeVisible, setIframeVisible] = useState(true)
  const hasLoadedOnce = useRef(false)
  const socketRef = useRef<WebSocket | null>(null)
  const lastScrollSent = useRef(0)
  const [showOpponentPanel, setShowOpponentPanel] = useState(true)

  const [connection, setConnection] = useState<'loading' | 'error' | 'connected' | 'disconnected'>('loading')
  const [roomIsReady, setRoomIsReady] = useState(false)

  const [startPage, setStartPage] = useState<PageData | null>(null)
  const [goalPage, setGoalPage] = useState<PageData | null>(null)
  const [, setOpponentPage] = useState<PageData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [popupUrl, setPopupUrl] = useState<string | null>(null)

  const [gameResult, setGameResult] = useState<boolean | null>(null)

  const [onGame, setOnGame] = useState(false)
  const onGameRef = useRef(onGame)
  useEffect(() => {
    onGameRef.current = onGame
  }, [onGame])

  const protocolHandler = new ProtocolHandler(
    userId,
    socketRef,
    {
      setOnGame,
      setGameResult,
      setRoomIsReady,
      setStartPage,
      setGoalPage,
      setOpponentPage,
    },
    {
      leftIframeRef,
      rightIframeRef,
    }
  )

  const handleMouseDown = createResizeHandler({
    containerRef,
    currentWidth: leftWidth,
    setWidth: setLeftWidth,
    setIsDragging,
    setIframeVisible,
  })

  // WebSocket
  useEffect(() => {
    const ws = new WebSocket(getWsUrl() + `/${gameId}`)

    socketRef.current = ws

    ws.onopen = () => {
      protocolHandler.sayHello(playMode)
      console.log('WebSocket opened')
      setConnection('connected')
    }

    ws.onerror = (event) => {
      console.error('WebSocket error', event)
      setConnection('error')
    }

    ws.onmessage = (event) => {
      protocolHandler.handle(JSON.parse(event.data) as Protocol)
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
      setConnection('disconnected')
    }

    return () => ws.close()
  }, [gameId, userId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!leftIframeRef.current) return

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
  }, [connection])

  useLayoutEffect(() => {
    console.log('useLayoutEffect ----- ', hasLoadedOnce.current, leftIframeRef.current, rightIframeRef.current)
    if (!hasLoadedOnce.current && leftIframeRef.current && rightIframeRef.current) {
      if (leftIframeRef.current.src || rightIframeRef.current.src) return

      leftIframeRef.current.src = `/api/proxy?url=https://ja.wikipedia.org/wiki/%E3%83%A1%E3%82%A4%E3%83%B3%E3%83%9A%E3%83%BC%E3%82%B8`
      rightIframeRef.current.src = `/api/proxy?url=https://ja.wikipedia.org/wiki/%E3%83%A1%E3%82%A4%E3%83%B3%E3%83%9A%E3%83%BC%E3%82%B8`
      hasLoadedOnce.current = true

      console.log('set initial src')
    }
  }, [connection, roomIsReady])

  const retireGame = async () => {
    if (confirm('ギブアップしますか?')) {
      socketRef.current?.send(JSON.stringify({ type: 'action', player: userId, data: 'retireGame', date: Date.now() }))
    }
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
  // if (!roomIsReady) {
  //   return (
  //     <div className="w-full h-screen flex items-center justify-center bg-black text-white">
  //       <div className="text-xl font-medium animate-pulse">Waiting for an opponent...</div>
  //     </div>
  //   )
  // }
  // ================================================ ↑ Wainting for an opponent ↑ ================================================

  return (
    <>
      <div className="w-full h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <header className="w-full h-14 bg-gray-900 text-white flex items-center px-4 justify-between text-sm z-20 shadow-md">
          <div className="font-bold">
            <Link to="/">Wikitraverze</Link>
          </div>
          <div className="flex gap-4 items-center text-lg">
            {onGame && startPage?.url && goalPage?.url && (
              <>
                <span>
                  <button className="hover:underline" onClick={() => setPopupUrl(startPage.url)}>
                    🚩{decodeURIComponent(startPage.url.split('/wiki/')[1]).replaceAll('_', ' ')}
                  </button>{' '}
                  <span className="text-gray-400 text-sm">→ → →</span>{' '}
                  <button className="hover:underline" onClick={() => setPopupUrl(goalPage.url)}>
                    {decodeURIComponent(goalPage.url.split('/wiki/')[1]).replaceAll('_', ' ')} 🏁
                  </button>
                </span>
                {/* {opponentPage?.url && (
                  <span>
                    Opponent:{' '}
                    <button className="hover:underline" onClick={() => setPopupUrl(opponentPage.url)}>
                      {decodeURIComponent(opponentPage.url.split('/wiki/')[1]).replaceAll('_', ' ')}
                    </button>
                  </span>
                )} */}
              </>
            )}
          </div>
          <div>
            {playMode !== 'solo' && (
              <button
                className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition mr-2"
                onClick={() => {
                  setLeftWidth(showOpponentPanel ? 100 : 50)
                  setShowOpponentPanel(!showOpponentPanel)
                }}
              >
                {showOpponentPanel ? '📺' : '📺✂️📺'}
              </button>
            )}
            {onGame ? (
              <button
                className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition"
                onClick={retireGame}
              >
                GIVE UP💀
              </button>
            ) : (
              <button
                className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition"
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
              ref={leftIframeRef}
              className="w-full h-full border-none"
              title="You"
              style={{ visibility: iframeVisible ? 'visible' : 'hidden' }}
            />
            {!iframeVisible && <div className="absolute inset-0 bg-gray-100 pointer-events-none" />}
          </div>

          {showOpponentPanel && playMode !== 'solo' && (
            <div
              role="slider"
              aria-valuenow={0}
              tabIndex={0}
              onKeyDown={() => null}
              onMouseDown={handleMouseDown}
              className={`w-1.5 cursor-col-resize bg-gray-300 hover:bg-gray-500 z-10 ${showOpponentPanel ? 'block' : 'hidden'}`}
              aria-orientation="vertical"
            />
          )}

          <div
            ref={rightRef}
            className={`h-full relative ${showOpponentPanel ? 'block' : 'hidden'}`}
            style={{ width: `${100 - leftWidth}%` }}
          >
            <iframe
              ref={rightIframeRef}
              className="w-full h-full border-none pointer-events-none"
              title="Opponent"
              scrolling="no"
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
