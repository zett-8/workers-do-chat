import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useGetOrCreateUser } from '../../hooks/user'

type Message = {
  user: string
  message: string
}

export default function ChatRoom() {
  const { roomId } = useParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const socketRef = useRef<WebSocket | null>(null)
  const user = useGetOrCreateUser()

  useEffect(() => {
    // const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // const ws = new WebSocket(`${protocol}//${new URL(window.location.href).host}/api/ws/${roomId}`)

    const ws = new WebSocket(`ws://localhost:8787/api/ws/${roomId}`)

    socketRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket opened')
    }

    ws.onerror = (event) => {
      console.error('WebSocket error', event)
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as Message
      setMessages((prev) => [...prev, message])
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
    }

    return () => {
      ws.close()
    }
  }, [roomId])

  const send = () => {
    if (socketRef.current && message) {
      const payload = JSON.stringify({
        user,
        message,
      })
      socketRef.current.send(payload)
      setMessage('')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => {
          const messageUserId = m.user
          const text = m.message
          return (
            <div
              key={i}
              className={`p-3 rounded-lg max-w-xs ${
                messageUserId === user
                  ? 'ml-auto bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100 border border-gray-700'
              }`}
            >
              <div className="text-xs font-semibold mb-1 text-blue-300">
                {messageUserId === user ? 'You' : messageUserId}
              </div>
              <div className="text-gray-100">{text}</div>
            </div>
          )
        })}
      </div>
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-700 rounded-lg px-4 py-2 bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && send()}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            onClick={send}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
