import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const urlMode = searchParams.get('mode');
    const type = searchParams.get('type');
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    const errorDescription = searchParams.get('error_description');
    
    // Check for expired or invalid reset links
    if (error && (errorCode === 'otp_expired' || error === 'access_denied')) {
      toast({
        title: "Reset Link Expired",
        description: decodeURIComponent(errorDescription?.replace(/\+/g, ' ') || "This password reset link has expired. Please request a new one."),
        variant: "destructive",
      });
      setMode('forgot-password');
      // Clear the URL parameters
      navigate('/auth', { replace: true });
      return;
    }
    
    // Check if this is a password reset link
    if (urlMode === 'reset-password' || type === 'recovery') {
      setMode('reset-password');
    }
  }, [searchParams, navigate]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getErrorMessage = (error: Error | any) => {
    if (!error?.message) return 'An unexpected error occurred';
    
    const message = error.message.toLowerCase();
    
    if (message.includes('invalid_credentials') || message.includes('invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (message.includes('email not confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.';
    }
    if (message.includes('user not found')) {
      return 'No account found with this email address.';
    }
    if (message.includes('email already registered') || message.includes('already registered')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (message.includes('password')) {
      return 'Password must be at least 6 characters long.';
    }
    
    return error.message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      switch (mode) {
        case 'login': {
          const { error } = await signIn(email, password);
          if (error) {
            toast({
              title: "Login Failed",
              description: getErrorMessage(error),
              variant: "destructive",
            });
          } else {
            toast({
              title: "Welcome back!",
              description: "You have been logged in successfully.",
            });
            navigate('/dashboard');
          }
          break;
        }
        
        case 'signup': {
          if (!fullName.trim()) {
            toast({
              title: "Name Required",
              description: "Please enter your full name.",
              variant: "destructive",
            });
            return;
          }
          
          const { error } = await signUp(email, password, fullName);
          if (error) {
            toast({
              title: "Sign Up Failed",
              description: getErrorMessage(error),
              variant: "destructive",
            });
          } else {
            toast({
              title: "Account Created!",
              description: "Please check your email to verify your account, then sign in.",
            });
            setMode('login');
            setFullName('');
          }
          break;
        }
        
        case 'forgot-password': {
          const { error } = await resetPassword(email);
          if (error) {
            toast({
              title: "Reset Failed",
              description: getErrorMessage(error),
              variant: "destructive",
            });
          } else {
            toast({
              title: "Reset Email Sent!",
              description: "Check your email for password reset instructions.",
            });
            setMode('login');
          }
          break;
        }
        
        case 'reset-password': {
          if (password !== confirmPassword) {
            toast({
              title: "Passwords Don't Match",
              description: "Please make sure both passwords are identical.",
              variant: "destructive",
            });
            return;
          }
          
          const { error } = await updatePassword(password);
          if (error) {
            toast({
              title: "Password Update Failed",
              description: getErrorMessage(error),
              variant: "destructive",
            });
          } else {
            toast({
              title: "Password Updated!",
              description: "Your password has been successfully updated.",
            });
            navigate('/dashboard');
          }
          break;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot-password': return 'Reset Password';
      case 'reset-password': return 'Set New Password';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return 'Sign in to your AayuTrace account';
      case 'signup': return 'Join AayuTrace to start tracking your products';
      case 'forgot-password': return 'Enter your email to receive reset instructions';
      case 'reset-password': return 'Enter your new password';
    }
  };

  const getButtonText = () => {
    if (loading) return 'Loading...';
    switch (mode) {
      case 'login': return 'Sign In';
      case 'signup': return 'Sign Up';
      case 'forgot-password': return 'Send Reset Email';
      case 'reset-password': return 'Update Password';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-subtle">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            {getTitle()}
          </CardTitle>
          <CardDescription>
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}
            
            {mode !== 'reset-password' && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            )}
            
            {(mode === 'login' || mode === 'signup' || mode === 'reset-password') && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {mode === 'reset-password' ? 'New Password' : 'Password'}
                </Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'reset-password' ? 'Enter new password' : 'Enter your password'}
                  required
                />
              </div>
            )}
            
            {mode === 'reset-password' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                />
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {getButtonText()}
            </Button>
          </form>
          
          <div className="mt-4 space-y-2 text-center">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => setMode('forgot-password')}
                  className="text-sm text-primary hover:underline block"
                >
                  Forgot your password?
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Don't have an account? Sign up
                </button>
              </>
            )}
            
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Already have an account? Sign in
              </button>
            )}
            
            {(mode === 'forgot-password' || mode === 'reset-password') && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode('login')}
                className="text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}