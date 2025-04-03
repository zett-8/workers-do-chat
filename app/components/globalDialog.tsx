import { useState, type ReactNode, type MutableRefObject, useEffect } from 'react'

type GlobalDialogProps = {
  isOpen: boolean
  closeDialog: () => void
  children?: ReactNode
  socketRef: MutableRefObject<WebSocket | null>
  userId: string
  wikiOrigin: string
}

export function GlobalDialog({ isOpen, closeDialog, children, socketRef, userId, wikiOrigin }: GlobalDialogProps) {
  const [startPageTitle, setStartPageTitle] = useState('')
  const [goalPageTitle, setGoalPageTitle] = useState('')
  const [startPageTitleError, setStartPageTitleError] = useState<string | null>(null)
  const [goalPageTitleError, setGoalPageTitleError] = useState<string | null>(null)

  const getRandomPage = async () => {
    const res = await fetch('/api/random')
    if (!res.ok) throw new Error('err')

    const data = (await res.json()) as { title: string; id: number }[]
    return [data[0], data[1]]
  }

  const randomStart = async () => {
    const data = await getRandomPage()
    setStartPageTitle(data[0].title)
  }

  const randomGoal = async () => {
    const data = await getRandomPage()
    setGoalPageTitle(data[1].title)
  }

  const startGame = async () => {
    socketRef.current?.send(
      JSON.stringify({
        type: 'wantToStartGame',
        player: userId,
        data: {
          startPage: `${wikiOrigin}/wiki/${encodeURIComponent(startPageTitle.replaceAll(' ', '_'))}`,
          goalPage: `${wikiOrigin}/wiki/${encodeURIComponent(goalPageTitle.replaceAll(' ', '_'))}`,
        },
        date: Date.now(),
      })
    )
    closeDialog()
  }

  const checkPageExists = async (title: string, signal: AbortSignal) => {
    const res = await fetch(`/api/page/check/${title}`, { signal })
    if (!res.ok) return false

    const data = (await res.json()) as { result: boolean }
    return data.result
  }

  useEffect(() => {
    if (!startPageTitle) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      const result = await checkPageExists(startPageTitle, controller.signal)
      if (!result) setStartPageTitleError('存在しないページです')
      else setStartPageTitleError(null)
    }, 300)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [startPageTitle])

  useEffect(() => {
    if (!goalPageTitle) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      const result = await checkPageExists(goalPageTitle, controller.signal)
      if (!result) setGoalPageTitleError('存在しないページです')
      else setGoalPageTitleError(null)
    }, 300)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [goalPageTitle])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div
          className="fixed inset-0 bg-black/70 transition-opacity"
          onClick={closeDialog}
          onKeyDown={(e) => e.key === 'Enter' && closeDialog()}
          role="button"
          tabIndex={0}
          aria-label="Close dialog"
        />

        <div className="relative transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all w-full max-w-md">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-20 text-sm font-medium">Start:</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Enter start page"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={startPageTitle}
                      onChange={(e) => setStartPageTitle(e.currentTarget.value)}
                    />
                    {startPageTitleError && <div className="text-red-500 text-xs mt-1">{startPageTitleError}</div>}
                  </div>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    onClick={randomStart}
                  >
                    🔄
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 text-sm font-medium">Goal:</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Enter goal page"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={goalPageTitle}
                      onChange={(e) => setGoalPageTitle(e.currentTarget.value)}
                    />
                    {goalPageTitleError && <div className="text-red-500 text-xs mt-1">{goalPageTitleError}</div>}
                  </div>
                  <button
                    type="button"
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    onClick={randomGoal}
                  >
                    🔄
                  </button>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed"
                  onClick={startGame}
                  disabled={!!startPageTitleError || !!goalPageTitleError || !startPageTitle || !goalPageTitle}
                >
                  START!
                </button>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
