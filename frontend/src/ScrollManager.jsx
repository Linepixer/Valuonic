import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Every screen opens at the top, Volver and the browser's back and forward included. In-app navigation keeps the
// window's scroll, so a screen would otherwise open wherever the last one was left. The browser's own restoration is
// turned off too: on back it would put the screen where it was instead, and it lands after this does.
export default function ScrollManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.history.scrollRestoration = 'manual'
  }, [])

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
