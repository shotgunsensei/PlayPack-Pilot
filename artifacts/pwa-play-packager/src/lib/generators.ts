import type { ProjectConfig, SigningConfig } from './types';
import { releaseChecklistGroups } from './release-checklist';
import { bashCodeBlock, quoteShellArg } from './build-commands';

export const generateAssetLinks = (packageId: string, fingerprint: string) => {
  if (!packageId || !fingerprint) return '{"error": "Missing package ID or fingerprint"}';
  
  const json = [{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": packageId,
      "sha256_cert_fingerprints": [fingerprint]
    }
  }];
  
  return JSON.stringify(json, null, 2);
};

// The reviewed Android project is prepared locally; no project input is interpolated into shell/YAML.
export const generateGithubWorkflow = (_project: ProjectConfig) => {
  return `# Template for GitHub.com-hosted Ubuntu runners, not GitHub Enterprise Server.
# Commit a locally initialized, reviewed app/ project and configure existing owned signing secrets.
# Runner/SDK setup and a real signed Android build must be verified before release.
name: Android AAB Build
on:
  workflow_dispatch:
  push:
    branches: [ "main" ]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v3
        with:
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 24

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Check the reviewed Android project
        env:
          ANDROID_KEY_ALIAS: \${{ secrets.ANDROID_KEY_ALIAS }}
        run: |
          test -f app/twa-manifest.json
          test -f app/manifest-checksum.txt
          test -f app/gradlew
          node <<'NODE'
          const fs = require('node:fs');
          const crypto = require('node:crypto');
          const manifest = fs.readFileSync('app/twa-manifest.json');
          const config = JSON.parse(manifest.toString('utf8'));
          const checksum = crypto.createHash('sha1').update(manifest).digest('hex');
          if (fs.readFileSync('app/manifest-checksum.txt', 'utf8') !== checksum) {
            throw new Error('Update and review the Android project locally before running this template');
          }
          if (config.signingKey?.path !== '../android.keystore' ||
              !process.env.ANDROID_KEY_ALIAS || config.signingKey.alias !== process.env.ANDROID_KEY_ALIAS) {
            throw new Error('Review the existing signing key path and alias before running this template');
          }
          NODE

      - name: Install Bubblewrap
        run: npm install -g @bubblewrap/cli

      - name: Decode the existing upload keystore
        env:
          ANDROID_KEYSTORE_BASE64: \${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: |
          umask 077
          printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 --decode > android.keystore
          test -s android.keystore

      - name: Build AAB from the reviewed project
        working-directory: app
        env:
          BUBBLEWRAP_KEYSTORE_PASSWORD: \${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          BUBBLEWRAP_KEY_PASSWORD: \${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          test -n "$BUBBLEWRAP_KEYSTORE_PASSWORD"
          test -n "$BUBBLEWRAP_KEY_PASSWORD"
          bubblewrap build

      - name: Upload AAB Artifact
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2; Node24
        with:
          name: app-release
          path: app/app-release-bundle.aab
          if-no-files-found: error
          include-hidden-files: false

      - name: Remove the temporary upload keystore
        if: always()
        run: rm -f android.keystore
`;
};

export const generateReadme = (project: ProjectConfig) => {
  return `# ${project.appName || 'PWA App'} - Play Store Release
This repository contains the deployment assets and configurations to wrap the Progressive Web App into a Google Play Store AAB using Bubblewrap.

## Details
- **Domain:** ${project.domain}
- **Package ID:** ${project.packageId}
- **Version:** ${project.versionName} (${project.versionCode})

## Digital Asset Links
Ensure the \`assetlinks.json\` file is published at:
\`https://${project.domain || 'example.com'}/.well-known/assetlinks.json\`

## Building locally
Review the tool requirements and existing signing configuration before executing these interactive commands:
${bashCodeBlock(`npm i -g @bubblewrap/cli\nbubblewrap init --manifest=${quoteShellArg(project.manifestUrl || 'https://example.com/manifest.json', 'bash')}\nbubblewrap build`)}
`;
};

export const generateReleaseChecklist = () => {
  return '# Play Store Release Checklist\n\n' +
    'These are manual acceptance checks, not scanner results. Lighthouse 12 removed its PWA category.\n\n' +
    releaseChecklistGroups.map(group => '## ' + group.category + '\n' +
      group.items.map(item => '- [ ] ' + item.label).join('\n')).join('\n\n') + '\n';
};

