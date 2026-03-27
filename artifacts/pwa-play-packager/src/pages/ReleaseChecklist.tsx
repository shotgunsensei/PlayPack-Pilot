import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const checklistItems = [
  {
    category: "1. PWA Requirements",
    items: [
      { id: "pwa-manifest", label: "Valid web manifest available at root or declared in HTML" },
      { id: "pwa-icons", label: "512x512 maskable icon included in manifest" },
      { id: "pwa-https", label: "Site is fully served over HTTPS" },
      { id: "pwa-lighthouse", label: "Lighthouse PWA check passes (offline support/service worker)" },
    ]
  },
  {
    category: "2. Android Verification",
    items: [
      { id: "assetlinks", label: "assetlinks.json deployed to /.well-known/assetlinks.json" },
      { id: "assetlinks-content", label: "assetlinks.json served with application/json content type" },
      { id: "keystore-backup", label: "Keystore file and passwords securely backed up off-machine" },
    ]
  },
  {
    category: "3. Build & Packaging",
    items: [
      { id: "build-version", label: "versionCode and versionName incremented properly" },
      { id: "build-aab", label: "Successfully compiled into an .aab file" },
    ]
  },
  {
    category: "4. Google Play Console",
    items: [
      { id: "play-app-created", label: "App entry created in Play Console" },
      { id: "play-content-rating", label: "Content rating survey completed" },
      { id: "play-data-safety", label: "Data safety questionnaire filled out" },
      { id: "play-privacy", label: "Privacy policy URL provided" },
      { id: "play-assets", label: "Screenshots, hi-res icon, and feature graphic uploaded" },
    ]
  },
  {
    category: "5. Testing & Release",
    items: [
      { id: "release-internal", label: "AAB uploaded to Internal Testing track" },
      { id: "release-address-bar", label: "Tested on physical device (ensure URL bar is hidden!)" },
      { id: "release-prod", label: "Promoted to Production track and submitted for review" },
    ]
  }
];

export default function ReleaseChecklist() {
  const { checklist, updateChecklist } = useAppStore();

  const totalItems = checklistItems.flatMap(c => c.items).length;
  const completedItems = Object.values(checklist).filter(Boolean).length;
  const progress = Math.round((completedItems / totalItems) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Release Checklist</h1>
          <p className="text-muted-foreground mt-1">Track your progress from local build to Play Store review.</p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10 shrink-0">
          <div className="text-sm font-bold text-foreground">{progress}% Complete</div>
          <div className="w-32 h-2 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {checklistItems.map((group, idx) => (
          <Card key={idx} className="glass-card p-6">
            <h2 className="text-lg font-bold mb-4 text-foreground">{group.category}</h2>
            <div className="space-y-4">
              {group.items.map((item) => (
                <label 
                  key={item.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    checklist[item.id] ? 'bg-primary/5 border-primary/20' : 'bg-transparent border-transparent hover:bg-white/5'
                  }`}
                >
                  <Checkbox 
                    className="mt-0.5" 
                    checked={checklist[item.id] || false} 
                    onCheckedChange={(checked) => updateChecklist(item.id, checked === true)} 
                  />
                  <span className={`text-sm select-none ${checklist[item.id] ? 'text-foreground/80 line-through' : 'text-foreground'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
