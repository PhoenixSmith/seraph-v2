import { useCallback, useRef } from 'react'

const SOUNDS = {
  success: '/sounds/success.wav',
  rejected: '/sounds/rejected.wav',
  levelup: '/sounds/levelup.wav',
  click: '/sounds/click.wav',
} as const

type SoundName = keyof typeof SOUNDS

export function useSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback((sound: SoundName) => {
    // Stop any currently playing sound
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    const audio = new Audio(SOUNDS[sound])
    audioRef.current = audio
    audio.play().catch(() => {
      // Ignore autoplay errors (user hasn't interacted yet)
    })
  }, [])

  return { play }
}
