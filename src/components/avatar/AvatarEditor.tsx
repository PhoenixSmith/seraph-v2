import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Lock, ShoppingBag } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AVATAR_ACCESSORIES,
  type AvatarConfig,
  type AccessoryCategory,
  getAvatarLayers,
} from './UserAvatar'
import { getUserAvatarItems, type UserAvatarItem } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AvatarEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: AvatarConfig
  onConfigChange: (config: AvatarConfig) => void
  onNavigateToStore?: () => void
}

const CATEGORY_LABELS: Record<AccessoryCategory, string> = {
  face: 'Face',
  hat: 'Hat',
  top: 'Top',
  bottom: 'Bottom',
  misc: 'Misc',
  outfit: 'Outfit',
}

const CATEGORY_ORDER: AccessoryCategory[] = ['face', 'hat', 'top', 'bottom', 'misc', 'outfit']

export function AvatarEditor({
  open,
  onOpenChange,
  config,
  onConfigChange,
  onNavigateToStore,
}: AvatarEditorProps) {
  const [unlockedItems, setUnlockedItems] = useState<UserAvatarItem[]>([])
  const [loading, setLoading] = useState(true)

  // Load unlocked items when dialog opens
  useEffect(() => {
    if (open) {
      loadUnlockedItems()
    }
  }, [open])

  async function loadUnlockedItems() {
    try {
      setLoading(true)
      const items = await getUserAvatarItems()
      setUnlockedItems(items)
    } catch (error) {
      console.error('Failed to load unlocked items:', error)
      // Fallback: treat all items as unlocked if API fails
      setUnlockedItems([])
    } finally {
      setLoading(false)
    }
  }

  // Create a set of unlocked item keys for quick lookup
  const unlockedKeys = useMemo(() => {
    const keys = new Set<string>()
    unlockedItems.forEach((item) => keys.add(item.item_key))
    // Always include 'none' options
    keys.add('none')
    return keys
  }, [unlockedItems])

  // Get unlocked accessories for a category
  const getUnlockedAccessories = (category: AccessoryCategory) => {
    const all = AVATAR_ACCESSORIES[category]
    return all.filter((a) => unlockedKeys.has(a.id))
  }

  // Check if an accessory is unlocked
  const isUnlocked = (itemKey: string) => {
    return unlockedKeys.has(itemKey) || itemKey === 'none'
  }

  const cycleAccessory = (category: AccessoryCategory, direction: 'prev' | 'next') => {
    const unlocked = getUnlockedAccessories(category)
    if (unlocked.length === 0) return

    const currentIndex = unlocked.findIndex((a) => a.id === config[category])
    // If current item is locked or not found, start from first unlocked
    const safeIndex = currentIndex === -1 ? 0 : currentIndex
    const newIndex =
      direction === 'next'
        ? (safeIndex + 1) % unlocked.length
        : (safeIndex - 1 + unlocked.length) % unlocked.length

    const newConfig = { ...config, [category]: unlocked[newIndex].id }
    onConfigChange(newConfig)
  }

  const getCurrentAccessoryName = (category: AccessoryCategory): string => {
    const accessories = AVATAR_ACCESSORIES[category]
    const current = accessories.find((a) => a.id === config[category])
    return current?.name ?? 'None'
  }

  const previewLayers = getAvatarLayers(config)

  const handleGoToStore = () => {
    onOpenChange(false)
    onNavigateToStore?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Customize Avatar</span>
            {onNavigateToStore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoToStore}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                <ShoppingBag className="w-4 h-4 mr-1" />
                Store
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Avatar Preview - Layered */}
          <div className="relative w-40 h-40 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 ring-4 ring-border shadow-lg">
            {previewLayers.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={index === 0 ? 'Avatar base' : 'Avatar layer'}
                className="absolute inset-0 w-full h-full object-cover translate-y-[5%]"
                style={{ zIndex: index }}
                draggable={false}
              />
            ))}
          </div>

          {/* Accessory Controls */}
          <div className="w-full space-y-3">
            {CATEGORY_ORDER.map((category) => {
              const allAccessories = AVATAR_ACCESSORIES[category]
              const unlockedAccessories = getUnlockedAccessories(category)
              const currentIsLocked = !isUnlocked(config[category])
              const lockedCount = allAccessories.length - unlockedAccessories.length

              return (
                <div
                  key={category}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg bg-muted/50',
                    currentIsLocked && 'bg-red-50 dark:bg-red-900/20'
                  )}
                >
                  <span className="w-16 text-sm font-medium text-muted-foreground">
                    {CATEGORY_LABELS[category]}
                  </span>

                  <div className="flex-1 flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => cycleAccessory(category, 'prev')}
                      disabled={loading || unlockedAccessories.length <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span
                      className={cn(
                        'min-w-[120px] text-center text-sm font-medium truncate flex items-center justify-center gap-1',
                        currentIsLocked && 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {currentIsLocked && <Lock className="w-3 h-3" />}
                      {getCurrentAccessoryName(category)}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => cycleAccessory(category, 'next')}
                      disabled={loading || unlockedAccessories.length <= 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="w-12 flex items-center justify-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      {unlockedAccessories.findIndex((a) => a.id === config[category]) + 1}/
                      {unlockedAccessories.length}
                    </span>
                    {lockedCount > 0 && (
                      <Badge
                        variant="outline"
                        className="h-5 px-1 text-xs text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"
                      >
                        <Lock className="w-2.5 h-2.5 mr-0.5" />
                        {lockedCount}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Store hint */}
          {onNavigateToStore && (
            <p className="text-xs text-muted-foreground text-center">
              Unlock more accessories in the{' '}
              <button
                onClick={handleGoToStore}
                className="text-amber-600 hover:underline dark:text-amber-400"
              >
                Avatar Store
              </button>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
