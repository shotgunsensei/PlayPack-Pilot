import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProjectSetup() {
  const { project, updateProject } = useAppStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateProject({ [name]: name === 'versionCode' ? parseInt(value) || 0 : value });
  };

  const handleSelectChange = (name: string, value: string) => {
    updateProject({ [name]: value });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Project Setup</h1>
        <p className="text-muted-foreground mt-1">Define your Progressive Web App metadata and Android app configuration.</p>
      </div>

      <Card className="glass-card p-6 md:p-8">
        <h2 className="text-xl font-bold mb-6 border-b border-border/50 pb-4 text-foreground">Core Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="appName">App Name (Play Store Title)</Label>
            <Input id="appName" name="appName" value={project.appName} onChange={handleChange} placeholder="My Awesome PWA" className="bg-black/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shortName">Short Name (Device Homescreen)</Label>
            <Input id="shortName" name="shortName" value={project.shortName} onChange={handleChange} placeholder="Awesome" className="bg-black/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="packageId">Android Package ID</Label>
            <Input id="packageId" name="packageId" value={project.packageId} onChange={handleChange} placeholder="com.example.awesome" className="bg-black/20 font-mono" />
            <p className="text-xs text-muted-foreground">Used to uniquely identify your app in the Play Store.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Primary Domain</Label>
            <Input id="domain" name="domain" value={project.domain} onChange={handleChange} placeholder="awesome.example.com" className="bg-black/20 font-mono" />
            <p className="text-xs text-muted-foreground">Without https:// or paths. Used for assetlinks.</p>
          </div>
        </div>
      </Card>

      <Card className="glass-card p-6 md:p-8">
        <h2 className="text-xl font-bold mb-6 border-b border-border/50 pb-4 text-foreground">Web Configurations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input id="baseUrl" name="baseUrl" value={project.baseUrl} onChange={handleChange} placeholder="/" className="bg-black/20 font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startUrl">Start URL</Label>
            <Input id="startUrl" name="startUrl" value={project.startUrl} onChange={handleChange} placeholder="/" className="bg-black/20 font-mono" />
          </div>
          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label htmlFor="manifestUrl">Manifest URL</Label>
            <Input id="manifestUrl" name="manifestUrl" value={project.manifestUrl} onChange={handleChange} placeholder="https://awesome.example.com/manifest.json" className="bg-black/20 font-mono" />
            <p className="text-xs text-muted-foreground">Full URL to your live web manifest.</p>
          </div>
        </div>
      </Card>

      <Card className="glass-card p-6 md:p-8">
        <h2 className="text-xl font-bold mb-6 border-b border-border/50 pb-4 text-foreground">Appearance & Icons</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="themeColor">Theme Color (Hex)</Label>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-md border border-border shrink-0 overflow-hidden" style={{ backgroundColor: project.themeColor }}>
                <input type="color" name="themeColor" value={project.themeColor} onChange={handleChange} className="opacity-0 w-full h-full cursor-pointer" />
              </div>
              <Input id="themeColor" name="themeColor" value={project.themeColor} onChange={handleChange} className="bg-black/20 font-mono uppercase" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="backgroundColor">Background Color (Hex)</Label>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-md border border-border shrink-0 overflow-hidden" style={{ backgroundColor: project.backgroundColor }}>
                <input type="color" name="backgroundColor" value={project.backgroundColor} onChange={handleChange} className="opacity-0 w-full h-full cursor-pointer" />
              </div>
              <Input id="backgroundColor" name="backgroundColor" value={project.backgroundColor} onChange={handleChange} className="bg-black/20 font-mono uppercase" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Orientation</Label>
            <Select value={project.orientation} onValueChange={(val) => handleSelectChange('orientation', val)}>
              <SelectTrigger className="bg-black/20">
                <SelectValue placeholder="Select orientation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any (Auto-rotate)</SelectItem>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Display Mode</Label>
            <Select value={project.displayMode} onValueChange={(val) => handleSelectChange('displayMode', val)}>
              <SelectTrigger className="bg-black/20">
                <SelectValue placeholder="Select display mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standalone">Standalone (Standard App)</SelectItem>
                <SelectItem value="fullscreen">Fullscreen</SelectItem>
                <SelectItem value="minimal-ui">Minimal UI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label htmlFor="launcherIconUrl">Launcher Icon URL (512x512)</Label>
            <Input id="launcherIconUrl" name="launcherIconUrl" value={project.launcherIconUrl} onChange={handleChange} placeholder="https://example.com/icon-512.png" className="bg-black/20 font-mono" />
          </div>
        </div>
      </Card>

      <Card className="glass-card p-6 md:p-8">
        <h2 className="text-xl font-bold mb-6 border-b border-border/50 pb-4 text-foreground">Versioning</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="versionName">Version Name</Label>
            <Input id="versionName" name="versionName" value={project.versionName} onChange={handleChange} placeholder="1.0.0" className="bg-black/20 font-mono" />
            <p className="text-xs text-muted-foreground">Publicly visible version string (e.g., 1.0.0)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="versionCode">Version Code</Label>
            <Input id="versionCode" type="number" name="versionCode" value={project.versionCode} onChange={handleChange} placeholder="1" className="bg-black/20 font-mono" />
            <p className="text-xs text-muted-foreground">Internal integer. Must increment on every Play Store upload.</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
