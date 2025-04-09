import type React from 'react'
import type { Protocol } from '~/server/gameRoom'

type PageSetter = React.Dispatch<React.SetStateAction<{ url: string; date: number } | null>>

export class ProtocolHandler {
  constructor(
    private readonly userId: string,
    private readonly ws: React.RefObject<WebSocket | null>,
    private readonly funcs: {
      setOnGame: (onGame: boolean) => void
      setGameResult: (result: boolean) => void
      setRoomIsReady: (roomIsReady: boolean) => void
      setStartPage: PageSetter
      setGoalPage: PageSetter
      setOpponentPage: PageSetter
    },
    private readonly refs: {
      leftIframeRef: React.RefObject<HTMLIFrameElement | null>
      rightIframeRef: React.RefObject<HTMLIFrameElement | null>
    }
  ) {}

  sayHello(playMode: 'vs' | 'solo' | 'random') {
    this.ws.current?.send(
      JSON.stringify({ type: 'hello', player: this.userId, data: { playMode }, date: Date.now() })
    )
  }

  sendScroll(ratio: number) {
    this.ws.current?.send(JSON.stringify({ type: 'scrolled', player: this.userId, data: ratio.toString(), date: Date.now() }))
  }

  sendGiveUp() {
    this.ws.current?.send(JSON.stringify({ type: 'action', player: this.userId, data: 'retireGame', date: Date.now() }))
  }

  sendTraverse(url: string) {
    this.ws.current?.send(JSON.stringify({ type: 'traversed', player: this.userId, data: url, date: Date.now() }))
  }

  handle(protocol: Protocol) {
    console.log('@PH -- handling:', protocol)

    switch (protocol.type) {
      case 'winner': {
        this.funcs.setOnGame(false)
        if (Date.now() - protocol.date > 3000) return

        if (protocol.player === this.userId) {
          this.funcs.setGameResult(true)
        } else {
          this.funcs.setGameResult(false)
        }
        break
      }

      case 'status': {
        if (protocol.data === 'roomIsReady') {
          this.funcs.setRoomIsReady(true)
        }
        break
      }

      case 'command': {
        if (protocol.data === 'startGame') {
          this.funcs.setOnGame(true)
        }
        break
      }

      case 'startUrl': {
        this.funcs.setStartPage((pre) => {
          if (!pre || pre.date < protocol.date) {
            return { url: protocol.data, date: protocol.date }
          }
          return pre
        })

        break
      }

      case 'goalUrl': {
        this.funcs.setGoalPage((pre) => {
          if (!pre || pre.date < protocol.date) {
            return { url: protocol.data, date: protocol.date }
          }
          return pre
        })
        break
      }

      case 'traversed': {
        if (!this.refs.rightIframeRef.current || !this.refs.leftIframeRef.current) return

        if (protocol.player === 'system') {
          this.refs.leftIframeRef.current.src = `/api/proxy?url=${protocol.data}`
          this.refs.rightIframeRef.current.src = `/api/proxy?url=${protocol.data}`
        } else if (protocol.player === this.userId) {
          this.refs.leftIframeRef.current.src = `/api/proxy?url=${protocol.data}`
        } else {
          this.refs.rightIframeRef.current.src = `/api/proxy?url=${protocol.data}`
          this.funcs.setOpponentPage({ url: protocol.data, date: protocol.date })
        }
        break
      }

      case 'scrolled': {
        if (!this.refs.rightIframeRef.current || protocol.player === this.userId) return

        const ratio = parseFloat(protocol.data)
        if (!isNaN(ratio) && this.refs.rightIframeRef.current?.contentWindow?.document?.documentElement) {
          const el = this.refs.rightIframeRef.current.contentWindow.document.documentElement
          const y = el.scrollHeight * ratio
          this.refs.rightIframeRef.current.contentWindow.scrollTo({ top: y, behavior: 'smooth' })
        }
        break
      }

      default:
        console.warn(`[ProtocolHandler] Unknown message type: ${protocol.type}`)
        break
    }
  }
}
