import { useState } from 'react'
import { useAuthActions } from '@/hooks/useSupabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Mail, LogOut, Star, Flame, User as UserIcon, Palette } from 'lucide-react'
import { UserAvatar, AvatarEditor, DEFAULT_AVATAR_CONFIG, type AvatarConfig } from '@/components/avatar'
import { updateAvatarConfig } from '@/lib/api'
import { KayrhoLogo } from './KayrhoLogo'

export interface User {
  id: string
  name?: string | null
  email?: string | null
  avatar_url?: string | null
  avatar_config?: AvatarConfig
  total_xp?: number
  current_streak?: number
  talents?: number
}

export function Auth() {
  const { signIn } = useAuthActions()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setError('')

    try {
      await signIn("resend", { email })
      setEmailSent(true)
    } catch (err) {
      setError('Failed to send magic link. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')

    try {
      await signIn("google")
    } catch (err) {
      setError('Google sign in failed. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-blue-500/5">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-2 mb-2">
              <KayrhoLogo size={40} className="text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Kayrho</h1>
          </div>

          {/* Email sent confirmation */}
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Check your inbox</h2>
              <p className="text-muted-foreground">
                We sent a magic link to<br />
                <strong className="text-foreground">{email}</strong>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Click the link in the email to {isSignUp ? 'create your account' : 'sign in'}.
            </p>
            <Button
              variant="outline"
              className="w-full h-12 border-2 border-b-4 font-semibold hover:-translate-y-0.5 active:border-b-2 active:translate-y-0 transition-all"
              onClick={() => {
                setEmailSent(false)
                setEmail('')
              }}
            >
              Use a different email
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-blue-500/5">
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full" />
            <KayrhoLogo size={56} className="text-blue-400 relative" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Kayrho</h1>
          <p className="text-muted-foreground text-center">
            {isSignUp ? 'Create an account to start your journey' : 'Sign in to continue your journey'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-500 text-center animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* Auth form */}
        <div className="space-y-4">
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                required
                className="h-12 text-base border-2 rounded-xl focus:border-blue-400 focus:ring-blue-400/20 transition-colors"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email}
              className={cn(
                "w-full h-12 text-base font-semibold rounded-xl border-b-4 transition-all",
                "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
                "border-blue-700 hover:-translate-y-0.5 active:border-b-2 active:translate-y-0",
                "shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {isSignUp ? 'Create account' : 'Send magic link'}
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-xs uppercase tracking-wider text-muted-foreground">
                or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full h-12 text-base font-medium rounded-xl border-2 border-b-4 hover:-translate-y-0.5 active:border-b-2 active:translate-y-0 transition-all"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 mr-3">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
              }}
              className="text-blue-500 hover:text-blue-600 font-semibold transition-colors"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          <p className="text-xs text-muted-foreground/60 pt-4">
            By continuing, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  )
}

export function StreakXPDisplay({ user, className }: { user: User; className?: string }) {
  const totalXp = user?.total_xp ?? 0
  const currentStreak = user?.current_streak ?? 0

  return (
    <div className={cn("flex gap-2", className)}>
      <Badge variant="skeumorphic" className="flex items-center gap-1.5 px-3 py-1">
        <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />
        <span>{totalXp} XP</span>
      </Badge>
      <Badge variant="skeumorphic" className="flex items-center gap-1.5 px-3 py-1">
        <Flame className="h-3.5 w-3.5 text-red-500" fill="currentColor" />
        <span>{currentStreak} day{currentStreak !== 1 ? 's' : ''}</span>
      </Badge>
    </div>
  )
}

interface UserButtonProps {
  user: User
  onProfileClick?: () => void
}

export function UserButton({ user, onProfileClick }: UserButtonProps) {
  const { signOut } = useAuthActions()
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false)
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(user.avatar_config ?? DEFAULT_AVATAR_CONFIG)

  const displayName = user?.name || user?.email || 'User'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
            <UserAvatar size="sm" editable={false} config={avatarConfig} className="h-9 w-9" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              {user?.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAvatarEditorOpen(true)}>
            <Palette className="mr-2 h-4 w-4" />
            <span>Customize Avatar</span>
          </DropdownMenuItem>
          {onProfileClick && (
            <DropdownMenuItem onClick={onProfileClick}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {avatarEditorOpen && (
        <AvatarEditorTrigger
          initialConfig={avatarConfig}
          onClose={() => setAvatarEditorOpen(false)}
          onSave={setAvatarConfig}
        />
      )}
    </>
  )
}

// Helper component to trigger the avatar editor
function AvatarEditorTrigger({
  initialConfig,
  onClose,
  onSave
}: {
  initialConfig: AvatarConfig
  onClose: () => void
  onSave: (config: AvatarConfig) => void
}) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig)

  const handleConfigChange = async (newConfig: AvatarConfig) => {
    setConfig(newConfig)
    onSave(newConfig)
    try {
      await updateAvatarConfig(newConfig)
    } catch (err) {
      console.error('Failed to save avatar config:', err)
    }
  }

  return (
    <AvatarEditor
      open={true}
      onOpenChange={(open: boolean) => !open && onClose()}
      config={config}
      onConfigChange={handleConfigChange}
    />
  )
}
