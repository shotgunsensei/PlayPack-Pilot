import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import { Rocket, ArrowLeft, Mail, User, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [, setLocation] = useLocation();
  const { signIn, signUp, adminSignIn, user } = useAppStore();
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/projects');
      }
    }
  }, [user, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ variant: 'destructive', title: 'Email required' });
      return;
    }

    if (mode === 'signin' && adminSignIn(email, password)) {
      toast({ title: 'Admin signed in', description: 'Welcome, administrator.' });
      setLocation('/admin');
      return;
    }

    if (mode === 'signup') {
      if (!name) {
        toast({ variant: 'destructive', title: 'Name required' });
        return;
      }
      signUp(email, name);
      toast({ title: 'Account created', description: 'Welcome to PlayPack Pilot!' });
    } else {
      signIn(email, name || email.split('@')[0]);
      toast({ title: 'Signed in', description: 'Welcome back!' });
    }
    setLocation('/projects');
  };

  const handleGuestMode = () => {
    setLocation('/projects');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => setLocation('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <Rocket className="w-5 h-5 text-primary" />
            <span className="font-display font-bold">PlayPack Pilot</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-display font-bold">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === 'signin' ? 'Sign in to access your projects' : 'Get started with PlayPack Pilot'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Developer" className="pl-10 bg-black/20" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 bg-black/20" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10 bg-black/20"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent border-0">
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">or</span></div>
            </div>

            <Button variant="outline" className="w-full border-white/10" onClick={handleGuestMode}>
              Continue as Guest
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === 'signin' ? (
                <>Don't have an account? <button onClick={() => setMode('signup')} className="text-primary hover:underline">Sign up</button></>
              ) : (
                <>Already have an account? <button onClick={() => setMode('signin')} className="text-primary hover:underline">Sign in</button></>
              )}
            </p>

            <p className="text-xs text-muted-foreground/50 text-center mt-4">
              This is a demo auth system. Data is stored locally in your browser.
              No passwords are transmitted or stored on any server.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
