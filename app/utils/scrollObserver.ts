import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { ProtocolHandler } from './protocolHandlers'

interface ScrollEffectOptions {
  iframeRef: RefObject<HTMLIFrameElement | null>
  protocolHandler: ProtocolHandler
  deps?: React.DependencyList
}

export const useScrollEffect = ({ iframeRef, protocolHandler, deps = [] }: ScrollEffectOptions) => {
  useEffect(() => {
    if (!iframeRef.current) return

    let lastScrollSent = 0
    let intervalId: NodeJS.Timeout

    const onScroll = () => {
      try {
        const now = Date.now()
        if (now - lastScrollSent < 100) return
        lastScrollSent = now

        const el = iframeRef.current?.contentDocument?.documentElement
        if (!el) return
        const ratio = el.scrollTop / el.scrollHeight
        protocolHandler.sendScroll(ratio)
      } catch (e) {
        console.error('error onScroll', e)
      }
    }

    const setupScrollListener = () => {
      try {
        iframeRef.current?.contentWindow?.addEventListener('scroll', onScroll)
      } catch (e) {
        console.error('error setup', e)
      }
    }

    const start = () => {
      intervalId = setInterval(setupScrollListener, 1000) // 遅延読み込みに対応
    }

    const cleanup = () => {
      clearInterval(intervalId)
      try {
        iframeRef.current?.contentWindow?.removeEventListener('scroll', onScroll)
      } catch (e) {
        console.error('error cleanup', e)
      }
    }

    start()
    return cleanup
  }, deps)
}