export const generateSigningNotes = (signing: SigningConfig) => {
  return `# Android Signing Notes

Keep the existing owned keystore and passwords in your approved secure backup. This document contains public metadata only. Recovery depends on your Play App Signing enrollment and key type; review the official recovery process before changing any signing identity.

## Keystore Details
- **Filename:** ${signing.keystoreFilename}
- **Alias:** ${signing.keyAlias}
- **SHA-256 Fingerprint:** ${signing.sha256Fingerprint || 'NOT SET'}

## Commands
Inspect the existing key and extract its SHA-256 fingerprint (prompts for a password):
${bashCodeBlock(`keytool -list -v -keystore ${quoteShellArg(signing.keystoreFilename, 'bash')} -alias ${quoteShellArg(signing.keyAlias, 'bash')}`)}

## GitHub Secrets
Store the following in your repository's GitHub Secrets:
- \`ANDROID_KEYSTORE_BASE64\` - Base64-encoded keystore file
- \`ANDROID_KEYSTORE_PASSWORD\` - Store password
- \`ANDROID_KEY_ALIAS\` - Key alias (${signing.keyAlias})
- \`ANDROID_KEY_PASSWORD\` - Key password

If separately authorized, encode an existing owned keystore locally and add it through your approved secret-management process. Never put its bytes or passwords in this package:
${bashCodeBlock(`base64 < ${quoteShellArg(signing.keystoreFilename, 'bash')}`)}
`;
};

export const generateManifest = (project: ProjectConfig) => {
  const manifest = {
    name: project.appName || 'My PWA App',
    short_name: project.shortName || project.appName || 'App',
    start_url: project.startUrl || '/',
    display: project.displayMode || 'standalone',
    orientation: project.orientation || 'any',
    theme_color: project.themeColor || '#000000',
    background_color: project.backgroundColor || '#ffffff',
    icons: [
      ...(project.launcherIconUrl ? [{
        src: project.launcherIconUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }] : []),
      ...(project.monochromeIconUrl ? [{
        src: project.monochromeIconUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'monochrome'
      }] : [])
    ]
  };
  return JSON.stringify(manifest, null, 2);
};

export const generateReleaseNotes = (project: ProjectConfig) => {
  return `# Play Store Release Notes

## ${project.appName || 'App'} v${project.versionName || '1.0.0'} (Build ${project.versionCode || 1})

### What's New
- Initial release of ${project.appName || 'the app'} as a native Android experience
- [Describe only offline behavior verified for this release]
- [Describe only Android integrations verified for this release]

### Technical Notes
- Built using Trusted Web Activity (TWA) via Bubblewrap CLI
- Package ID: ${project.packageId || 'com.example.app'}
- Target domain: ${project.domain || 'example.com'}

### Short Description (80 chars max)
${project.appName || 'App'} - [write a reviewed description of verified capabilities].

### Full Description
${project.appName || 'This app'} wraps web content in a Trusted Web Activity. Replace this template with a reviewed description. Packaging alone does not add offline support or prove Android integrations.

Key features:
- Native Android app experience
- [Verified offline fallback and reconnect behavior]
- [Measured loading and responsiveness]
- [Tested web/service-worker update behavior]
`;
};

export const generateTroubleshooting = (project: ProjectConfig) => {
  return `# Troubleshooting Guide

## Common Issues

### 1. Browser Address Bar Showing
**Cause:** Digital Asset Links verification failed.
**Fix:**
- Verify \`assetlinks.json\` is at \`https://${project.domain || 'yourdomain.com'}/.well-known/assetlinks.json\`
- Ensure the file is served with \`Content-Type: application/json\`
- Confirm the SHA-256 fingerprint matches your signing key
- Test with: \`https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://${project.domain || 'yourdomain.com'}&relation=delegate_permission/common.handle_all_urls\`

### 2. App Crashes on Launch
**Cause:** Usually a manifest or configuration issue.
**Fix:**
- Validate your manifest URL is accessible: ${project.manifestUrl || 'https://yourdomain.com/manifest.json'}
- Ensure HTTPS is working correctly
- Check that start_url resolves properly
- Review the Android logcat output: \`adb logcat | grep -i twa\`

### 3. Build Fails with Bubblewrap
**Cause:** Environment or dependency issue.
**Fix:**
- Verify the JDK required by your reviewed Bubblewrap version: \`java -version\`
- Ensure Android SDK is available or let Bubblewrap download it
- Inspect the reviewed Bubblewrap documentation before changing tool configuration or caches; preserve signing material
- Review local initialization before re-running:
${bashCodeBlock(`bubblewrap init --manifest=${quoteShellArg(project.manifestUrl || 'https://yourdomain.com/manifest.json', 'bash')}`)}

### 4. Keystore Issues
**Fix:**
- Verify your keystore file exists and is not corrupted
- Confirm the alias matches: \`keytool -list -keystore your.keystore\`
- If access is lost, review Play App Signing recovery for your key type before changing signing identity or asset links

### 5. Version Code Conflicts on Upload
**Cause:** Play Console requires strictly incrementing version codes.
**Fix:**
- Current versionCode: ${project.versionCode || 1}
- Increment before each upload
- Check the last uploaded version in Play Console > Release Management

### 6. App Not Updating After Web Changes
**Cause:** Chrome TWA caching behavior.
**Fix:**
- Ensure your service worker has proper update logic
- Users may need to close and reopen the app
- Force update by incrementing the versionCode and uploading a new AAB
`;
};

