import type { createResizeHandler } from '@app/utils/resizeUtils'

type Props = {
  showOpponentPanel: boolean
  playMode: string
  isDragging: boolean
  handleMouseDown: ReturnType<typeof createResizeHandler>
}

export const Slider = ({ showOpponentPanel, playMode, isDragging, handleMouseDown }: Props) => {
  if (!showOpponentPanel || playMode === 'solo') return null

  return (
    <div className="flex bg-gray-100">
      {isDragging && <span className="text-3xl text-gray-700 font-bold mx-4 self-center">←</span>}
      <div
        role="slider"
        aria-valuenow={0}
        tabIndex={0}
        onKeyDown={() => null}
        onMouseDown={handleMouseDown}
        className={`w-1 cursor-col-resize bg-gray-400 hover:bg-gray-500 z-10 ${showOpponentPanel ? 'block' : 'hidden'}`}
        aria-orientation="vertical"
      />
      {isDragging && <span className="text-3xl text-gray-700 font-bold mx-4 self-center">→</span>}
    </div>
  )
}
