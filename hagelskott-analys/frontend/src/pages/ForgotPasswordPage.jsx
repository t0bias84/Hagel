import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

/**
 * ForgotPasswordPage – sida för att begära återställning av lösenord
 */
const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Vänligen ange din e-postadress');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/password-reset', { email });
      
      if (response.ok) {
        setSuccess(true);
        toast.success('Instruktioner för återställning har skickats till din e-post!');
      } else {
        const data = await response.json();
        setError(data.detail || 'Ett fel uppstod vid begäran om lösenordsåterställning.');
      }
    } catch (err) {
      setError('Det gick inte att ansluta till servern. Vänligen försök igen senare.');
      console.error('Password reset request error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Hagelskott Analys" className="h-12" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Glömt lösenord</CardTitle>
          <CardDescription className="text-center">
            Ange din e-postadress så skickar vi instruktioner för att återställa ditt lösenord.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Fel</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success ? (
            <div className="space-y-4">
              <Alert className="mb-4 bg-green-50 border-green-500 text-green-700">
                <AlertTitle>E-post skickad!</AlertTitle>
                <AlertDescription>
                  Vi har skickat instruktioner för att återställa ditt lösenord till din e-post. Kontrollera din inkorg och följ anvisningarna där.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => navigate('/login')}
                className="w-full"
                variant="outline"
              >
                Tillbaka till inloggning
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-postadress</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="din.email@exempel.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-military-green hover:bg-military-green-dark"
                disabled={isLoading}
              >
                {isLoading ? 'Skickar...' : 'Skicka återställningsinstruktioner'}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter>
          <div className="text-center w-full">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-800">
              Tillbaka till inloggning
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage; 