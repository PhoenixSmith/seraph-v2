import { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Flame, BookOpen, Trophy, TrendingUp, ScrollText } from 'lucide-react'
import { type AvatarConfig, getAvatarLayers, DEFAULT_AVATAR_CONFIG } from '@/components/avatar'
import type * as api from '@/lib/api'

const SIGNUP_URL = 'https://kayrho.com'

interface ShareCardProps {
  user: api.User
  stats: api.ProfileStats
  achievements: api.Achievement[]
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ user, stats, achievements }, ref) => {
    const displayName = user.name || 'Kayrho Reader'
    const avatarConfig = user.avatar_config ?? DEFAULT_AVATAR_CONFIG
    const avatarLayers = getAvatarLayers(avatarConfig as AvatarConfig)
    const recentAchievements = achievements.slice(0, 3)

    return (
      <div
        ref={ref}
        className="w-[400px] p-8 rounded-3xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Decorative elements */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #e94560 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #0f3460 0%, transparent 70%)',
            transform: 'translate(-30%, 30%)',
          }}
        />

        {/* Header with avatar and name */}
        <div className="relative z-10 text-center mb-6">
          <div className="inline-block p-1 rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-purple-600 mb-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#1a1a2e]">
              {avatarLayers.map((src, index) => (
                <img
                  key={src}
                  src={src}
                  alt={index === 0 ? 'Avatar base' : 'Avatar layer'}
                  className="absolute inset-0 w-full h-full object-cover translate-y-[5%]"
                  style={{ zIndex: index }}
                  crossOrigin="anonymous"
                />
              ))}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{displayName}</h1>
          <div
            className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: stats.tier_color }}
          >
            {stats.current_tier}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-3 mb-6">
          <StatItem
            icon={<ScrollText className="w-5 h-5" />}
            value={(stats.verses_read ?? 0).toLocaleString()}
            label="Verses Read"
            color="#8b5cf6"
          />
          <StatItem
            icon={<Flame className="w-5 h-5" />}
            value={stats.current_streak}
            label="Day Streak"
            color="#ef4444"
          />
          <StatItem
            icon={<TrendingUp className="w-5 h-5" />}
            value={stats.longest_streak}
            label="Best Streak"
            color="#22c55e"
          />
          <StatItem
            icon={<BookOpen className="w-5 h-5" />}
            value={stats.chapters_completed}
            label="Chapters"
            color="#3b82f6"
          />
        </div>

        {/* Recent Achievements */}
        {recentAchievements.length > 0 && (
          <div className="relative z-10 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">
                Recent Achievements
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {recentAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                >
                  <span className="text-xl">{achievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {achievement.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      +{achievement.xp_reward} XP
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements count */}
        <div className="relative z-10 flex items-center justify-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="text-white font-semibold">
            {stats.achievements_unlocked} / {stats.achievements_total} Achievements
          </span>
        </div>

        {/* Footer with QR code */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              }}
            >
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Join me on Kayrho</p>
              <p className="text-xs text-gray-400">kayrho.com</p>
            </div>
          </div>
          <div className="p-1.5 bg-white rounded-lg">
            <QRCodeSVG
              value={SIGNUP_URL}
              size={56}
              level="M"
              bgColor="#ffffff"
              fgColor="#1a1a2e"
            />
          </div>
        </div>
      </div>
    )
  }
)

ShareCard.displayName = 'ShareCard'

interface StatItemProps {
  icon: React.ReactNode
  value: string | number
  label: string
  color: string
}

function StatItem({ icon, value, label, color }: StatItemProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  )
}
