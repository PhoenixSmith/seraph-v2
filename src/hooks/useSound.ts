import { useCallback, useRef } from 'react'

const SOUNDS = {
  success: '/sounds/success.wav',
  rejected: '/sounds/rejected.wav',
  levelup: '/sounds/levelup.wav',
  click: '/sounds/click.wav',
} as const

type SoundName = keyof typeof SOUNDS

// Web Audio API for instant playback
let audioContext: AudioContext | null = null
const bufferCache: Map<SoundName, AudioBuffer> = new Map()
let isLoaded = false

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

async function preloadAllSounds() {
  if (isLoaded) return

  const ctx = getAudioContext()

  await Promise.all(
    Object.entries(SOUNDS).map(async ([name, src]) => {
      try {
        const response = await fetch(src)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
        bufferCache.set(name as SoundName, audioBuffer)
      } catch (e) {
        console.warn(`Failed to preload sound: ${name}`)
      }
    })
  )
  isLoaded = true
}

// Start preloading immediately
preloadAllSounds()

interface StagedSound {
  source: AudioBufferSourceNode
  gainNode: GainNode
}

export function useSound() {
  const stagedRef = useRef<StagedSound | null>(null)

  // Stage a sound on mousedown - prepares everything for instant playback
  const stage = useCallback((sound: SoundName) => {
    const buffer = bufferCache.get(sound)
    if (!buffer) return

    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    // Create and connect the source, ready to fire
    const source = ctx.createBufferSource()
    const gainNode = ctx.createGain()
    source.buffer = buffer
    source.connect(gainNode)
    gainNode.connect(ctx.destination)

    stagedRef.current = { source, gainNode }
  }, [])

  // Fire the staged sound instantly on mouseup
  const fire = useCallback(() => {
    if (stagedRef.current) {
      stagedRef.current.source.start(0)
      stagedRef.current = null
    }
  }, [])

  // Regular play for non-staged sounds
  const play = useCallback((sound: SoundName) => {
    const buffer = bufferCache.get(sound)
    if (!buffer) return

    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  }, [])

  return { play, stage, fire }
}
