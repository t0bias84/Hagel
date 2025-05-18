import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';

/**
 * ResetPasswordPage – sida för att återställa lösenord efter att användaren har klickat på länken i e-posten
 */
const ResetPasswordPage = () => {
  const { API_URL } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Hämta token från URL-parametrar
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("token");
  
  const [formData, setFormData] = useState({
    new_password: "",
    confirm_password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Kontrollera att token finns
  useEffect(() => {
    if (!token) {
      setError("Ingen återställningstoken hittades i URL:en. Återställningslänken kan vara ogiltig eller ha gått ut.");
    }
  }, [token]);

  // Hantera formulärändringar
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Växla lösenordssynlighet
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const validatePassword = () => {
    if (formData.new_password.length < 8) {
      setError('Lösenordet måste vara minst 8 tecken långt');
      return false;
    }
    
    if (formData.new_password !== formData.confirm_password) {
      setError('Lösenorden matchar inte');
      return false;
    }
    
    return true;
  };

  // Hantera formuläret (återställning av lösenord)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      setError('Ingen återställningstoken hittades. Vänligen begär en ny länk för lösenordsåterställning.');
      return;
    }
    
    if (!validatePassword()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password,
      });
      
      if (response.ok) {
        setSuccess(true);
        toast.success('Ditt lösenord har återställts!');
      } else {
        const data = await response.json();
        setError(data.detail || 'Ett fel uppstod vid återställning av lösenordet.');
      }
    } catch (err) {
      setError('Det gick inte att ansluta till servern. Vänligen försök igen senare.');
      console.error('Password reset error:', err);
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
          <CardTitle className="text-2xl font-bold text-center">Återställ lösenord</CardTitle>
          <CardDescription className="text-center">
            Ange ditt nya lösenord nedan
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Fel</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!token && !error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Saknar token</AlertTitle>
              <AlertDescription>
                Ingen återställningstoken hittades. Vänligen kontrollera att du använder korrekt länk från ditt e-postmeddelande.
              </AlertDescription>
            </Alert>
          )}
          
          {success ? (
            <div className="space-y-4">
              <Alert className="mb-4 bg-green-50 border-green-500 text-green-700">
                <AlertTitle>Lösenordet återställt!</AlertTitle>
                <AlertDescription>
                  Ditt lösenord har ändrats. Du kan nu logga in med ditt nya lösenord.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => navigate('/login')}
                className="w-full"
                variant="default"
              >
                Gå till inloggning
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">Nytt lösenord</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="new_password"
                    name="new_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nytt lösenord"
                    value={formData.new_password}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    disabled={isLoading || !token}
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    tabIndex="-1"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Bekräfta lösenord</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Bekräfta lösenord"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className="pl-10"
                    disabled={isLoading || !token}
                    required
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-military-green hover:bg-military-green-dark"
                disabled={isLoading || !token}
              >
                {isLoading ? 'Återställer...' : 'Återställ lösenord'}
              </Button>
            </form>
          )}
        </CardContent>
        
        <CardFooter>
          <div className="text-center w-full">
            <Button
              onClick={() => navigate('/forgot-password')}
              variant="link"
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Behöver du en ny återställningslänk?
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPasswordPage; 