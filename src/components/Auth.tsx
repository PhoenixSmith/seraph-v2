import { useState } from 'react'
import { useAuthActions } from '@/hooks/useSupabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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

export interface User {
  id: string
  name?: string | null
  email?: string | null
  avatar_url?: string | null
  avatar_config?: AvatarConfig
  total_xp?: number
  current_streak?: number
}

export function Auth({ onSkip }: { onSkip?: () => void }) {
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Mail className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a magic link to <strong className="text-foreground">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            Click the link in the email to {isSignUp ? 'create your account' : 'sign in'}.
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEmailSent(false)
                setEmail('')
              }}
            >
              Use a different email
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Kayrho</CardTitle>
          <CardDescription>
            {isSignUp ? 'Create an account to start your journey' : 'Sign in to continue your journey'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email}
            >
              {isLoading ? 'Sending...' : isSignUp ? 'Create account' : 'Send magic link'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isSignUp ? 'Sign up with Google' : 'Continue with Google'}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="w-full text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
              }}
              className="text-primary hover:underline font-medium"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
          <p className="w-full text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service
          </p>
          {onSkip && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={onSkip}
            >
              Skip for now
            </Button>
          )}
        </CardFooter>
      </Card>
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
