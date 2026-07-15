'use client'

import { useState, useEffect } from 'react'

export function useARSupport() {
  const [isSupported, setIsSupported] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkAR = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
      setIsMobile(mobile)

      // Check for WebXR or Scene Viewer support
      const hasWebXR = 'xr' in navigator
      const isAndroid = /Android/i.test(navigator.userAgent)
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

      setIsSupported(hasWebXR || isAndroid || isIOS)
    }

    checkAR()
  }, [])

  return { isSupported, isMobile }
}