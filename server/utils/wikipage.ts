export const getRandomWikiPage = async () => {
  const res = await fetch(
    'https://ja.wikipedia.org/w/api.php?format=json&action=query&list=random&rnlimit=2&rnnamespace=0'
  )
  if (!res.ok)
    return [
      { title: '台北双子星', id: 2851889 },
      { title: '吉凶', id: 1617081 },
    ]
  // @ts-expect-error response is not typed
  const [page1, page2] = (await res.json()).query.random as { title: string; id: number }[]
  return [page1, page2]
}
