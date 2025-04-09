import { lazy, Suspense } from 'react'
import { data } from 'react-router'
import type { Route } from './+types/home'

const ParticlesClient = lazy(() => import('@app/components/particles.client'))

export function meta(_: Route.MetaArgs) {
  return [{ title: 'New React Router App' }, { name: 'description', content: 'Welcome to React Router!' }]
}

export const loader = async (_: Route.LoaderArgs) => {
  return data({})
}

export default function Home(_: Route.ComponentProps) {
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
        <h1 className="text-6xl font-black text-gray-700">Wikitraverze</h1>
        <p className="text-lg text-gray-500">Choose a game</p>

        <div className="grid grid-cols-2 gap-4 w-full max-w-md mx-auto">
          <a
            href="/chat/one"
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Play Solo
          </a>
          <a
            href="/chat/two"
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Play Online
          </a>
        </div>
      </div>
    </main>
  )
}
