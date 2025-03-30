import { data } from 'react-router'
import type { Route } from './+types/home'

export function meta(_: Route.MetaArgs) {
  return [{ title: 'New React Router App' }, { name: 'description', content: 'Welcome to React Router!' }]
}

export const loader = async (_: Route.LoaderArgs) => {
  return data({})
}

export default function Home(_: Route.ComponentProps) {
  return (
    <main className="flex h-dvh items-center justify-center">
      <div className="grid gap-8 text-center">
        <h1 className="text-6xl font-black text-gray-100">Workers D.O. Chat</h1>
        <p className="text-xl text-gray-500">Choose a chat room</p>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-md mx-auto">
          <a
            href="/chat/one"
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Room One
          </a>
          <a
            href="/chat/two"
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Room Two
          </a>
          <a
            href="/chat/three"
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Room Three
          </a>
          <a
            href="/chat/four"
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Room Four
          </a>
        </div>
      </div>
    </main>
  )
}
