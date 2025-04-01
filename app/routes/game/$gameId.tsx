import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router'
import { getAPIBaseUrl, getWsUrl } from '@app/utils/api.client'
import type { Ping } from '../../../server/gameRoom'
import type { Route } from './+types/$gameId'

const START_PAGE = 'https://ja.wikipedia.org/wiki/哲学'

export const loader = async (_: Route.LoaderArgs) => {
  return { userId: '429882947', wikiOrigin: 'https://ja.wikipedia.org' }
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setIframeVisible(false) // iframe 一時的に非表示

    const container = containerRef.current
    if (!container) return

    const startX = e.clientX
    const containerWidth = container.getBoundingClientRect().width
    const startLeftWidth = (leftWidth / 100) * containerWidth

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      let newLeft = startLeftWidth + deltaX

      const min = containerWidth * 0.1
      const max = containerWidth * 0.9
      newLeft = Math.max(min, Math.min(max, newLeft))

      const newPercent = (newLeft / containerWidth) * 100
      setLeftWidth(newPercent)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIframeVisible(true) // iframe 再表示（再フェッチさせない）
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // WS
  useEffect(() => {
    const wsUrl = getWsUrl()
    const ws = new WebSocket(wsUrl + `/${gameId}`)

    socketRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket opened')
    }

    ws.onerror = (event) => {
      console.error('WebSocket error', event)
    }

    ws.onmessage = (event) => {
      const ping = JSON.parse(event.data) as Ping
      console.log(ping)
      if (ping.type === 'traverse') {
        if (rightIframeRef.current) {
          console.log('set opponent iframe', ping.data)
          const baseUrl = getAPIBaseUrl()
          rightIframeRef.current.src = `${baseUrl}/api/proxy?url=${encodeURIComponent(ping.data)}`
        }
      }
      //   setMessages((prev) => [...prev, message])
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
    }

    return () => {
      ws.close()
    }
  }, [gameId])

  const blockBrowserBack = useCallback(() => {
    alert('I do recommend you to not go back')
    window.history.go(1)
    // history.pushState(null, null, null)
  }, [])
  useEffect(() => {
    // 直前の履歴に現在のページを追加
    window.history.pushState(null, '', window.location.href)
    // 直前の履歴と現在のページのループ
    window.addEventListener('popstate', blockBrowserBack)
    return () => {
      window.removeEventListener('popstate', blockBrowserBack)
    }
  }, [blockBrowserBack])

  // Detect page change
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, url } = event.data || {}

      if (type === 'traverse' && typeof url === 'string') {
        // const msg: Ping = { type: 'traverse', player: 'player1', data: url }
        // socketRef.current?.send(JSON.stringify(msg))
        const baseUrl = getAPIBaseUrl()
        if (leftIframeRef.current) {
          leftIframeRef.current.src = `${baseUrl}/api/proxy?url=${wikiOrigin + url}`
          socketRef.current?.send(JSON.stringify({ type: 'traverse', player: userId, data: wikiOrigin + url }))
        }
      }
      console.log(event.data.type)
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  useEffect(() => {
    const baseUrl = getAPIBaseUrl()

    if (!hasLoadedOnce.current && leftIframeRef.current && rightIframeRef.current) {
      leftIframeRef.current.src = `${baseUrl}/api/proxy?url=${encodeURIComponent(START_PAGE)}`
      rightIframeRef.current.src = `${baseUrl}/api/proxy?url=${encodeURIComponent(START_PAGE)}`
      hasLoadedOnce.current = true
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

        <div onMouseDown={handleMouseDown} className="w-1.5 cursor-col-resize bg-gray-300 hover:bg-gray-500 z-10" />

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
