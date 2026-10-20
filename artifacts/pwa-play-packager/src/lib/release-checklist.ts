import type { ChecklistState } from './types';

export const releaseChecklistGroups = [
  {
    category: "1. PWA Requirements",
    items: [
      { id: "pwa-manifest", label: "Valid web manifest available at root or declared in HTML" },
      { id: "pwa-icons", label: "512x512 maskable icon included in manifest" },
      { id: "pwa-https", label: "Site is fully served over HTTPS" },
      { id: "pwa-install-device", label: "Installed in supported Chrome and launched from the Android device launcher" },
      { id: "pwa-offline-device", label: "Offline fallback, reconnect, and service-worker update behavior tested on the target device" },
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

export function getReleaseChecklistProgress(checklist: ChecklistState) {
  const items = releaseChecklistGroups.flatMap(group => group.items);
  const completedItems = items.filter(item => checklist[item.id] === true).length;
  return { totalItems: items.length, completedItems, progress: Math.round(completedItems / items.length * 100) };
}
