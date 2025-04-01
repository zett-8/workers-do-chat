declare global {
  type HonoENV = {
    Bindings: { GAME_ROOM: DurableObjectNamespace; PAGE_CACHE: KVNamespace }
    Variables: { _ }
  }
}

export {}
