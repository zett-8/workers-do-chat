// src/pages/GamePage.tsx
import React, { useRef, useState, useEffect } from 'react'

const START_PAGE = 'https://ja.wikipedia.org/wiki/哲学'

const GamePage = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const leftIframeRef = useRef<HTMLIFrameElement>(null)
  const rightIframeRef = useRef<HTMLIFrameElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [leftWidth, setLeftWidth] = useState(50) // %
  const [iframeVisible, setIframeVisible] = useState(true)
  const hasLoadedOnce = useRef(false)

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

  useEffect(() => {
    if (!hasLoadedOnce.current && leftIframeRef.current && rightIframeRef.current) {
      leftIframeRef.current.src = `http://localhost:8787/api/proxy?url=${encodeURIComponent(START_PAGE)}`
      rightIframeRef.current.src = `http://localhost:8787/api/proxy?url=${encodeURIComponent(START_PAGE)}`
      hasLoadedOnce.current = true
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-screen flex relative select-none overflow-hidden">
      <div ref={leftRef} className="h-full relative" style={{ width: `${leftWidth}%` }}>
        <iframe
          ref={leftIframeRef}
          className="w-full h-full border-none"
          title="You"
          style={{ visibility: iframeVisible ? 'visible' : 'hidden' }}
        />
        {!iframeVisible && <div className="absolute inset-0 bg-gray-100 pointer-events-none" />}
      </div>

      <div
        onMouseDown={handleMouseDown}
        className={`w-1.5 cursor-col-resize z-10 ${isDragging ? 'bg-blue-700' : 'bg-gray-300 hover:bg-gray-500'}`}
      />

      <div ref={rightRef} className="h-full relative" style={{ width: `${100 - leftWidth}%` }}>
        <iframe
          ref={rightIframeRef}
          className="w-full h-full border-none pointer-events-none"
          title="Opponent"
          style={{ visibility: iframeVisible ? 'visible' : 'hidden' }}
        />
        {!iframeVisible && <div className="absolute inset-0 bg-gray-100 pointer-events-none" />}
      </div>
    </div>
  )
}

export default GamePage
