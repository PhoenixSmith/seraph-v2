import { Lock, Check, Trophy, Coins } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import { cn } from '@/lib/utils'
import { type StoreItem, formatAchievementRequirement } from '@/lib/api'
import { getItemById, getItemImagePath, type ItemCategory } from '@/config/avatarItems'

interface StoreItemCardProps {
  item: StoreItem
  onPurchase: (item: StoreItem) => void
  onClaim: (item: StoreItem) => void
  userTalents: number
}

const rarityStyles = {
  common: {
    border: 'border-slate-200 dark:border-slate-700',
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    label: 'Common',
  },
  rare: {
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    label: 'Rare',
  },
  epic: {
    border: 'border-purple-200 dark:border-purple-800',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    label: 'Epic',
  },
  legendary: {
    border: 'border-amber-300 dark:border-amber-700',
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
    badge: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900',
    label: 'Legendary',
  },
}

function getItemImageSrc(item: StoreItem): string | null {
  if (item.item_key.startsWith('none_')) {
    return null
  }
  const itemDef = getItemById(item.item_key)
  if (!itemDef) return null
  return getItemImagePath(itemDef)
}

// Get layers for avatar preview with just this item equipped
function getPreviewLayers(item: StoreItem): string[] {
  const layers: string[] = ['/avatar/Base_Avatar.png']
  const itemSrc = getItemImageSrc(item)

  if (!itemSrc) return layers

  const category = item.category as ItemCategory

  // Add item in correct layer order based on category
  // Order: bottom -> top -> outfit -> face -> misc -> hat
  if (category === 'bottom') {
    layers.push(itemSrc)
  } else if (category === 'top') {
    layers.push(itemSrc)
  } else if (category === 'outfit') {
    layers.push(itemSrc)
  } else if (category === 'face') {
    layers.push(itemSrc)
  } else if (category === 'misc') {
    layers.push(itemSrc)
  } else if (category === 'hat') {
    layers.push(itemSrc)
  }

  return layers
}

export function StoreItemCard({ item, onPurchase, onClaim, userTalents }: StoreItemCardProps) {
  const rarity = rarityStyles[item.rarity]
  const previewLayers = getPreviewLayers(item)
  const canAfford = item.talent_cost ? userTalents >= item.talent_cost : false

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg h-full',
        rarity.border,
        rarity.bg,
        item.is_owned && 'ring-2 ring-green-500 dark:ring-green-400'
      )}
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        <Badge className={cn('text-xs font-medium', rarity.badge)}>{rarity.label}</Badge>
        {item.is_owned && (
          <Badge className="bg-green-500 text-white">
            <Check className="w-3 h-3 mr-1" />
            Owned
          </Badge>
        )}
      </div>

      <CardContent className="p-4 pt-10 h-full flex flex-col">
        {/* Avatar Preview with Item */}
        <div className="relative w-full aspect-square mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
          {/* Render avatar layers */}
          {previewLayers.map((src, index) => (
            <img
              key={src}
              src={src}
              alt={index === 0 ? 'Avatar' : item.name}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ zIndex: index }}
              draggable={false}
            />
          ))}

          {/* Lock overlay for non-owned achievement items */}
          {!item.is_owned && item.unlock_method === 'achievement' && !item.can_claim_achievement && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
              <Lock className="w-8 h-8 text-white/80" />
            </div>
          )}
        </div>

        {/* Item Name & Description - flex-grow to push button to bottom */}
        <div className="flex-grow">
          <h3 className="font-semibold text-sm mb-1 truncate">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
          )}
        </div>

        {/* Action Button / Status - always at bottom */}
        <div className="mt-3">
        {item.is_owned ? (
          <div className="text-center text-sm text-green-600 dark:text-green-400 font-medium">
            Equipped in Editor
          </div>
        ) : item.unlock_method === 'free' ? (
          <Button size="sm" className="w-full" disabled>
            Free
          </Button>
        ) : item.can_claim_achievement ? (
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            onClick={() => onClaim(item)}
          >
            <Trophy className="w-4 h-4 mr-1" />
            Claim Reward
          </Button>
        ) : item.unlock_method === 'achievement' ? (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="text-center cursor-help">
                <div className="text-xs text-muted-foreground mb-1">Requires:</div>
                <div className="flex items-center justify-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                  <span>{item.achievement_icon}</span>
                  <span className="truncate">{item.achievement_name}</span>
                </div>
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 p-4" side="top">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{item.achievement_icon}</span>
                  <div>
                    <h4 className="font-semibold text-sm">{item.achievement_name}</h4>
                    <p className="text-xs text-muted-foreground">Achievement</p>
                  </div>
                </div>

                {/* How to unlock - the actual requirement */}
                {item.achievement_requirement && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-md p-2.5 border border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-muted-foreground mb-1">How to unlock:</p>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {formatAchievementRequirement(item.achievement_requirement)}
                    </p>
                  </div>
                )}

                {/* Flavor text description */}
                {item.achievement_description && (
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    "{item.achievement_description}"
                  </p>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        ) : item.unlock_method === 'store' || item.unlock_method === 'both' ? (
          <Button
            size="sm"
            className={cn(
              'w-full',
              canAfford
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
            )}
            disabled={!canAfford}
            onClick={() => onPurchase(item)}
          >
            <Coins className="w-4 h-4 mr-1" />
            {item.talent_cost} Talents
          </Button>
        ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
