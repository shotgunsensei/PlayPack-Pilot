import JSZip from 'jszip';
import { ProjectConfig, SigningConfig } from './types';
import { generateReleaseKitFiles } from './generators';

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

  for (const [filename, content] of Object.entries(generateReleaseKitFiles(project, signing))) {
    zip.file(filename, content);
  }

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
