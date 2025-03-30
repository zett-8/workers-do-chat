import { useEffect, useState } from 'react'

export const useGetOrCreateUser = () => {
  const [user, setUser] = useState('')

  useEffect(() => {
    let savedUser = window.localStorage.getItem('chat-user')
    if (!savedUser) {
      const randomName = 'Anonymous' + Math.floor(Math.random() * 10000)
      savedUser = randomName
      localStorage.setItem('chat-user', randomName)
    }
    setUser(savedUser)
  }, [])

  return user
}
