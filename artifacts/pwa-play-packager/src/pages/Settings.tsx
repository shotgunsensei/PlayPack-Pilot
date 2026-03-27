import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { User, Crown, CreditCard, Terminal, FileText, Palette, LogOut, Rocket, ArrowLeft } from 'lucide-react';

export default function Settings() {
  const { user, plan, isProUser, preferences, updatePreferences, signOut, upgradePlan, projects } = useAppStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const activeCount = projects.filter(p => !p.archived).length;
  const archivedCount = projects.filter(p => p.archived).length;

  const handleSignOut = () => {
    signOut();
    toast({ title: 'Signed out' });
    setLocation('/');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/projects')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
        </div>
      </div>

      <Card className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Profile</h2>
        {user ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Name</Label>
                <p className="text-foreground font-medium">{user.displayName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="text-foreground font-medium">{user.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Member since</Label>
                <p className="text-foreground font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <Button variant="outline" className="border-white/10 text-destructive" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">You are using PlayPack Pilot as a guest.</p>
            <Button variant="outline" className="border-white/10" onClick={() => setLocation('/auth')}>
              <User className="w-4 h-4 mr-2" /> Sign In
            </Button>
          </div>
        )}
      </Card>

      <Card className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Crown className="w-5 h-5 text-primary" /> Plan & Usage</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-border/50">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isProUser ? 'text-primary' : 'text-foreground'}`}>
                  {isProUser ? 'Pro Plan' : 'Free Plan'}
                </span>
                {isProUser && <Crown className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isProUser ? 'Unlimited projects and premium features' : '1 project, basic features'}
              </p>
            </div>
            {!isProUser && (
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent border-0" onClick={() => setLocation('/pricing')}>
                Upgrade
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-muted-foreground text-xs">Active Projects</p>
              <p className="text-foreground font-bold text-lg">{activeCount}{!isProUser && '/1'}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-muted-foreground text-xs">Archived</p>
              <p className="text-foreground font-bold text-lg">{archivedCount}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Terminal className="w-5 h-5 text-primary" /> Command Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Default Shell</Label>
              <p className="text-xs text-muted-foreground">Used for generated build commands</p>
            </div>
            <Select value={preferences.shellType} onValueChange={v => updatePreferences({ shellType: v as 'bash' | 'powershell' })}>
              <SelectTrigger className="w-40 bg-black/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bash">Bash</SelectItem>
                <SelectItem value="powershell">PowerShell</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Export Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Branded Documentation</Label>
              <p className="text-xs text-muted-foreground">
                {isProUser ? 'Include PlayPack Pilot branding in exports' : 'Pro feature — upgrade to enable'}
              </p>
            </div>
            <Switch
              checked={preferences.defaultDocsBranding}
              onCheckedChange={v => {
                if (!isProUser) { toast({ variant: 'destructive', title: 'Pro feature', description: 'Upgrade to enable branded exports.' }); return; }
                updatePreferences({ defaultDocsBranding: v });
              }}
              disabled={!isProUser}
            />
          </div>
        </div>
      </Card>

      <Card className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /> Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <Label>Theme</Label>
            <p className="text-xs text-muted-foreground">Dark mode is the default</p>
          </div>
          <Select value={preferences.theme} onValueChange={v => updatePreferences({ theme: v as 'dark' | 'light' })}>
            <SelectTrigger className="w-40 bg-black/20"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="text-center pb-8">
        <p className="text-xs text-muted-foreground/50">
          PlayPack Pilot &bull; All data is stored locally in your browser.
        </p>
      </div>
    </motion.div>
  );
}
