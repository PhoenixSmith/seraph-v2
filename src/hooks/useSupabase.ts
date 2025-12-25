import { useEffect, useState, useCallback, useRef } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// ============================================================================
// AUTH HOOK
// ============================================================================

interface AuthState {
  isLoading: boolean
  isAuthenticated: boolean
  session: Session | null
  user: SupabaseUser | null
}

export function useSupabaseAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    session: null,
    user: null
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        isLoading: false,
        isAuthenticated: !!session,
        session,
        user: session?.user ?? null
      })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        isLoading: false,
        isAuthenticated: !!session,
        session,
        user: session?.user ?? null
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  return state
}

// ============================================================================
// AUTH ACTIONS HOOK
// ============================================================================

export function useAuthActions() {
  const signIn = useCallback(async (provider: 'google' | 'resend', options?: { email?: string }) => {
    if (provider === 'google') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } else if (provider === 'resend' && options?.email) {
      const { error } = await supabase.auth.signInWithOtp({
        email: options.email,
        options: {
          emailRedirectTo: window.location.origin
        }
      })
      if (error) throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return { signIn, signOut }
}

// ============================================================================
// QUERY HOOK - Equivalent to Convex useQuery
// ============================================================================

interface QueryState<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
}

export function useQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[] = []
): T | undefined {
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    isLoading: true,
    error: null
  })

  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        const result = await queryFnRef.current()
        if (!cancelled) {
          setState({ data: result, isLoading: false, error: null })
        }
      } catch (err) {
        if (!cancelled) {
          setState({ data: undefined, isLoading: false, error: err as Error })
          console.error('Query error:', err)
        }
      }
    }

    setState(prev => ({ ...prev, isLoading: true }))
    fetchData()

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state.data
}

// ============================================================================
// QUERY WITH LOADING HOOK
// ============================================================================

export function useQueryWithLoading<T>(
  queryFn: () => Promise<T>,
  deps: unknown[] = []
): { data: T | undefined; isLoading: boolean; error: Error | null; refetch: () => void } {
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    isLoading: true,
    error: null
  })

  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn

  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        const result = await queryFnRef.current()
        if (!cancelled) {
          setState({ data: result, isLoading: false, error: null })
        }
      } catch (err) {
        if (!cancelled) {
          setState({ data: undefined, isLoading: false, error: err as Error })
          console.error('Query error:', err)
        }
      }
    }

    setState(prev => ({ ...prev, isLoading: true }))
    fetchData()

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refetchTrigger])

  return { ...state, refetch }
}

// ============================================================================
// MUTATION HOOK
// ============================================================================

interface MutationState<TResult> {
  isLoading: boolean
  error: Error | null
  data: TResult | null
}

export function useMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>
): {
  mutate: (args: TArgs) => Promise<TResult>
  mutateAsync: (args: TArgs) => Promise<TResult>
  isLoading: boolean
  error: Error | null
  data: TResult | null
  reset: () => void
} {
  const [state, setState] = useState<MutationState<TResult>>({
    isLoading: false,
    error: null,
    data: null
  })

  const mutationFnRef = useRef(mutationFn)
  mutationFnRef.current = mutationFn

  const mutateAsync = useCallback(async (args: TArgs): Promise<TResult> => {
    setState({ isLoading: true, error: null, data: null })
    try {
      const result = await mutationFnRef.current(args)
      setState({ isLoading: false, error: null, data: result })
      return result
    } catch (err) {
      setState({ isLoading: false, error: err as Error, data: null })
      throw err
    }
  }, [])

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, data: null })
  }, [])

  return {
    mutate: mutateAsync,
    mutateAsync,
    isLoading: state.isLoading,
    error: state.error,
    data: state.data,
    reset
  }
}

// ============================================================================
// REFRESHABLE QUERY HOOK - Query with manual refresh capability
// ============================================================================

export function useRefreshableQuery<T>(
  queryFn: () => Promise<T>
): { data: T | undefined; refresh: () => void } {
  const [data, setData] = useState<T>()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        const result = await queryFnRef.current()
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        console.error('Query error:', err)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [refreshTrigger])

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  return { data, refresh }
}

// ============================================================================
// REALTIME SUBSCRIPTION HOOK (for future use)
// ============================================================================

export function useRealtimeSubscription<T>(
  table: string,
  queryFn: () => Promise<T>,
  deps: unknown[] = []
): T | undefined {
  const [data, setData] = useState<T>()

  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn

  useEffect(() => {
    let cancelled = false

    // Initial fetch
    const fetchData = async () => {
      try {
        const result = await queryFnRef.current()
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        console.error('Realtime query error:', err)
      }
    }

    fetchData()

    // Subscribe to changes
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          // Refetch on any change
          fetchData()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return data
}
