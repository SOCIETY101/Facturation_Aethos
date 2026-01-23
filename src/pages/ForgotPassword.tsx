import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Mail } from 'lucide-react'
import Logo from '@/assets/Logo.png'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const { error } = await resetPassword(email)
    setIsLoading(false)
    if (!error) {
      setIsSubmitted(true)
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="w-full max-w-md px-4">
          <div className="flex justify-center mb-8">
            <img src={Logo} alt="Aethos Logo" className="h-16 w-auto" />
          </div>
          <Card className="w-full shadow-xl border-0">
            <CardHeader className="space-y-3 text-center pb-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#a0302a]/10">
                <Mail className="h-6 w-6 text-[#a0302a]" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Vérifiez votre email</CardTitle>
              <CardDescription className="text-gray-600">
                Nous avons envoyé un lien de réinitialisation à {email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-center text-gray-600">
                  Cliquez sur le lien dans l'email pour réinitialiser votre mot de passe. Si vous ne le voyez pas, vérifiez votre dossier spam.
                </p>
                <Button asChild className="w-full h-11 bg-[#a0302a] hover:bg-[#8a2520] text-white font-semibold">
                  <Link to="/login">Retour à la connexion</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
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
              <Button 
                type="submit" 
                className="w-full h-11 bg-[#a0302a] hover:bg-[#8a2520] text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200" 
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Envoyer le lien
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <Link to="/login" className="text-[#a0302a] hover:text-[#8a2520] font-semibold hover:underline">
                Retour à la connexion
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
