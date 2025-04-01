import { useRef, useState, useEffect } from 'react'
import { data, useParams } from 'react-router'
import { getWsUrl } from '@app/utils/api.client'
import { createResizeHandler } from '@app/utils/resizeUtils'
import { getOrCreateUserId } from '@app/utils/userId.server'
import type { Ping } from '../../../server/gameRoom'
import type { Route } from './+types/$gameId'

const START_PAGE = 'https://ja.wikipedia.org/wiki/哲学'

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { userId, headers } = await getOrCreateUserId(request)
  return data({ userId, wikiOrigin: 'https://ja.wikipedia.org' }, { headers })
}

const GamePage = ({ loaderData }: Route.ComponentProps) => {
  const { userId, wikiOrigin } = loaderData
  const { gameId } = useParams()
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

    ws.onopen = () => console.log('WebSocket opened')
    ws.onerror = (event) => console.error('WebSocket error', event)

    ws.onmessage = (event) => {
      const ping = JSON.parse(event.data) as Ping
      console.log('-onmessage', ping)
      const { type, player, data } = ping

      if (type === 'traversed') {
        if (!rightIframeRef.current || !leftIframeRef.current) return

        if (player === userId) {
          leftIframeRef.current.src = `/api/proxy?url=${encodeURIComponent(data)}`
        } else {
          rightIframeRef.current.src = `/api/proxy?url=${encodeURIComponent(data)}`
        }
      }
    }

    ws.onclose = () => console.log('WebSocket closed')
    return () => ws.close()
  }, [gameId, userId])

  // Detect page change
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, url } = event.data || {}

      if (type === 'pm_traverse' && typeof url === 'string') {
        // const msg: Ping = { type: 'traverse', player: 'player1', data: url }
        // socketRef.current?.send(JSON.stringify(msg))

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

  useEffect(() => {
    if (!hasLoadedOnce.current && leftIframeRef.current && rightIframeRef.current) {
      leftIframeRef.current.src = `/api/proxy?url=${encodeURIComponent(START_PAGE)}`
      rightIframeRef.current.src = `/api/proxy?url=${encodeURIComponent(START_PAGE)}`
      hasLoadedOnce.current = true

      console.log('set initial src')
    }
  }, [])

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="w-full h-14 bg-black text-white flex items-center px-4 justify-between text-sm z-20">
        <div className="font-bold">Wikitraverze</div>
        <div className="flex gap-4 items-center">
          <span>Start: 哲学</span>
          <span>Goal: 芸術</span>
          <button className="bg-white text-black px-3 py-1 rounded hover:bg-gray-200 transition">リタイア</button>
        </div>
      </header>

      {/* Game Area */}
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
  )
}

export default GamePage
