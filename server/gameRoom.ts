export type ProtocolType =
  | 'scrolled'
  | 'traversed'
  | 'action'
  | 'startUrl'
  | 'goalUrl'
  | 'winner'
  | 'command'
  | 'wantToStartGame'
  | 'status'
  | 'hello'

export type Protocol =
  | {
      type: 'scrolled' | 'traversed' | 'action' | 'startUrl' | 'goalUrl' | 'winner' | 'command'
      player: string
      data: string
      date: number
    }
  | {
      type: 'wantToStartGame'
      player: string
      data: {
        startPage: string
        goalPage: string
      }
      date: number
    }
  | { type: 'hello'; player: string; data: { playMode: 'vs' | 'solo' | 'random' }; date: number }
  | { type: 'status'; player: 'system'; data: 'roomIsReady'; date: number }

type GameHistory = {
  type: 'traversed' | 'action' | 'startUrl' | 'goalUrl' | 'winner' | 'command'
  player: string
  data: string
  date: number
}

export class GameRoom {
  state: DurableObjectState
  players: string[] = []
  gameHistory: GameHistory[] = []
  connections: Map<string, WebSocket> = new Map()

  constructor(state: DurableObjectState) {
    this.state = state

    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<GameRoom['gameHistory']>('gameHistory')
      this.gameHistory = stored ?? []
    })
  }

  // return the latest date ping of the type
  retrieveLatestPing(type: GameHistory['type']) {
    const pings = this.gameHistory.filter((e) => e.type === type)
    return pings.sort((a, b) => a.date - b.date)[pings.length - 1]
  }

  getOpponent(player: string) {
    const opponent = this.players.find((p) => p !== player)
    return opponent
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
          const { type, player, data, date } = JSON.parse(e.data) as Protocol

          if (type !== 'scrolled' && type !== 'wantToStartGame' && type !== 'hello') {
            const entry = { type, player, data, date }
            this.gameHistory.push(entry)
          }

          if (type === 'hello') {
            if (!this.players.includes(player)) this.players.push(player)
            if (data.playMode === 'solo') {
              if (!this.players.includes('cpu')) this.players.push('cpu')
            }

            if (this.players.length === 2) {
              const entry = {
                type: 'status' as GameHistory['type'],
                player: 'system',
                data: 'roomIsReady',
                date: Date.now(),
              }
              this.gameHistory.push(entry)
              this.broadcast(JSON.stringify(entry))
            }
            return
          }

          if (type === 'action' && data === 'retireGame') {
            console.log('retireGame ----------- ', player)
            const opponent = this.getOpponent(player)
            console.log('opponent ----------- ', opponent)
            if (opponent) {
              const winnerEntry = {
                type: 'winner' as GameHistory['type'],
                player: opponent,
                data: 'win',
                date: Date.now(),
              }
              this.gameHistory.push(winnerEntry)
              await this.state.storage.put('gameHistory', this.gameHistory)
              this.broadcast(JSON.stringify(winnerEntry))
            }
            return
          }

          if (type === 'wantToStartGame') {
            const now = Date.now()
            const { startPage, goalPage } = data
            const entry1 = {
              type: 'startUrl' as GameHistory['type'],
              player: 'system',
              data: startPage,
              date: now,
            }
            const entry2 = {
              type: 'goalUrl' as GameHistory['type'],
              player: 'system',
              data: goalPage,
              date: now,
            }
            const entry3 = {
              type: 'traversed' as GameHistory['type'],
              player: this.players[0],
              data: startPage,
              date: now + 1,
            }
            const entry4 = {
              type: 'traversed' as GameHistory['type'],
              player: this.players[1],
              data: startPage,
              date: now + 1,
            }

            const entry5 = {
              type: 'command' as GameHistory['type'],
              player: 'system',
              data: 'startGame',
              date: now,
            }
            this.gameHistory.push(entry1)
            this.gameHistory.push(entry2)
            this.gameHistory.push(entry3)
            this.gameHistory.push(entry4)
            this.gameHistory.push(entry5)
            this.broadcast(JSON.stringify(entry1))
            this.broadcast(JSON.stringify(entry2))
            this.broadcast(JSON.stringify(entry3))
            this.broadcast(JSON.stringify(entry4))
            this.broadcast(JSON.stringify(entry5))
            await this.state.storage.put('gameHistory', this.gameHistory)
            return
          }

          await this.state.storage.put('gameHistory', this.gameHistory)
          const entry = { type, player, data, date }
          this.broadcast(JSON.stringify(entry))

          if (type === 'traversed') {
            const goalUrl = this.retrieveLatestPing('goalUrl')
            if (data === goalUrl.data) {
              const winnerEntry = { type: 'winner' as GameHistory['type'], player, data: 'win', date: Date.now() }
              // await this.state.storage.delete('gameHistory')
              this.gameHistory.push(winnerEntry)
              await this.state.storage.put('gameHistory', this.gameHistory)
              this.broadcast(JSON.stringify(winnerEntry))
            }
          }
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
