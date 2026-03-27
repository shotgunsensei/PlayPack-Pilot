import { ProjectConfig, SigningConfig } from './types';

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

export const generateGithubWorkflow = (project: ProjectConfig) => {
  return `name: Android AAB Build
on:
  workflow_dispatch:
  push:
    branches: [ "main" ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'zulu'
          java-version: '17'

      - name: Install Bubblewrap
        run: npm install -g @bubblewrap/cli

      - name: Decode Keystore
        env:
          ANDROID_KEYSTORE_BASE64: \${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: |
          echo $ANDROID_KEYSTORE_BASE64 | base64 --decode > android.keystore

      - name: Initialize Bubblewrap Project
        run: |
          bubblewrap init --manifest="${project.manifestUrl || 'https://example.com/manifest.json'}" \\
            --directory=app \\
            --alphaDependencies

      - name: Build AAB
        env:
          ANDROID_KEYSTORE_PASSWORD: \${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: \${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: \${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          cd app
          # Inject keystore passwords into bubblewrap config or run build with them
          bubblewrap build --keyStore=../android.keystore \\
            --alias=$ANDROID_KEY_ALIAS \\
            --keyStorePassword=$ANDROID_KEYSTORE_PASSWORD \\
            --keyPassword=$ANDROID_KEY_PASSWORD

      - name: Upload AAB Artifact
        uses: actions/upload-artifact@v3
        with:
          name: app-release
          path: app/app-release-bundle.aab
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
1. Install bubblewrap: \`npm i -g @bubblewrap/cli\`
2. Init: \`bubblewrap init --manifest=${project.manifestUrl}\`
3. Build: \`bubblewrap build\`
`;
};

export const generateReleaseChecklist = () => {
  return `# Play Store Release Checklist

## 1. Pre-requisites
- [ ] PWA Manifest is valid and contains icons (512x512 maskable recommended)
- [ ] Lighthouse PWA score is passing
- [ ] Lighthouse Performance score is decent

## 2. Verification
- [ ] \`assetlinks.json\` is deployed to \`/.well-known/assetlinks.json\`
- [ ] Content-Type for assetlinks is \`application/json\`
- [ ] Assetlinks tested with Google API testing tool

## 3. Play Console Setup
- [ ] Create App in Google Play Console
- [ ] Complete App Content surveys (Privacy Policy, Data Safety, Content Rating)
- [ ] Set up Store Listing (Descriptions, Screenshots, Feature Graphic)

## 4. Build & Upload
- [ ] Bump \`versionCode\` and \`versionName\`
- [ ] Generate signed AAB file
- [ ] Upload to Internal Testing track
- [ ] Test on physical Android device
- [ ] Promote to Production
`;
};

export const generateSigningNotes = (signing: SigningConfig) => {
  return `# Android Signing Notes

**CRITICAL: DO NOT LOSE YOUR KEYSTORE FILE OR PASSWORDS.**

If you lose the upload key, you will have to request a reset from Google Play Support, which takes days. If you opted out of Play App Signing and lose your app signing key, you can NEVER update the app again.

## Keystore Details
- **Filename:** ${signing.keystoreFilename}
- **Alias:** ${signing.keyAlias}
- **SHA-256 Fingerprint:** ${signing.sha256Fingerprint || 'NOT SET'}

## Commands
Generate a new key:
\`keytool -genkeypair -v -keystore ${signing.keystoreFilename} -alias ${signing.keyAlias} -keyalg RSA -keysize 2048 -validity 10000\`

Extract SHA-256 Fingerprint:
\`keytool -list -v -keystore ${signing.keystoreFilename} -alias ${signing.keyAlias}\`

## GitHub Secrets
Store the following in your repository's GitHub Secrets:
- \`ANDROID_KEYSTORE_BASE64\` - Base64-encoded keystore file
- \`ANDROID_KEYSTORE_PASSWORD\` - Store password
- \`ANDROID_KEY_ALIAS\` - Key alias (${signing.keyAlias})
- \`ANDROID_KEY_PASSWORD\` - Key password

To encode your keystore for GitHub Secrets:
\`\`\`bash
base64 -i ${signing.keystoreFilename} | pbcopy
\`\`\`
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
- Full offline support via Progressive Web App technology
- Seamless integration with Android system features

### Technical Notes
- Built using Trusted Web Activity (TWA) via Bubblewrap CLI
- Package ID: ${project.packageId || 'com.example.app'}
- Target domain: ${project.domain || 'example.com'}

### Short Description (80 chars max)
${project.appName || 'App'} - now available as a native Android app with full offline support.

### Full Description
${project.appName || 'This app'} brings the full web experience to your Android device as a native application. Powered by Progressive Web App technology and Trusted Web Activities, it provides a seamless, fast, and reliable experience that works even when you're offline.

Key features:
- Native Android app experience
- Offline support
- Fast loading and smooth performance
- Automatic updates from the web
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
- Ensure JDK 11+ is installed: \`java -version\`
- Ensure Android SDK is available or let Bubblewrap download it
- Try clearing the Bubblewrap cache: \`rm -rf ~/.aspect/aspect-cli\`
- Re-run: \`bubblewrap init --manifest="${project.manifestUrl || 'https://yourdomain.com/manifest.json'}"\`

### 4. Keystore Issues
**Fix:**
- Verify your keystore file exists and is not corrupted
- Confirm the alias matches: \`keytool -list -keystore your.keystore\`
- If password is forgotten, you cannot recover it — generate a new key and update assetlinks

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
- Run Lighthouse PWA audit and ensure passing score

## Step 2: Build the Android Package
\`\`\`bash
# Install/update Bubblewrap
npm install -g @bubblewrap/cli

# Initialize (first time only)
bubblewrap init --manifest="${project.manifestUrl || 'https://yourdomain.com/manifest.json'}"

# Build the AAB
bubblewrap build
\`\`\`

## Step 3: Sign the AAB
The build step will prompt for keystore details:
- Keystore: ${signing.keystoreFilename}
- Alias: ${signing.keyAlias}

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
- Bubblewrap Docs: https://github.com/nickersk/nickersk.github.io/tree/main/nickersk/nickersk.github.io/nickersk/nickersk
- TWA Docs: https://developer.chrome.com/docs/android/trusted-web-activity
- Digital Asset Links Tool: https://developers.google.com/digital-asset-links/tools/generator
`;
};
