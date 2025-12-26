import { useState, useEffect } from 'react'
import { Coins, ShoppingBag, Loader2, Trophy } from 'lucide-react'
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
      {/* Header - Duolingo style */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center border-b-4 border-orange-600 shadow-lg">
            <ShoppingBag className="w-7 h-7 text-white drop-shadow-sm" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Avatar Store</h1>
            <p className="text-sm text-muted-foreground font-medium">Customize Your Look!</p>
          </div>
        </div>
        <TalentsDisplay talents={userTalents} size="lg" />
      </div>

      {/* Category Tabs - Chunky Duolingo pills */}
      <Tabs value={category} onValueChange={setCategory} className="mb-8">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className={cn(
                'px-5 py-2.5 text-sm font-bold rounded-2xl border-2 border-b-4 transition-all',
                'bg-card text-muted-foreground border-border hover:bg-muted',
                'data-[state=active]:bg-gradient-to-b data-[state=active]:from-amber-400 data-[state=active]:to-amber-500',
                'data-[state=active]:text-white data-[state=active]:border-amber-500 data-[state=active]:border-b-amber-600',
                'data-[state=active]:shadow-md',
                'active:border-b-2 active:mt-[2px]'
              )}
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Items Grid */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center border-b-4 border-orange-600 shadow-lg animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
          <p className="text-muted-foreground font-bold">Loading items...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center border-b-4 border-red-600 shadow-lg">
            <span className="text-3xl">😕</span>
          </div>
          <p className="text-red-500 font-bold">Oops! {error}</p>
          <Button variant="duolingo-orange" size="duolingo" onClick={loadItems}>Try Again</Button>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center border-b-4 border-slate-500 shadow-lg">
            <span className="text-3xl">🔍</span>
          </div>
          <p className="text-muted-foreground font-bold">No items here yet!</p>
          <p className="text-xs text-muted-foreground">(Total loaded: {items.length})</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
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

      {/* Purchase Confirmation Dialog - Duolingo style */}
      <Dialog open={!!purchaseItem} onOpenChange={() => setPurchaseItem(null)}>
        <DialogContent className="rounded-3xl border-2 border-b-4 border-border p-0 overflow-hidden max-w-sm">
          <div className="p-6 pb-4">
            <DialogHeader className="text-center pb-2">
              <DialogTitle className="text-xl font-bold">Buy this item?</DialogTitle>
              <DialogDescription className="text-base">
                <span className="font-bold text-foreground">{purchaseItem?.name}</span>
              </DialogDescription>
            </DialogHeader>

            {/* Cost breakdown - chunky boxes */}
            <div className="flex items-center justify-center gap-3 py-6">
              <div className="bg-muted rounded-2xl p-4 text-center min-w-[100px] border-2 border-b-4 border-border">
                <div className="text-xs text-muted-foreground font-bold uppercase mb-2">Cost</div>
                <div className="flex items-center justify-center gap-1.5 text-xl font-bold text-amber-600">
                  <Coins className="w-5 h-5" />
                  {purchaseItem?.talent_cost}
                </div>
              </div>
              <div className="text-3xl text-muted-foreground font-bold">→</div>
              <div className="bg-muted rounded-2xl p-4 text-center min-w-[100px] border-2 border-b-4 border-border">
                <div className="text-xs text-muted-foreground font-bold uppercase mb-2">Left</div>
                <div className="flex items-center justify-center gap-1.5 text-xl font-bold text-amber-600">
                  <Coins className="w-5 h-5" />
                  {userTalents - (purchaseItem?.talent_cost ?? 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Footer with chunky buttons */}
          <div className="bg-muted/50 p-4 flex flex-col gap-3">
            <Button
              variant="duolingo-orange"
              size="duolingo"
              className="w-full"
              onClick={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Coins className="w-5 h-5 mr-2" />
              )}
              Buy Now
            </Button>
            <Button
              variant="duolingo-secondary"
              size="duolingo"
              className="w-full"
              onClick={() => setPurchaseItem(null)}
              disabled={purchasing}
            >
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Claim Confirmation Dialog - Duolingo style */}
      <Dialog open={!!claimItem} onOpenChange={() => setClaimItem(null)}>
        <DialogContent className="rounded-3xl border-2 border-b-4 border-border p-0 overflow-hidden max-w-sm">
          <div className="p-6 pb-4 text-center">
            {/* Achievement icon */}
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center border-b-4 border-purple-600 shadow-lg">
              <Trophy className="w-10 h-10 text-white drop-shadow-sm" />
            </div>

            <DialogHeader className="text-center pb-2">
              <DialogTitle className="text-xl font-bold">Claim Your Reward!</DialogTitle>
              <DialogDescription className="text-base space-y-2">
                <span className="block">You've earned</span>
                <span className="block font-bold text-foreground text-lg">{claimItem?.name}</span>
                <span className="block text-sm">by unlocking</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-700 dark:text-purple-300 font-bold">
                  <span>{claimItem?.achievement_icon}</span>
                  <span>{claimItem?.achievement_name}</span>
                </span>
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Footer with chunky buttons */}
          <div className="bg-muted/50 p-4 flex flex-col gap-3">
            <Button
              variant="duolingo"
              size="duolingo"
              className="w-full bg-gradient-to-b from-purple-500 to-purple-600 border-purple-700 hover:from-purple-400 hover:to-purple-500"
              onClick={handleClaim}
              disabled={claiming}
            >
              {claiming ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Trophy className="w-5 h-5 mr-2" />}
              Claim Reward
            </Button>
            <Button
              variant="duolingo-secondary"
              size="duolingo"
              className="w-full"
              onClick={() => setClaimItem(null)}
              disabled={claiming}
            >
              Not Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
