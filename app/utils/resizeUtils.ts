import type { RefObject } from 'react'

export const createResizeHandler = ({
  containerRef,
  currentWidth,
  setWidth,
  setIsDragging,
}: {
  containerRef: RefObject<HTMLElement | null>
  currentWidth: number
  setWidth: (width: number) => void
  setIsDragging: (dragging: boolean) => void
}) => {
  return (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    const container = containerRef.current
    if (!container) return

    const startX = e.clientX
    const containerWidth = container.getBoundingClientRect().width
    const startLeftWidth = (currentWidth / 100) * containerWidth

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      let newLeft = startLeftWidth + deltaX

      const min = containerWidth * 0.1
      const max = containerWidth * 0.9
      newLeft = Math.max(min, Math.min(max, newLeft))

      const newPercent = (newLeft / containerWidth) * 100
      setWidth(newPercent)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
}
