import { useRef, useState, useCallback } from 'react'
import { toPng } from 'html-to-image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Share2, Loader2, Check } from 'lucide-react'
import { ShareCard } from './ShareCard'
import type * as api from '@/lib/api'

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: api.User
  stats: api.ProfileStats
  achievements: api.Achievement[]
}

export function ShareModal({
  open,
  onOpenChange,
  user,
  stats,
  achievements,
}: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateImage = useCallback(async (): Promise<string | null> => {
    if (!cardRef.current) return null

    try {
      // Wait for images to load
      const images = cardRef.current.querySelectorAll('img')
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) {
                resolve(null)
              } else {
                img.onload = () => resolve(null)
                img.onerror = () => resolve(null)
              }
            })
        )
      )

      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
      })

      return dataUrl
    } catch (error) {
      console.error('Failed to generate image:', error)
      return null
    }
  }, [])

  const handleDownload = useCallback(async () => {
    setIsGenerating(true)
    try {
      const dataUrl = await generateImage()
      if (!dataUrl) return

      const link = document.createElement('a')
      link.download = `kayrho-${user.name || 'reader'}-stats.png`
      link.href = dataUrl
      link.click()
    } finally {
      setIsGenerating(false)
    }
  }, [generateImage, user.name])

  const handleShare = useCallback(async () => {
    setIsGenerating(true)
    try {
      const dataUrl = await generateImage()
      if (!dataUrl) return

      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], 'kayrho-stats.png', { type: 'image/png' })

      // Check if Web Share API is available with files support
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'My Kayrho Bible Reading Stats',
          text: `Check out my Bible reading progress on Kayrho! ${stats.verses_read ?? 0} verses read, ${stats.current_streak} day streak!`,
          files: [file],
        })
      } else if (navigator.share) {
        // Fallback to sharing without file
        await navigator.share({
          title: 'My Kayrho Bible Reading Stats',
          text: `Check out my Bible reading progress on Kayrho! ${stats.verses_read ?? 0} verses read, ${stats.current_streak} day streak!`,
        })
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      // User cancelled or error occurred
      console.error('Share failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [generateImage, stats.verses_read, stats.current_streak])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Your Progress</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center py-4">
          <div className="scale-[0.85] origin-top">
            <ShareCard
              ref={cardRef}
              user={user}
              stats={stats}
              achievements={achievements}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download
          </Button>
          <Button
            className="flex-1"
            onClick={handleShare}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : copied ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Share'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
