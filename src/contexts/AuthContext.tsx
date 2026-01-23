import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null; data: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      console.error('Sign in error:', {
        message: error.message,
        status: error.status,
        name: error.name,
      })
      
      let errorMessage = error.message
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email before signing in. Check your inbox for the confirmation link.'
      }
      
      toast({
        title: 'Sign in failed',
        description: errorMessage,
        variant: 'destructive',
      })
    }
    return { error, data }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    // Validate password length (Supabase requires at least 6 characters)
    if (password.length < 6) {
      const error = { message: 'Password must be at least 6 characters' } as AuthError
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      })
      return { error, data: null }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      
      if (error) {
        console.error('Signup error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        })
        toast({
          title: 'Sign up failed',
          description: error.message || 'An error occurred during signup',
          variant: 'destructive',
        })
        return { error, data: null }
      }
      
      if (data.user) {
        toast({
          title: 'Account created',
          description: data.session 
            ? 'Account created successfully!' 
            : 'Please check your email to verify your account.',
        })
      }
      
      return { error: null, data }
    } catch (err) {
      console.error('Unexpected signup error:', err)
      const error = {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      } as AuthError
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      })
      return { error, data: null }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      toast({
        title: 'Password reset failed',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Password reset email sent',
        description: 'Please check your email for the reset link.',
      })
    }
    return { error }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password,
    })
    if (error) {
      toast({
        title: 'Password update failed',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Password updated',
        description: 'Your password has been updated successfully.',
      })
    }
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
