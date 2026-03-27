import { PresetTemplate } from './types';

export const PROJECT_PRESETS: PresetTemplate[] = [
  {
    id: 'generic',
    name: 'Generic App',
    description: 'A standard PWA with sensible defaults for any application type.',
    icon: '📱',
    project: {
      displayMode: 'standalone',
      orientation: 'any',
      themeColor: '#2563eb',
      backgroundColor: '#ffffff',
    },
  },
  {
    id: 'saas',
    name: 'SaaS Tool',
    description: 'Optimized for web-based software tools and dashboards.',
    icon: '🛠️',
    project: {
      displayMode: 'standalone',
      orientation: 'any',
      themeColor: '#0f172a',
      backgroundColor: '#f8fafc',
    },
  },
  {
    id: 'content',
    name: 'Content App',
    description: 'Ideal for blogs, news readers, and content-driven apps.',
    icon: '📰',
    project: {
      displayMode: 'standalone',
      orientation: 'portrait',
      themeColor: '#1e293b',
      backgroundColor: '#ffffff',
    },
  },
  {
    id: 'utility',
    name: 'Utility App',
    description: 'Lightweight tools like calculators, converters, or trackers.',
    icon: '⚡',
    project: {
      displayMode: 'standalone',
      orientation: 'any',
      themeColor: '#059669',
      backgroundColor: '#f0fdf4',
    },
  },
];
