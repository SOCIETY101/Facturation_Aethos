import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import Logo from '@/assets/Logo.png'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Check if we have the access token from the reset link
    const accessToken = searchParams.get('access_token')
    if (!accessToken) {
      navigate('/login')
    }
  }, [searchParams, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      return
    }
    setIsLoading(true)
    const { error } = await updatePassword(password)
    setIsLoading(false)
    if (!error) {
      navigate('/login')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="w-full max-w-md px-4">
        <div className="flex justify-center mb-8">
          <img src={Logo} alt="Aethos Logo" className="h-16 w-auto" />
        </div>
        <Card className="w-full shadow-xl border-0">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="text-3xl font-bold text-center text-gray-900">Réinitialiser le mot de passe</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Entrez votre nouveau mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">Nouveau mot de passe</Label>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="h-11 border-gray-300 focus:border-[#a0302a] focus:ring-[#a0302a]"
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-[#a0302a]">Les mots de passe ne correspondent pas</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-[#a0302a] hover:bg-[#8a2520] text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                disabled={isLoading || password !== confirmPassword}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mettre à jour le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
