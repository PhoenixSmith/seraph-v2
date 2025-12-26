import { useState, useEffect } from 'react'
import { Coins, ShoppingBag, Loader2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TalentsDisplay } from './TalentsDisplay'
import { StoreItemCard } from './StoreItemCard'
import { cn } from '@/lib/utils'
import {
  getStoreItems,
  purchaseAvatarItem,
  claimAchievementItem,
  type StoreItem,
} from '@/lib/api'

interface StorePageProps {
  userTalents: number
  onTalentsChange: (newTalents: number) => void
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'face', label: 'Face' },
  { id: 'hat', label: 'Hat' },
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'outfit', label: 'Outfit' },
  { id: 'misc', label: 'Misc' },
] as const

export function StorePage({ userTalents, onTalentsChange }: StorePageProps) {
  const [items, setItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('all')
  const [purchaseItem, setPurchaseItem] = useState<StoreItem | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [claimItem, setClaimItem] = useState<StoreItem | null>(null)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      setLoading(true)
      setError(null)
      const storeItems = await getStoreItems()
      console.log('Store items received:', storeItems.length, 'items')
      // Filter out "none" items - those are just placeholders
      const filtered = storeItems.filter((item) => !item.item_key.startsWith('none_'))
      console.log('Filtered items:', filtered.length, 'items')
      setItems(filtered)
    } catch (err) {
      console.error('Failed to load store items:', err)
      setError(err instanceof Error ? err.message : 'Failed to load store items')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems =
    category === 'all' ? items : items.filter((item) => item.category === category)

  // Sort: owned last, then by unlock method (free < store < achievement), then by rarity
  const sortedItems = [...filteredItems].sort((a, b) => {
    // Owned items go to the end
    if (a.is_owned !== b.is_owned) return a.is_owned ? 1 : -1
    // Then by rarity (legendary > epic > rare > common)
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 }
    return rarityOrder[a.rarity] - rarityOrder[b.rarity]
  })

  async function handlePurchase() {
    if (!purchaseItem) return
    try {
      setPurchasing(true)
      const result = await purchaseAvatarItem(purchaseItem.id)
      if (result.success) {
        // Update talents
        if (result.talents_remaining !== undefined) {
          onTalentsChange(result.talents_remaining)
        }
        // Reload items to update ownership
        await loadItems()
        setPurchaseItem(null)
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Purchase failed:', error)
      alert('Purchase failed. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }

  async function handleClaim() {
    if (!claimItem) return
    try {
      setClaiming(true)
      const result = await claimAchievementItem(claimItem.id)
      if (result.success) {
        // Reload items to update ownership
        await loadItems()
        setClaimItem(null)
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Claim failed:', error)
      alert('Claim failed. Please try again.')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold">Avatar Store</h1>
        </div>
        <TalentsDisplay talents={userTalents} size="lg" />
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={setCategory} className="mb-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full border',
                'data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800 data-[state=active]:border-amber-300',
                'dark:data-[state=active]:bg-amber-900/30 dark:data-[state=active]:text-amber-300 dark:data-[state=active]:border-amber-700'
              )}
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Items Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-red-500 gap-2">
          <p>Error: {error}</p>
          <Button variant="outline" onClick={loadItems}>Retry</Button>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <p>No items in this category</p>
          <p className="text-xs">(Total loaded: {items.length})</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sortedItems.map((item) => (
            <StoreItemCard
              key={item.id}
              item={item}
              userTalents={userTalents}
              onPurchase={setPurchaseItem}
              onClaim={setClaimItem}
            />
          ))}
        </div>
      )}

      {/* Purchase Confirmation Dialog */}
      <Dialog open={!!purchaseItem} onOpenChange={() => setPurchaseItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to purchase{' '}
              <span className="font-semibold">{purchaseItem?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-4 py-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Cost</div>
              <div className="flex items-center gap-1 text-lg font-semibold text-amber-600">
                <Coins className="w-5 h-5" />
                {purchaseItem?.talent_cost}
              </div>
            </div>
            <div className="text-2xl text-muted-foreground">&rarr;</div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Remaining</div>
              <div className="flex items-center gap-1 text-lg font-semibold text-amber-600">
                <Coins className="w-5 h-5" />
                {userTalents - (purchaseItem?.talent_cost ?? 0)}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseItem(null)} disabled={purchasing}>
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={purchasing}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
            >
              {purchasing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Coins className="w-4 h-4 mr-2" />
              )}
              Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim Confirmation Dialog */}
      <Dialog open={!!claimItem} onOpenChange={() => setClaimItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Achievement Reward</DialogTitle>
            <DialogDescription>
              You've earned{' '}
              <span className="font-semibold">{claimItem?.name}</span> by unlocking the{' '}
              <span className="font-semibold">{claimItem?.achievement_name}</span> achievement!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimItem(null)} disabled={claiming}>
              Cancel
            </Button>
            <Button
              onClick={handleClaim}
              disabled={claiming}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {claiming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Claim Reward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
