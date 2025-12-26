/**
 * Avatar Items Configuration
 *
 * This is the single source of truth for all avatar items.
 * Add, modify, or remove items here - they'll sync to the database via migration.
 *
 * RULES:
 * - Only "happy" face is free by default
 * - All other items must be earned (store or achievement)
 * - Achievement items are for major milestones
 * - Store items use Talents (1 Talent per chapter completed)
 */

export type ItemCategory = 'face' | 'hat' | 'top' | 'bottom' | 'outfit' | 'misc'
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type UnlockType = 'free' | 'store' | 'achievement' | 'both'

export interface AvatarItemDef {
  id: string
  name: string
  description?: string
  category: ItemCategory
  rarity: ItemRarity
  /** Path to the image file (relative to /avatar/Accesories/) */
  imagePath: string | null
  unlock:
    | { type: 'free' }
    | { type: 'store'; talentCost: number }
    | { type: 'achievement'; achievementKey: string }
    | { type: 'both'; talentCost: number; achievementKey: string }
}

// =============================================================================
// ITEM DEFINITIONS
// All PNGs from public/avatar/Accesories/ are included here
// Only "happy" is free - everything else requires Talents or achievements
// =============================================================================

export const AVATAR_ITEMS: AvatarItemDef[] = [
  // ---------------------------------------------------------------------------
  // FACE ACCESSORIES
  // ---------------------------------------------------------------------------
  {
    id: 'happy',
    name: 'Happy',
    description: 'A cheerful smile to brighten your day',
    category: 'face',
    rarity: 'common',
    imagePath: 'Face_Happy.png',
    unlock: { type: 'free' }, // Only free item!
  },
  {
    id: 'happy_2',
    name: 'Cute',
    description: 'An adorable expression for the sweetest readers',
    category: 'face',
    rarity: 'common',
    imagePath: 'Face_Happy_2.png',
    unlock: { type: 'store', talentCost: 50 },
  },
  {
    id: 'aviators',
    name: 'Aviators',
    description: 'Cool sunglasses for the coolest readers. Reach a 100-day streak!',
    category: 'face',
    rarity: 'epic',
    imagePath: 'Face_Aviators.png',
    unlock: { type: 'achievement', achievementKey: 'streak_100' },
  },

  // ---------------------------------------------------------------------------
  // HAT ACCESSORIES
  // ---------------------------------------------------------------------------
  {
    id: 'pony_tail',
    name: 'Pony Tail',
    description: 'Stylish ponytail for focused reading',
    category: 'hat',
    rarity: 'common',
    imagePath: 'Hat_Pony_Tail.png',
    unlock: { type: 'store', talentCost: 75 },
  },
  {
    id: 'top_hat',
    name: 'Top Hat',
    description: 'Fancy top hat for distinguished readers',
    category: 'hat',
    rarity: 'rare',
    imagePath: 'Hat_Top_Hat.png',
    unlock: { type: 'store', talentCost: 150 },
  },
  {
    id: 'crusader_helmet',
    name: 'Crusader Helmet',
    description: 'Armor up for your reading crusade. Complete the book of Joshua!',
    category: 'hat',
    rarity: 'epic',
    imagePath: 'Hat_Crusader_Helmet.png',
    unlock: { type: 'achievement', achievementKey: 'book_joshua' },
  },
  {
    id: 'crown',
    name: 'Crown',
    description: 'A crown fit for royalty. Complete all 150 chapters of Psalms!',
    category: 'hat',
    rarity: 'legendary',
    imagePath: 'Hat_Crown.png',
    unlock: { type: 'achievement', achievementKey: 'book_psalms' },
  },
  {
    id: 'crown_of_thorns',
    name: 'Crown of Thorns',
    description: 'The sacred crown. Complete the book of Revelation!',
    category: 'hat',
    rarity: 'legendary',
    imagePath: 'Hat_Crown_Of_Thorns.png',
    unlock: { type: 'achievement', achievementKey: 'book_revelation' },
  },

  // ---------------------------------------------------------------------------
  // TOP ACCESSORIES
  // ---------------------------------------------------------------------------
  {
    id: 'hoodie',
    name: 'Hoodie',
    description: 'Classic comfortable hoodie',
    category: 'top',
    rarity: 'common',
    imagePath: 'Top_Hoodie.png',
    unlock: { type: 'store', talentCost: 40 },
  },
  {
    id: 'white_hoodie',
    name: 'White Hoodie',
    description: 'Clean white hoodie for a fresh look',
    category: 'top',
    rarity: 'common',
    imagePath: 'Top_White_Hoodie.png',
    unlock: { type: 'store', talentCost: 75 },
  },
  {
    id: 'fancy_dress',
    name: 'Fancy Dress',
    description: 'Elegant formal attire fit for royalty. Complete the book of Esther!',
    category: 'top',
    rarity: 'epic',
    imagePath: 'Top_Fancy_Dress.png',
    unlock: { type: 'achievement', achievementKey: 'book_esther' },
  },

  // ---------------------------------------------------------------------------
  // BOTTOM ACCESSORIES
  // ---------------------------------------------------------------------------
  {
    id: 'jeans',
    name: 'Jeans',
    description: 'Classic blue jeans',
    category: 'bottom',
    rarity: 'common',
    imagePath: 'Bottom_Jeans.png',
    unlock: { type: 'store', talentCost: 40 },
  },
  {
    id: 'ripped_jeans',
    name: 'Ripped Jeans',
    description: 'Fashionably distressed denim',
    category: 'bottom',
    rarity: 'common',
    imagePath: 'Bottom_Ripped_Jeans.png',
    unlock: { type: 'store', talentCost: 60 },
  },
  {
    id: 'jean_skirt',
    name: 'Jean Skirt',
    description: 'Cute denim skirt',
    category: 'bottom',
    rarity: 'common',
    imagePath: 'Bottom_Jean_Skirt.png',
    unlock: { type: 'store', talentCost: 60 },
  },
  {
    id: 'suspenders',
    name: 'Suspenders',
    description: 'Classic suspenders for a distinguished look',
    category: 'bottom',
    rarity: 'rare',
    imagePath: 'Bottom_Suspenders.png',
    unlock: { type: 'store', talentCost: 100 },
  },

  // ---------------------------------------------------------------------------
  // OUTFIT (FULL BODY)
  // ---------------------------------------------------------------------------
  {
    id: 'sloth_snuggie',
    name: 'Sloth Snuggie',
    description: 'The ultimate cozy outfit. Complete a 40-day reading streak!',
    category: 'outfit',
    rarity: 'legendary',
    imagePath: 'Full_Sloth_Snuggie.png',
    unlock: { type: 'achievement', achievementKey: 'streak_40' },
  },

  // ---------------------------------------------------------------------------
  // MISC ACCESSORIES
  // ---------------------------------------------------------------------------
  {
    id: 'number_1',
    name: '#1 Foam Finger',
    description: "Show everyone you're number one!",
    category: 'misc',
    rarity: 'rare',
    imagePath: 'Misc_Number_1.png',
    unlock: { type: 'store', talentCost: 125 },
  },
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get all items for a category */
export function getItemsByCategory(category: ItemCategory): AvatarItemDef[] {
  return AVATAR_ITEMS.filter(item => item.category === category)
}

/** Get an item by ID */
export function getItemById(id: string): AvatarItemDef | undefined {
  return AVATAR_ITEMS.find(item => item.id === id)
}

/** Get all free items */
export function getFreeItems(): AvatarItemDef[] {
  return AVATAR_ITEMS.filter(item => item.unlock.type === 'free')
}

/** Get all store items */
export function getStoreItems(): AvatarItemDef[] {
  return AVATAR_ITEMS.filter(item =>
    item.unlock.type === 'store' || item.unlock.type === 'both'
  )
}

/** Get all achievement items */
export function getAchievementItems(): AvatarItemDef[] {
  return AVATAR_ITEMS.filter(item =>
    item.unlock.type === 'achievement' || item.unlock.type === 'both'
  )
}

/** Get the full image path for an item */
export function getItemImagePath(item: AvatarItemDef): string | null {
  if (!item.imagePath) return null
  return `/avatar/Accesories/${item.imagePath}`
}

/** Get talent cost (returns null if not purchasable) */
export function getTalentCost(item: AvatarItemDef): number | null {
  if (item.unlock.type === 'store' || item.unlock.type === 'both') {
    return item.unlock.talentCost
  }
  return null
}

/** Get achievement key (returns null if not achievement-locked) */
export function getAchievementKey(item: AvatarItemDef): string | null {
  if (item.unlock.type === 'achievement' || item.unlock.type === 'both') {
    return item.unlock.achievementKey
  }
  return null
}

// =============================================================================
// GENERATE AVATAR_ACCESSORIES FORMAT (for backward compatibility)
// =============================================================================

type AccessoryEntry = { id: string; name: string; src: string | null }

export function generateAvatarAccessories(): Record<ItemCategory, AccessoryEntry[]> {
  const categories: ItemCategory[] = ['face', 'hat', 'top', 'bottom', 'outfit', 'misc']

  const result = {} as Record<ItemCategory, AccessoryEntry[]>

  for (const category of categories) {
    // Always start with 'none' option
    const entries: AccessoryEntry[] = [{ id: 'none', name: 'None', src: null }]

    // Add items for this category
    const items = getItemsByCategory(category)
    for (const item of items) {
      entries.push({
        id: item.id,
        name: item.name,
        src: getItemImagePath(item),
      })
    }

    result[category] = entries
  }

  return result
}
