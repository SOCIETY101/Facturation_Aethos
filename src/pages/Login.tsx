import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import Logo from '@/assets/Logo.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const { error } = await signIn(email, password)
    setIsLoading(false)
    if (!error) {
      navigate('/')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="w-full max-w-md px-4">
        {/* Logo Section */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            
          </div>
        </div>

        <Card className="w-full shadow-xl border-0">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex justify-center">
              <img 
                src={Logo} 
                alt="Aethos Logo" 
                className="h-18 w-auto object-contain"
              />
            </div>
            <CardDescription className="text-center text-gray-600">
              Entrez vos identifiants pour accéder à votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    Mot de passe
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-[#a0302a] hover:text-[#8a2520] hover:underline font-medium"
                  >
                    Mot de passe oublié?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 border-gray-300 focus:border-[#a0302a] focus:ring-[#a0302a]"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-[#a0302a] hover:bg-[#8a2520] text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200" 
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Se connecter
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Vous n'avez pas de compte? </span>
              <Link 
                to="/signup" 
                className="text-[#a0302a] hover:text-[#8a2520] font-semibold hover:underline"
              >
                Créer un compte
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
