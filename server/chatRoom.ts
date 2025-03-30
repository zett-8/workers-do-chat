export class ChatRoom {
  state: DurableObjectState
  messages: { user: string; message: string }[] = []
  connections: Map<string, WebSocket> = new Map()

  constructor(state: DurableObjectState) {
    this.state = state

    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<ChatRoom['messages']>('messages')
      this.messages = stored ?? []
    })
  }

  async fetch(req: Request) {
    if (req.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair()
      const id = crypto.randomUUID()
      server.accept()
      this.connections.set(id, server)

      // Send existing messages
      for (const msg of this.messages) {
        server.send(JSON.stringify(msg))
      }

      server.addEventListener('message', async (e) => {
        try {
          const { user, message } = JSON.parse(e.data)
          const entry = { user, message }

          this.messages.push(entry)
          await this.state.storage.put('messages', this.messages)
          this.broadcast(JSON.stringify(entry))
        } catch {
          console.warn('invalid message format', e.data)
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
                await this.state.storage.delete('messages')
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
