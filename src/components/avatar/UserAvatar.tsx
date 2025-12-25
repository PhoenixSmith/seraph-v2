import { useState } from 'react'
import { cn } from '@/lib/utils'
import { AvatarEditor } from './AvatarEditor'
import { type AvatarConfig, DEFAULT_AVATAR_CONFIG, updateAvatarConfig } from '@/lib/api'

// Re-export types from api for convenience
export type { AvatarConfig } from '@/lib/api'
export { DEFAULT_AVATAR_CONFIG } from '@/lib/api'

// Accessory categories - organized by type for future expansion
export const AVATAR_ACCESSORIES = {
  face: [
    { id: 'none', name: 'None', src: null },
    { id: 'happy', name: 'Happy', src: '/avatar/Accesories/Face_Happy.png' },
    { id: 'happy_2', name: 'Cute', src: '/avatar/Accesories/Face_Happy_2.png' },
    { id: 'aviators', name: 'Aviators', src: '/avatar/Accesories/Face_Aviators.png' },
  ],
  hat: [
    { id: 'none', name: 'None', src: null },
    { id: 'crown', name: 'Crown', src: '/avatar/Accesories/Hat_Crown.png' },
    { id: 'crown_of_thorns', name: 'Crown of Thorns', src: '/avatar/Accesories/Hat_Crown_Of_Thorns.png' },
    { id: 'top_hat', name: 'Top Hat', src: '/avatar/Accesories/Hat_Top_Hat.png' },
    { id: 'pony_tail', name: 'Pony Tail', src: '/avatar/Accesories/Hat_Pony_Tail.png' },
  ],
  top: [
    { id: 'none', name: 'None', src: null },
    { id: 'hoodie', name: 'Hoodie', src: '/avatar/Accesories/Top_Hoodie.png' },
    { id: 'white_hoodie', name: 'White Hoodie', src: '/avatar/Accesories/Top_White_Hoodie.png' },
    { id: 'fancy_dress', name: 'Fancy Dress', src: '/avatar/Accesories/Top_Fancy_Dress.png' },
  ],
  bottom: [
    { id: 'none', name: 'None', src: null },
    { id: 'jeans', name: 'Jeans', src: '/avatar/Accesories/Bottom_Jeans.png' },
    { id: 'ripped_jeans', name: 'Ripped Jeans', src: '/avatar/Accesories/Bottom_Ripped_Jeans.png' },
    { id: 'jean_skirt', name: 'Jean Skirt', src: '/avatar/Accesories/Bottom_Jean_Skirt.png' },
    { id: 'suspenders', name: 'Suspenders', src: '/avatar/Accesories/Bottom_Suspenders.png' },
  ],
  outfit: [
    { id: 'none', name: 'None', src: null },
    { id: 'sloth_snuggie', name: 'Sloth Snuggie', src: '/avatar/Accesories/Full_Sloth_Snuggie.png' },
  ],
  misc: [
    { id: 'none', name: 'None', src: null },
    { id: 'number_1', name: '#1 Foam Finger', src: '/avatar/Accesories/Misc_Number_1.png' },
  ],
} as const

export type AccessoryCategory = keyof typeof AVATAR_ACCESSORIES

// Layer order for avatar rendering (bottom to top)
// 1. Base avatar (lowest)
// 2. Bottom (pants, skirts)
// 3. Top (shirts, hoodies)
// 4. Face (expressions, glasses)
// 5. Misc (accessories)
// 6. Hat (highest)

// Get all avatar layers in render order (bottom to top)
export function getAvatarLayers(config: AvatarConfig): string[] {
  const layers: string[] = []

  // Always add base avatar first (lowest layer)
  layers.push('/avatar/Base_Avatar.png')

  // Add layers in order: bottom -> top -> outfit -> face -> misc -> hat
  if (config.bottom !== 'none') {
    const bottom = AVATAR_ACCESSORIES.bottom.find(a => a.id === config.bottom)
    if (bottom?.src) layers.push(bottom.src)
  }

  if (config.top !== 'none') {
    const top = AVATAR_ACCESSORIES.top.find(a => a.id === config.top)
    if (top?.src) layers.push(top.src)
  }

  if (config.outfit !== 'none') {
    const outfit = AVATAR_ACCESSORIES.outfit.find(a => a.id === config.outfit)
    if (outfit?.src) layers.push(outfit.src)
  }

  if (config.face !== 'none') {
    const face = AVATAR_ACCESSORIES.face.find(a => a.id === config.face)
    if (face?.src) layers.push(face.src)
  }

  if (config.misc !== 'none') {
    const misc = AVATAR_ACCESSORIES.misc.find(a => a.id === config.misc)
    if (misc?.src) layers.push(misc.src)
  }

  if (config.hat !== 'none') {
    const hat = AVATAR_ACCESSORIES.hat.find(a => a.id === config.hat)
    if (hat?.src) layers.push(hat.src)
  }

  return layers
}

// Legacy function for single image (uses first accessory layer or base)
export function getAvatarImageSrc(config: AvatarConfig): string {
  const layers = getAvatarLayers(config)
  return layers[layers.length - 1] // Return topmost layer for backwards compatibility
}

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  editable?: boolean
  className?: string
  config?: AvatarConfig
  onConfigChange?: (config: AvatarConfig) => void
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-20 h-20',
  xl: 'w-32 h-32',
}

export function UserAvatar({
  size = 'md',
  editable = true,
  className,
  config: controlledConfig,
  onConfigChange
}: UserAvatarProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [internalConfig, setInternalConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG)

  const config = controlledConfig ?? internalConfig
  const layers = getAvatarLayers(config)

  const handleConfigChange = async (newConfig: AvatarConfig) => {
    if (onConfigChange) {
      onConfigChange(newConfig)
    } else {
      setInternalConfig(newConfig)
      // Save to database
      try {
        await updateAvatarConfig(newConfig)
      } catch (err) {
        console.error('Failed to save avatar config:', err)
      }
    }
  }

  const avatarClasses = cn(
    'relative rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30',
    'ring-2 ring-border transition-all',
    editable && 'cursor-pointer hover:scale-105 hover:ring-primary',
    sizeClasses[size],
    className
  )

  // Render all layers stacked with absolute positioning
  const avatarLayers = (
    <>
      {layers.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={index === 0 ? 'Avatar base' : 'Avatar layer'}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: index }}
          draggable={false}
        />
      ))}
    </>
  )

  return (
    <>
      {editable ? (
        <button
          onClick={() => setIsEditorOpen(true)}
          className={avatarClasses}
          aria-label="Edit avatar"
        >
          {avatarLayers}
        </button>
      ) : (
        <div className={avatarClasses} aria-label="User avatar">
          {avatarLayers}
        </div>
      )}

      {editable && (
        <AvatarEditor
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          config={config}
          onConfigChange={handleConfigChange}
        />
      )}
    </>
  )
}
