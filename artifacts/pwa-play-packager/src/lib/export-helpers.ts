import JSZip from 'jszip';
import { ProjectConfig, SigningConfig } from './types';
import { generateAssetLinks, generateGithubWorkflow, generateReadme, generateReleaseChecklist, generateSigningNotes, generateManifest, generateReleaseNotes, generateTroubleshooting, generateDeploymentSop } from './generators';

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};

export const downloadFile = (filename: string, content: string, contentType: string = 'text/plain') => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadCompleteZip = async (project: ProjectConfig, signing: SigningConfig) => {
  const zip = new JSZip();

  const safeSigning = { keystoreFilename: signing.keystoreFilename, keyAlias: signing.keyAlias, sha256Fingerprint: signing.sha256Fingerprint };
  zip.file('manifest.json', generateManifest(project));
  zip.file('assetlinks.json', generateAssetLinks(project.packageId, signing.sha256Fingerprint));
  zip.file('pwa-packager-config.json', JSON.stringify({ project, signing: safeSigning }, null, 2));

  const workflows = zip.folder('.github/workflows');
  workflows?.file('android-build.yml', generateGithubWorkflow(project));

  const docs = zip.folder('docs');
  docs?.file('README.md', generateReadme(project));
  docs?.file('release-checklist.md', generateReleaseChecklist());
  docs?.file('signing-notes.md', generateSigningNotes(signing));
  docs?.file('release-notes.md', generateReleaseNotes(project));
  docs?.file('troubleshooting.md', generateTroubleshooting(project));
  docs?.file('deployment-sop.md', generateDeploymentSop(project, signing));

  const content = await zip.generateAsync({ type: 'blob' });
  
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.packageId || 'pwa-app'}-play-package.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
