import { useEffect, useState } from 'react'

export const useGetOrCreateUserId = () => {
  const [userId, setUserId] = useState('')

  useEffect(() => {
    let savedUserId = window.localStorage.getItem('wikitraverze-userid')
    if (!savedUserId) {
      const randomName = 'Anonymous' + Math.floor(Math.random() * 10000)
      savedUserId = randomName
      localStorage.setItem('wikitraverze-userid', randomName)
    }
    setUserId(savedUserId)
  }, [])

  return userId
}
