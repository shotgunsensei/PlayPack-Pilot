import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CommandBlock } from '@/components/CommandBlock';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export default function SigningPlanner() {
  const { signing, updateSigning, project } = useAppStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSigning({ [e.target.name]: e.target.value });
  };

  const genKeyCommand = `keytool -genkeypair -v -keystore ${signing.keystoreFilename || 'android.keystore'} -alias ${signing.keyAlias || 'android'} -keyalg RSA -keysize 2048 -validity 10000`;
  const listKeyCommand = `keytool -list -v -keystore ${signing.keystoreFilename || 'android.keystore'} -alias ${signing.keyAlias || 'android'}`;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Signing & Certificate Planner</h1>
        <p className="text-muted-foreground mt-1">Configure your keystore details required for Android AAB signing.</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 flex gap-4">
        <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <h3 className="font-bold text-amber-500">Crucial Security Warning</h3>
          <p className="text-sm text-amber-200/80 leading-relaxed">
            Google Play uses App Signing by Play by default. The key you generate here will become your <strong>Upload Key</strong>. 
            If you lose this keystore file, you will need to contact Google Support to reset it. Keep it secure and backed up!
            <br/><br/>
            <strong>Never commit your keystore or passwords to public version control.</strong>
          </p>
        </div>
      </div>

      <Card className="glass-card p-6 md:p-8">
        <h2 className="text-xl font-bold mb-6 border-b border-border/50 pb-4 text-foreground">Keystore Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="keystoreFilename">Keystore Filename</Label>
            <Input id="keystoreFilename" name="keystoreFilename" value={signing.keystoreFilename} onChange={handleChange} placeholder="app-release.keystore" className="bg-black/20 font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyAlias">Key Alias</Label>
            <Input id="keyAlias" name="keyAlias" value={signing.keyAlias} onChange={handleChange} placeholder="my-app-alias" className="bg-black/20 font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storePassword">Store Password (Optional tracking)</Label>
            <Input id="storePassword" type="password" name="storePassword" value={signing.storePassword || ''} onChange={handleChange} placeholder="••••••••" className="bg-black/20 font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyPassword">Key Password (Optional tracking)</Label>
            <Input id="keyPassword" type="password" name="keyPassword" value={signing.keyPassword || ''} onChange={handleChange} placeholder="••••••••" className="bg-black/20 font-mono" />
          </div>
          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label htmlFor="sha256Fingerprint">SHA-256 Certificate Fingerprint</Label>
            <Input id="sha256Fingerprint" name="sha256Fingerprint" value={signing.sha256Fingerprint} onChange={handleChange} placeholder="AA:BB:CC:DD:EE:FF..." className="bg-black/20 font-mono uppercase" />
            <p className="text-xs text-muted-foreground">Required for Digital Asset Links. Extract this using the list command below.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6">
        <Card className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4 text-foreground">1. Generate Keystore</h2>
          <p className="text-sm text-muted-foreground mb-4">Run this in your terminal to create a new keystore file.</p>
          <CommandBlock command={genKeyCommand} label="Terminal (bash/cmd)" />
        </Card>

        <Card className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4 text-foreground">2. Extract SHA-256 Fingerprint</h2>
          <p className="text-sm text-muted-foreground mb-4">After generation, run this to view the certificate fingerprints. Copy the SHA256 string into the field above.</p>
          <CommandBlock command={listKeyCommand} label="Terminal (bash/cmd)" />
        </Card>
      </div>
    </motion.div>
  );
}
