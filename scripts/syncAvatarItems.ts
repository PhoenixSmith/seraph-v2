#!/usr/bin/env npx tsx
/**
 * Sync Avatar Items to Database
 *
 * This script generates SQL to sync the avatar items config with the database.
 * Run with: npx tsx scripts/syncAvatarItems.ts
 *
 * Options:
 *   --dry-run    Print SQL without executing
 *   --output     Write SQL to file instead of executing
 */

import {
  AVATAR_ITEMS,
  getTalentCost,
  getAchievementKey,
  type AvatarItemDef,
} from '../src/config/avatarItems'

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''")
}

function generateUpsertSQL(item: AvatarItemDef): string {
  const talentCost = getTalentCost(item)
  const achievementKey = getAchievementKey(item)

  return `
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES (
  '${escapeSQL(item.id)}',
  '${item.category}',
  '${escapeSQL(item.name)}',
  ${item.description ? `'${escapeSQL(item.description)}'` : 'NULL'},
  '${item.unlock.type}',
  ${talentCost ?? 'NULL'},
  '${item.rarity}',
  ${AVATAR_ITEMS.filter(i => i.category === item.category).indexOf(item) + 1}
)
ON CONFLICT (item_key) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unlock_method = EXCLUDED.unlock_method,
  talent_cost = EXCLUDED.talent_cost,
  rarity = EXCLUDED.rarity,
  sort_order = EXCLUDED.sort_order;
${achievementKey ? `
UPDATE public.avatar_items
SET achievement_id = (SELECT id FROM public.achievements WHERE key = '${achievementKey}')
WHERE item_key = '${escapeSQL(item.id)}';` : ''}`
}

function generateNoneItemsSQL(): string {
  const categories = ['face', 'hat', 'top', 'bottom', 'outfit', 'misc']
  return categories.map(cat => `
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, rarity, sort_order)
VALUES ('none_${cat}', '${cat}', 'None', 'No ${cat} accessory', 'free', 'common', 0)
ON CONFLICT (item_key) DO NOTHING;`).join('\n')
}

function generateFullSQL(): string {
  const header = `-- ============================================================================
-- AVATAR ITEMS SYNC
-- Generated from src/config/avatarItems.ts
-- Generated at: ${new Date().toISOString()}
-- ============================================================================

`

  const noneItems = generateNoneItemsSQL()
  const itemsSQL = AVATAR_ITEMS.map(generateUpsertSQL).join('\n')

  return header + noneItems + '\n' + itemsSQL
}

// Main
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const outputIndex = args.indexOf('--output')
const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null

const sql = generateFullSQL()

if (dryRun || outputFile) {
  console.log(sql)

  if (outputFile) {
    const fs = await import('fs')
    fs.writeFileSync(outputFile, sql)
    console.log(`\nWritten to ${outputFile}`)
  }
} else {
  console.log('To execute this SQL, use --output to save to file, then run via supabase CLI:')
  console.log('  npx tsx scripts/syncAvatarItems.ts --output sync.sql')
  console.log('  npx supabase db execute --file sync.sql')
  console.log('\nOr use --dry-run to preview the SQL.')
}
