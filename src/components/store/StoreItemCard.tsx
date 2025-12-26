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
    border: 'border-slate-300 dark:border-slate-600 border-b-slate-400 dark:border-b-slate-500',
    bg: 'bg-card',
    preview: 'bg-muted border-border',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200 font-bold border-b-2 border-slate-300 dark:border-slate-500',
    label: 'Common',
  },
  rare: {
    border: 'border-blue-300 dark:border-blue-600 border-b-blue-400 dark:border-b-blue-500',
    bg: 'bg-gradient-to-b from-blue-50/50 to-card dark:from-blue-900/10 dark:to-card',
    preview: 'bg-gradient-to-b from-blue-100/50 to-muted dark:from-blue-900/20 dark:to-muted border-blue-200 dark:border-blue-800',
    badge: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold border border-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]',
    label: 'Rare',
  },
  epic: {
    border: 'border-purple-300 dark:border-purple-600 border-b-purple-400 dark:border-b-purple-500',
    bg: 'bg-gradient-to-b from-purple-50/50 to-card dark:from-purple-900/10 dark:to-card',
    preview: 'bg-gradient-to-b from-purple-100/50 to-muted dark:from-purple-900/20 dark:to-muted border-purple-200 dark:border-purple-800',
    badge: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold border border-purple-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]',
    label: 'Epic',
  },
  legendary: {
    border: 'border-amber-300 dark:border-amber-500 border-b-amber-400 dark:border-b-amber-400',
    bg: 'bg-gradient-to-b from-amber-50/50 via-yellow-50/30 to-card dark:from-amber-900/20 dark:via-yellow-900/10 dark:to-card',
    preview: 'bg-gradient-to-b from-amber-100/50 to-muted dark:from-amber-900/20 dark:to-muted border-amber-200 dark:border-amber-800',
    badge: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold border border-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]',
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
        'relative overflow-hidden h-full',
        'rounded-2xl border-2 border-b-4',
        rarity.border,
        rarity.bg
      )}
    >
      {/* Badges - chunky Duolingo style */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        <Badge className={cn('text-xs px-2.5 py-1 rounded-xl', rarity.badge)}>{rarity.label}</Badge>
        {item.is_owned && (
          <Badge className="bg-gradient-to-b from-green-400 to-green-500 text-white px-2.5 py-1 rounded-xl border-b-2 border-green-600 font-bold">
            <Check className="w-3.5 h-3.5 mr-1" />
            Owned
          </Badge>
        )}
      </div>

      <CardContent className="p-4 pt-12 h-full flex flex-col">
        {/* Avatar Preview with Item - chunky rounded container */}
        <div className={cn(
          "relative w-full aspect-square mb-4 rounded-2xl overflow-hidden border-2 border-b-4",
          rarity.preview
        )}>
          {/* Modern dot pattern background */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              zIndex: 0,
              background: `radial-gradient(circle, currentColor 0.8px, transparent 0.8px)`,
              backgroundSize: '8px 8px',
              backgroundPosition: '4px 4px',
              opacity: 0.15,
              maskImage: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
            }}
          />

          {/* Render avatar layers */}
          {previewLayers.map((src, index) => (
            <img
              key={src}
              src={src}
              alt={index === 0 ? 'Avatar' : item.name}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ zIndex: index + 1 }}
              draggable={false}
            />
          ))}

          {/* Lock overlay for non-owned achievement items - chunkier */}
          {!item.is_owned && item.unlock_method === 'achievement' && !item.can_claim_achievement && (
            <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px] flex items-center justify-center z-20">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center border-b-4 border-border">
                <Lock className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Item Name & Description - bolder text */}
        <div className="flex-grow">
          <h3 className="font-bold text-sm mb-1 truncate">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 font-medium">{item.description}</p>
          )}
        </div>

        {/* Action Button / Status - always at bottom - chunky buttons */}
        <div className="mt-4">
        {item.is_owned ? (
          <div className="text-center py-2.5 px-4 rounded-xl bg-gradient-to-b from-green-400 to-green-500 text-white font-bold border-b-4 border-green-600">
            <Check className="w-4 h-4 inline mr-1.5" />
            Owned
          </div>
        ) : item.unlock_method === 'free' ? (
          <div className="text-center py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold border-b-4 border-slate-200 dark:border-slate-600">
            Free Item
          </div>
        ) : item.can_claim_achievement ? (
          <Button
            className={cn(
              'w-full py-3 h-auto rounded-xl font-bold text-sm',
              'bg-gradient-to-b from-purple-500 to-purple-600 text-white',
              'border-b-4 border-purple-700',
              'hover:from-purple-400 hover:to-purple-500',
              'active:border-b-0 active:mt-1 active:mb-[-4px]',
              'transition-all shadow-md'
            )}
            onClick={() => onClaim(item)}
          >
            <Trophy className="w-4 h-4 mr-1.5" />
            Claim!
          </Button>
        ) : item.unlock_method === 'achievement' ? (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <div className="text-center cursor-help py-2.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border-2 border-b-4 border-purple-200 dark:border-purple-700 transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30">
                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase mb-0.5">Unlock with</div>
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                  <span>{item.achievement_icon}</span>
                  <span className="truncate">{item.achievement_name}</span>
                </div>
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 p-4 rounded-2xl border-2 border-b-4" side="top">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center border-b-4 border-purple-600 text-2xl">
                    {item.achievement_icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{item.achievement_name}</h4>
                    <p className="text-xs text-muted-foreground font-medium">Achievement</p>
                  </div>
                </div>

                {/* How to unlock - the actual requirement */}
                {item.achievement_requirement && (
                  <div className="bg-muted rounded-xl p-3 border-2 border-b-4 border-border">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">How to unlock:</p>
                    <p className="text-sm font-bold text-foreground">
                      {formatAchievementRequirement(item.achievement_requirement)}
                    </p>
                  </div>
                )}

                {/* Flavor text description */}
                {item.achievement_description && (
                  <p className="text-xs text-muted-foreground italic leading-relaxed font-medium">
                    "{item.achievement_description}"
                  </p>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        ) : item.unlock_method === 'store' || item.unlock_method === 'both' ? (
          <Button
            className={cn(
              'w-full py-3 h-auto rounded-xl font-bold text-sm transition-all',
              canAfford
                ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-white border-b-4 border-amber-600 hover:from-amber-300 hover:to-amber-400 active:border-b-0 active:mt-1 active:mb-[-4px] shadow-md'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-b-4 border-slate-300 dark:border-slate-600 cursor-not-allowed'
            )}
            disabled={!canAfford}
            onClick={() => onPurchase(item)}
          >
            <Coins className="w-4 h-4 mr-1.5" />
            {item.talent_cost}
          </Button>
        ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
