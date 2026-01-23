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
import Logo from '@/assets/Logo.png'

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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8">
      <div className="w-full max-w-md px-4">
        {/* Logo Section */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <img 
              src={Logo} 
              alt="Aethos Logo" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        <Card className="w-full shadow-xl border-0">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="text-3xl font-bold text-center text-gray-900">
              Créer un compte
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Entrez vos informations pour créer un nouveau compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-700 font-medium">
                  Nom complet
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 border-gray-300 focus:border-[#a0302a] focus:ring-[#a0302a]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-gray-700 font-medium">
                  Nom de l'entreprise
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Mon Entreprise SARL"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 border-gray-300 focus:border-[#a0302a] focus:ring-[#a0302a]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 border-gray-300 focus:border-[#a0302a] focus:ring-[#a0302a]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="h-11 border-gray-300 focus:border-[#a0302a] focus:ring-[#a0302a]"
                />
                <p className="text-xs text-gray-500">
                  Le mot de passe doit contenir au moins 6 caractères
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-[#a0302a] hover:bg-[#8a2520] text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200" 
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le compte
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Vous avez déjà un compte? </span>
              <Link 
                to="/login" 
                className="text-[#a0302a] hover:text-[#8a2520] font-semibold hover:underline"
              >
                Se connecter
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © 2025 Aethos - L'innovation digitale à 360°
          </p>
        </div>
      </div>
    </div>
  )
}
