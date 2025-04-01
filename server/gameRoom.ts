export type Ping = { type: 'scroll' | 'traverse' | 'status'; player: string; data: string }

export class GameRoom {
  state: DurableObjectState
  pings: Ping[] = []
  gameHistory: Ping[] = []
  connections: Map<string, WebSocket> = new Map()

  constructor(state: DurableObjectState) {
    this.state = state

    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<GameRoom['gameHistory']>('gameHistory')
      this.gameHistory = stored ?? [{ type: 'status', player: 'system', data: 'game started' }]
    })
  }

  async fetch(req: Request) {
    if (req.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair()
      const id = crypto.randomUUID()
      server.accept()
      this.connections.set(id, server)

      // Send existing game history
      for (const msg of this.gameHistory) {
        server.send(JSON.stringify(msg))
      }

      server.addEventListener('message', async (e) => {
        try {
          const { type, player, data } = JSON.parse(e.data) as Ping
          const entry = { type, player, data }

          if (type !== 'scroll') {
            this.gameHistory.push(entry)
          }

          await this.state.storage.put('gameHistory', this.gameHistory)
          this.broadcast(JSON.stringify(entry))
        } catch {
          console.warn('invalid ping format', e.data)
        }
      })

      server.addEventListener('close', () => {
        this.connections.delete(id)

        if (this.connections.size === 0) {
          this.state.waitUntil(
            (async () => {
              await new Promise((r) => setTimeout(r, 5000))
              if (this.connections.size === 0) {
                // Delete message history if no connections
                await this.state.storage.delete('gameHistory')
              }
            })()
          )
        }
      })

      server.addEventListener('error', () => {
        console.log('❌ server error')
      })

      return new Response(null, { status: 101, webSocket: client })
    }

    return new Response('not found', { status: 404 })
  }

  broadcast(msg: string) {
    for (const [, ws] of this.connections) {
      try {
        ws.send(msg)
      } catch (e) {
        console.error(e)
      }
    }
  }
}
