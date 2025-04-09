type Props = {
  children: React.ReactNode
  cn?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export const GamePanelButton = ({ children, cn, ...props }: Props) => {
  return (
    <button className={`bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition ${cn}`} {...props}>
      {children}
    </button>
  )
}
