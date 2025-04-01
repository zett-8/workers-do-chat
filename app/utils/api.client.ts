export const getAPIBaseUrl = () => {
  if (typeof window === 'undefined') return ''

  return `${window.location.protocol}//${getHost()}`
}

const getHost = () => {
  if (typeof window === 'undefined') return ''

  if (window.location.hostname === 'localhost') return 'localhost:8787'

  return new URL(window.location.href).host
}

export const getWsUrl = () => {
  if (typeof window === 'undefined') return ''

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'

  return `${protocol}://${getHost()}/api/ws`
}
