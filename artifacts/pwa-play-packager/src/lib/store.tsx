import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProjectConfig, SigningConfig, ChecklistState } from './types';

interface AppState {
  project: ProjectConfig;
  signing: SigningConfig;
  checklist: ChecklistState;
}

interface AppContextType extends AppState {
  updateProject: (updates: Partial<ProjectConfig>) => void;
  updateSigning: (updates: Partial<SigningConfig>) => void;
  updateChecklist: (id: string, checked: boolean) => void;
  resetProject: () => void;
  loadExample: () => void;
}

const defaultProject: ProjectConfig = {
  appName: '',
  shortName: '',
  domain: '',
  baseUrl: '/',
  manifestUrl: '',
  startUrl: '/',
  packageId: '',
  themeColor: '#000000',
  backgroundColor: '#ffffff',
  orientation: 'any',
  displayMode: 'standalone',
  launcherIconUrl: '',
  monochromeIconUrl: '',
  versionCode: 1,
  versionName: '1.0.0',
};

const defaultSigning: SigningConfig = {
  keystoreFilename: 'android.keystore',
  keyAlias: 'android',
  sha256Fingerprint: '',
};

function stripPasswords(signing: SigningConfig): SigningConfig {
  const { storePassword, keyPassword, ...safe } = signing;
  return safe;
}

const defaultChecklist: ChecklistState = {};

const defaultState: AppState = {
  project: defaultProject,
  signing: defaultSigning,
  checklist: defaultChecklist,
};

const exampleState: AppState = {
  project: {
    appName: 'PWA Notes App',
    shortName: 'Notes',
    domain: 'notes.example.com',
    baseUrl: '/',
    manifestUrl: 'https://notes.example.com/manifest.json',
    startUrl: '/',
    packageId: 'com.example.notes',
    themeColor: '#3b82f6',
    backgroundColor: '#ffffff',
    orientation: 'portrait',
    displayMode: 'standalone',
    launcherIconUrl: 'https://notes.example.com/icons/icon-512x512.png',
    monochromeIconUrl: 'https://notes.example.com/icons/icon-mono.png',
    versionCode: 2,
    versionName: '1.0.1',
  },
  signing: {
    keystoreFilename: 'notes-release.keystore',
    keyAlias: 'notes',
    storePassword: 'example_password_do_not_use',
    keyPassword: 'example_password_do_not_use',
    sha256Fingerprint: 'AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66',
  },
  checklist: {
    'pwa-ready': true,
    'assetlinks-published': false,
  },
};

const STORAGE_VERSION = 1;

function loadState(): AppState {
  try {
    const stored = localStorage.getItem('pwa_packager_state');
    if (!stored) return defaultState;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return defaultState;
    if (parsed._version !== STORAGE_VERSION) {
      localStorage.removeItem('pwa_packager_state');
      return defaultState;
    }
    return {
      project: { ...defaultProject, ...(parsed.project || {}) },
      signing: { ...defaultSigning, ...(parsed.signing || {}) },
      checklist: parsed.checklist || defaultChecklist,
    };
  } catch (e) {
    console.warn('Failed to parse stored state, resetting', e);
    localStorage.removeItem('pwa_packager_state');
    return defaultState;
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    const persistable = {
      ...state,
      signing: stripPasswords(state.signing),
      _version: STORAGE_VERSION,
    };
    localStorage.setItem('pwa_packager_state', JSON.stringify(persistable));
  }, [state]);

  const updateProject = (updates: Partial<ProjectConfig>) => {
    setState(prev => ({ ...prev, project: { ...prev.project, ...updates } }));
  };

  const updateSigning = (updates: Partial<SigningConfig>) => {
    setState(prev => ({ ...prev, signing: { ...prev.signing, ...updates } }));
  };

  const updateChecklist = (id: string, checked: boolean) => {
    setState(prev => ({
      ...prev,
      checklist: { ...prev.checklist, [id]: checked }
    }));
  };

  const resetProject = () => {
    if (window.confirm("Are you sure you want to reset all data? This cannot be undone.")) {
      setState(defaultState);
    }
  };

  const loadExample = () => {
    if (window.confirm("Replace current configuration with example data?")) {
      setState(exampleState);
    }
  };

  return (
    <AppContext.Provider value={{
      ...state,
      updateProject,
      updateSigning,
      updateChecklist,
      resetProject,
      loadExample
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
