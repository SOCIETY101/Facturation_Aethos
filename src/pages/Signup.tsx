import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { createCompanyForUser } from '@/lib/api/company'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    if (!email || !password || !fullName || !companyName) {
      toast({
        title: 'Validation error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: 'Validation error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const { error, data } = await signUp(email, password, fullName)
      
      if (error) {
        setIsLoading(false)
        console.error('Signup error details:', error)
        return
      }

      // If user is created, create company using database function
      if (data?.user) {
        try {
          // Wait a moment for profile trigger to complete
          await new Promise((resolve) => setTimeout(resolve, 500))
          
          // Create company using database function (bypasses RLS and handles profile creation)
          const companyId = await createCompanyForUser(data.user.id, companyName, email)
          
          console.log('Company created successfully:', companyId)
          
          toast({
            title: 'Account created',
            description: 'Your account and company have been set up successfully!',
          })
        } catch (err) {
          console.error('Company setup error:', err)
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          
          // Log full error details
          console.error('Full error object:', err)
          
          // If company creation fails, user can still login and create it manually
          toast({
            title: 'Account created',
            description: `Your account was created. Company setup failed: ${errorMessage}. You can set up your company in Settings after logging in.`,
            variant: 'destructive',
          })
        }
      } else {
        // User might need to confirm email first
        toast({
          title: 'Account created',
          description: 'Please check your email to verify your account. You can set up your company after logging in.',
        })
      }

      setIsLoading(false)
      navigate('/login')
    } catch (err) {
      setIsLoading(false)
      console.error('Signup error:', err)
      toast({
        title: 'Sign up failed',
        description: err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Enter your information to create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="My Company SARL"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
