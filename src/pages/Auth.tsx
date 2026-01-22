import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LogIn, UserPlus, Loader, Users, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isPhoneValid } from '@/components/booking/booking-validators';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchProfileWithRetry = async (userId: string) => {
    const attempts = 6;
    const delayMs = 300;
    for (let i = 0; i < attempts; i++) {
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('user_id, name, full_name, username, email, phone_number')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) return data;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return null;
  };

  const syncProfileFromAuthUser = async (authUser: any) => {
    if (!authUser?.id) return;

    const profileRow = await fetchProfileWithRetry(authUser.id);
    if (profileRow) {
      setProfile(profileRow);
    }
    return profileRow;
  };

  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameAvailable(false);
        return;
      }

      setCheckingUsername(true);
      const { data } = await supabase
        .from('profiles' as any)
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      setCheckingUsername(false);
      setUsernameAvailable(!data);
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    const hydrateProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        await syncProfileFromAuthUser(authData.user);
      }
    };
    hydrateProfile();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usernameAvailable) {
      toast({
        title: "Username not available",
        description: "Please choose a different username",
        variant: "destructive",
      });
      return;
    }

    const sanitizedPhone = phone.replace(/\D/g, '');
    if (!isPhoneValid(sanitizedPhone)) {
      setPhoneError('Enter a valid UAE mobile number (e.g., 50xxxxxxx).');
      return;
    }
    
    setPhoneError(null);
    setIsLoading(true);
    
    try {
      const fullPhone = `+971${sanitizedPhone}`;
      const sanitizedUsername = username.trim().toLowerCase();
      const fullName = name.trim();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: sanitizedUsername,
            phone_number: fullPhone,
          }
        }
      });
      
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('Account created but missing user data.');

      // Fetch the profile created by the DB trigger (best-effort retry)
      await fetchProfileWithRetry(signUpData.user.id);

      toast({
        title: "Account created",
        description: "Please check your email to verify your account.",
      });

      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setPhone('');
      setPhoneError(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to create account',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginEmail.trim();
    if (!identifier || !loginPassword) {
      toast({
        title: "Missing information",
        description: "Enter your email and password.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: loginPassword,
      });
      
      if (error) throw error;

      const userRes = await supabase.auth.getUser();
      const authUser = userRes.data.user;
      if (authUser) {
        await syncProfileFromAuthUser(authUser);
      }
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-xl">P</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome to Pixoul Hub
          </h1>
          <p className="text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Authentication</CardTitle>
          <CardDescription>
              Sign in to your account or create a new one
          </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="text"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <div className="relative">
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pr-10"
                        required
                        minLength={3}
                        maxLength={20}
                        pattern="[a-zA-Z0-9_]+"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername && <Loader className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {!checkingUsername && usernameAvailable === true && <Check className="h-4 w-4 text-green-500" />}
                        {!checkingUsername && usernameAvailable === false && <X className="h-4 w-4 text-red-500" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      3-20 characters, letters, numbers, and underscores only
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-input bg-muted text-sm text-muted-foreground select-none">
                        +971
                      </span>
                      <Input
                        id="signup-phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="5xxxxxxxx"
                        value={phone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                          setPhone(digits);
                          if (phoneError && isPhoneValid(digits)) {
                            setPhoneError(null);
                          }
                        }}
                        className="rounded-l-none"
                        required
                      />
                    </div>
                    {phoneError && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>{phoneError}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || usernameAvailable !== true || !isPhoneValid(phone)}
                  >
                    {isLoading ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Welcome to Pixoul Hub - Your gaming destination
          </p>
        </div>
      </div>
    </div>
  );
}
