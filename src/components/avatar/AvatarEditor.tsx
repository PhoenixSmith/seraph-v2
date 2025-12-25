import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  AVATAR_ACCESSORIES,
  type AvatarConfig,
  type AccessoryCategory,
  getAvatarLayers,
} from './UserAvatar'

interface AvatarEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: AvatarConfig
  onConfigChange: (config: AvatarConfig) => void
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
}: AvatarEditorProps) {
  const cycleAccessory = (category: AccessoryCategory, direction: 'prev' | 'next') => {
    const accessories = AVATAR_ACCESSORIES[category]
    const currentIndex = accessories.findIndex(a => a.id === config[category])
    const newIndex =
      direction === 'next'
        ? (currentIndex + 1) % accessories.length
        : (currentIndex - 1 + accessories.length) % accessories.length

    const newConfig = { ...config, [category]: accessories[newIndex].id }
    onConfigChange(newConfig)
  }

  const getCurrentAccessoryName = (category: AccessoryCategory): string => {
    const accessories = AVATAR_ACCESSORIES[category]
    const current = accessories.find(a => a.id === config[category])
    return current?.name ?? 'None'
  }

  const previewLayers = getAvatarLayers(config)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Avatar</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Avatar Preview - Layered */}
          <div className="relative w-40 h-40 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 ring-4 ring-border shadow-lg">
            {previewLayers.map((src, index) => (
              <img
                key={src}
                src={src}
                alt={index === 0 ? 'Avatar base' : 'Avatar layer'}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ zIndex: index }}
                draggable={false}
              />
            ))}
          </div>

          {/* Accessory Controls */}
          <div className="w-full space-y-3">
            {CATEGORY_ORDER.map(category => {
              const accessories = AVATAR_ACCESSORIES[category]

              return (
                <div
                  key={category}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
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
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span className="min-w-[120px] text-center text-sm font-medium truncate">
                      {getCurrentAccessoryName(category)}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => cycleAccessory(category, 'next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <span className="w-8 text-xs text-muted-foreground text-center">
                    {accessories.findIndex(a => a.id === config[category]) + 1}/
                    {accessories.length}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
