declare global {
  type HonoENV = {
    Bindings: { CHAT_ROOM: DurableObjectNamespace }
    Variables: { _ }
  }
}

export {}
