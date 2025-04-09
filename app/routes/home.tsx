import { lazy, Suspense, useState } from 'react'
import type { Route } from './+types/home'

const ParticlesClient = lazy(() => import('@app/components/particles.client'))

export default function Home(_: Route.ComponentProps) {
  const [roomId, setRoomId] = useState('')

  return (
    <main className="flex h-dvh items-center justify-center">
      {/* BG */}
      <div id="tsparticles" className="-z-10" />
      {typeof window !== 'undefined' && (
        <Suspense fallback={null}>
          <ParticlesClient />
        </Suspense>
      )}
      {/* BG */}

      <div className="grid gap-8 text-center">
        <h1 className="text-6xl font-black text-[#17252A] tracking-wider">Wikitraverze</h1>
        <p className="text-lg text-gray-500">Choose a game</p>

        <div className="grid grid-cols-2 gap-4 w-full max-w-md mx-auto">
          <A href={`/game/${Math.random().toString(36).substring(2, 15)}?playMode=solo`}>Play Solo</A>
          <A href="/chat/two">Random Match</A>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-md mx-auto">
          <input
            type="text"
            placeholder="Enter Room ID"
            className="px-6 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B7A78]"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <A href={`/game/${roomId}?playMode=vs`}>Start with Room ID</A>
        </div>
      </div>
    </main>
  )
}

const A = ({ children, href }: { children: React.ReactNode; href: string }) => {
  return (
    <a
      href={href}
      className="px-6 py-3 bg-[#2B7A78] text-white font-medium rounded-lg hover:bg-[#3AAFA9] transition-colors duration-200"
    >
      {children}
    </a>
  )
}