export const generateDeploymentSop = (project: ProjectConfig, signing: SigningConfig) => {
  return `# Deployment Standard Operating Procedure

## Overview
This document outlines the step-by-step process for deploying ${project.appName || 'the app'} to the Google Play Store.

## Pre-Deployment Checklist
1. [ ] All PWA requirements are met (manifest, service worker, HTTPS)
2. [ ] Version code incremented from previous release (current: ${project.versionCode || 1})
3. [ ] Version name updated (current: ${project.versionName || '1.0.0'})
4. [ ] assetlinks.json is published and verified
5. [ ] Keystore file is accessible and passwords are confirmed

## Step 1: Prepare the Web App
- Deploy latest changes to ${project.domain || 'your domain'}
- Verify the manifest at ${project.manifestUrl || 'your manifest URL'}
- On the target Android device, verify install/launch, offline fallback, reconnect and service-worker updates
- Lighthouse has no PWA score since version12; retain separate performance/accessibility evidence

## Step 2: Build the Android Package
${bashCodeBlock(`# Review and install Bubblewrap
npm install -g @bubblewrap/cli

# Initialize (first time only)
bubblewrap init --manifest=${quoteShellArg(project.manifestUrl || 'https://yourdomain.com/manifest.json', 'bash')}

# Build the AAB
bubblewrap build`)}

## Step 3: Verify Signing
Initialization records the existing signing key in twa-manifest.json; the build prompts for its passwords and signs the output. Confirm the reviewed configuration and inspect the resulting bundle before upload:
- Keystore: ${signing.keystoreFilename}
- Alias: ${signing.keyAlias}

For the generated GitHub.com workflow, commit the reviewed Android project under app/, keep its manifest-checksum.txt in sync through Bubblewrap's local update flow, and configure its signingKey.path as ../android.keystore. Runner SDK setup and a real signed build remain separate acceptance checks.

## Step 4: Upload to Play Console
1. Open Google Play Console
2. Navigate to your app > Release > Production (or Internal Testing)
3. Create a new release
4. Upload the generated \`.aab\` file
5. Add release notes
6. Review and roll out

## Step 5: Post-Deployment Verification
1. Wait for Play Console processing (can take hours)
2. Install from the Play Store on a test device
3. Verify no browser address bar is showing (asset links working)
4. Test core functionality
5. Monitor crash reports in Play Console

## Rollback Procedure
If critical issues are found:
1. Halt the rollout in Play Console (if staged)
2. Fix the web app issues on your server
3. If Android-specific: build a new AAB with incremented versionCode
4. Upload the fixed AAB and create a new release

## Contacts & Resources
- Play Console: https://play.google.com/console
- Bubblewrap CLI: https://www.npmjs.com/package/@bubblewrap/cli
- TWA Docs: https://developer.chrome.com/docs/android/trusted-web-activity
- Digital Asset Links Tool: https://developers.google.com/digital-asset-links/tools/generator
`;
};

export const generateReleaseKitFiles = (project: ProjectConfig, signing: SigningConfig): Record<string, string> => {
  const safeSigning = {
    keystoreFilename: signing.keystoreFilename,
    keyAlias: signing.keyAlias,
    sha256Fingerprint: signing.sha256Fingerprint,
  };
  return {
    'manifest.json': generateManifest(project),
    'assetlinks.json': generateAssetLinks(project.packageId, signing.sha256Fingerprint),
    'pwa-packager-config.json': JSON.stringify({ project, signing: safeSigning }, null, 2),
    '.github/workflows/android-build.yml': generateGithubWorkflow(project),
    'docs/README.md': generateReadme(project),
    'docs/release-checklist.md': generateReleaseChecklist(),
    'docs/signing-notes.md': generateSigningNotes(signing),
    'docs/play-store-release-notes.md': generateReleaseNotes(project),
    'docs/troubleshooting.md': generateTroubleshooting(project),
    'docs/deployment-sop.md': generateDeploymentSop(project, signing),
  };
};
