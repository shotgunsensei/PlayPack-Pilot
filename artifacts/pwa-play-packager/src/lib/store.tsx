import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ProjectConfig, SigningConfig, ChecklistState, SavedProject, UserProfile, UserPreferences, PlanTier } from './types';
import { PROJECT_PRESETS } from './presets';

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

const defaultPreferences: UserPreferences = {
  shellType: 'bash',
  defaultDocsBranding: false,
  theme: 'dark',
};

function stripPasswords(signing: SigningConfig): SigningConfig {
  const { storePassword, keyPassword, ...safe } = signing;
  return safe;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function createEmptyProject(name: string, preset?: string): SavedProject {
  const now = new Date().toISOString();
  const presetData = preset ? PROJECT_PRESETS.find(p => p.id === preset) : null;
  return {
    id: generateId(),
    name,
    project: { ...defaultProject, appName: name, ...(presetData?.project || {}) },
    signing: { ...defaultSigning },
    checklist: {},
    preset,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

const EXAMPLE_PROJECT: SavedProject = {
  id: 'example-notes-app',
  name: 'PWA Notes App',
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
    sha256Fingerprint: 'AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66',
  },
  checklist: { 'pwa-ready': true, 'assetlinks-published': false },
  archived: false,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-03-20T14:30:00Z',
};

interface AppState {
  user: UserProfile | null;
  projects: SavedProject[];
  activeProjectId: string | null;
  preferences: UserPreferences;
}

interface AppContextType extends AppState {
  project: ProjectConfig;
  signing: SigningConfig;
  checklist: ChecklistState;
  activeProject: SavedProject | null;
  plan: PlanTier;
  isProUser: boolean;
  canCreateProject: boolean;
  updateProject: (updates: Partial<ProjectConfig>) => void;
  updateSigning: (updates: Partial<SigningConfig>) => void;
  updateChecklist: (id: string, checked: boolean) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  createProject: (name: string, preset?: string) => string;
  duplicateProject: (id: string) => string | null;
  deleteProject: (id: string) => void;
  archiveProject: (id: string) => void;
  unarchiveProject: (id: string) => void;
  selectProject: (id: string) => void;
  loadExampleProject: () => void;
  importProject: (data: string) => boolean;
  exportProject: (id: string) => string;
  signIn: (email: string, name: string) => void;
  signOut: () => void;
  signUp: (email: string, name: string) => void;
  upgradePlan: () => void;
}

const STORAGE_KEY = 'playpack_pilot_state';
const STORAGE_VERSION = 2;

function loadPersistedState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { user: null, projects: [], activeProjectId: null, preferences: defaultPreferences };
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || parsed._version !== STORAGE_VERSION) {
      const oldData = localStorage.getItem('pwa_packager_state');
      if (oldData) {
        const old = JSON.parse(oldData);
        if (old?.project?.appName) {
          const migrated = createEmptyProject(old.project.appName || 'Migrated Project');
          migrated.project = { ...defaultProject, ...(old.project || {}) };
          migrated.signing = { ...defaultSigning, ...(old.signing || {}) };
          migrated.checklist = old.checklist || {};
          return { user: null, projects: [migrated], activeProjectId: migrated.id, preferences: defaultPreferences };
        }
      }
      return { user: null, projects: [], activeProjectId: null, preferences: defaultPreferences };
    }
    return {
      user: parsed.user || null,
      projects: (parsed.projects || []).map((p: SavedProject) => ({
        ...p,
        project: { ...defaultProject, ...(p.project || {}) },
        signing: { ...defaultSigning, ...(p.signing || {}) },
        checklist: p.checklist || {},
      })),
      activeProjectId: parsed.activeProjectId || null,
      preferences: { ...defaultPreferences, ...(parsed.preferences || {}) },
    };
  } catch {
    return { user: null, projects: [], activeProjectId: null, preferences: defaultPreferences };
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadPersistedState);

  useEffect(() => {
    const persistable = {
      ...state,
      projects: state.projects.map(p => ({
        ...p,
        signing: stripPasswords(p.signing),
      })),
      _version: STORAGE_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }, [state]);

  const activeProject = state.projects.find(p => p.id === state.activeProjectId) || null;
  const plan = state.user?.plan || 'free';
  const isProUser = plan === 'pro';
  const nonArchivedCount = state.projects.filter(p => !p.archived).length;
  const canCreateProject = isProUser || nonArchivedCount < 1;

  const updateActiveProject = useCallback((updater: (p: SavedProject) => SavedProject) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === prev.activeProjectId ? updater({ ...p, updatedAt: new Date().toISOString() }) : p
      ),
    }));
  }, []);

  const updateProject = useCallback((updates: Partial<ProjectConfig>) => {
    updateActiveProject(p => ({ ...p, project: { ...p.project, ...updates } }));
  }, [updateActiveProject]);

  const updateSigning = useCallback((updates: Partial<SigningConfig>) => {
    updateActiveProject(p => ({ ...p, signing: { ...p.signing, ...updates } }));
  }, [updateActiveProject]);

  const updateChecklist = useCallback((id: string, checked: boolean) => {
    updateActiveProject(p => ({ ...p, checklist: { ...p.checklist, [id]: checked } }));
  }, [updateActiveProject]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setState(prev => ({ ...prev, preferences: { ...prev.preferences, ...updates } }));
  }, []);

  const createProject = useCallback((name: string, preset?: string): string => {
    const newProject = createEmptyProject(name, preset);
    setState(prev => {
      const currentPlan = prev.user?.plan || 'free';
      const activeCount = prev.projects.filter(p => !p.archived).length;
      if (currentPlan !== 'pro' && activeCount >= 1) return prev;
      return {
        ...prev,
        projects: [...prev.projects, newProject],
        activeProjectId: newProject.id,
      };
    });
    return newProject.id;
  }, []);

  const duplicateProject = useCallback((id: string): string | null => {
    let newId: string | null = null;
    setState(prev => {
      const original = prev.projects.find(p => p.id === id);
      if (!original) return prev;
      const currentPlan = prev.user?.plan || 'free';
      const activeCount = prev.projects.filter(p => !p.archived).length;
      if (currentPlan !== 'pro' && activeCount >= 1) return prev;
      const dup: SavedProject = {
        ...original,
        id: generateId(),
        name: `${original.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archived: false,
      };
      newId = dup.id;
      return {
        ...prev,
        projects: [...prev.projects, dup],
        activeProjectId: dup.id,
      };
    });
    return newId;
  }, []);

  const deleteProject = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
      activeProjectId: prev.activeProjectId === id ? null : prev.activeProjectId,
    }));
  }, []);

  const archiveProject = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, archived: true, updatedAt: new Date().toISOString() } : p),
      activeProjectId: prev.activeProjectId === id ? null : prev.activeProjectId,
    }));
  }, []);

  const unarchiveProject = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, archived: false, updatedAt: new Date().toISOString() } : p),
    }));
  }, []);

  const selectProject = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeProjectId: id }));
  }, []);

  const loadExampleProject = useCallback(() => {
    const exists = state.projects.find(p => p.id === EXAMPLE_PROJECT.id);
    if (exists) {
      setState(prev => ({ ...prev, activeProjectId: EXAMPLE_PROJECT.id }));
    } else {
      setState(prev => ({
        ...prev,
        projects: [...prev.projects, { ...EXAMPLE_PROJECT }],
        activeProjectId: EXAMPLE_PROJECT.id,
      }));
    }
  }, [state.projects]);

  const importProject = useCallback((data: string): boolean => {
    try {
      const parsed = JSON.parse(data);
      if (!parsed.project) return false;
      const imported = createEmptyProject(parsed.project?.appName || 'Imported Project');
      imported.project = { ...defaultProject, ...(parsed.project || {}) };
      imported.signing = { ...defaultSigning, ...(parsed.signing || {}) };
      imported.checklist = parsed.checklist || {};
      let success = false;
      setState(prev => {
        const currentPlan = prev.user?.plan || 'free';
        const activeCount = prev.projects.filter(p => !p.archived).length;
        if (currentPlan !== 'pro' && activeCount >= 1) return prev;
        success = true;
        return {
          ...prev,
          projects: [...prev.projects, imported],
          activeProjectId: imported.id,
        };
      });
      return success;
    } catch {
      return false;
    }
  }, []);

  const exportProject = useCallback((id: string): string => {
    const p = state.projects.find(proj => proj.id === id);
    if (!p) return '{}';
    return JSON.stringify({
      project: p.project,
      signing: stripPasswords(p.signing),
      checklist: p.checklist,
      exportedAt: new Date().toISOString(),
      exportedFrom: 'PlayPack Pilot',
    }, null, 2);
  }, [state.projects]);

  const signIn = useCallback((email: string, name: string) => {
    setState(prev => ({
      ...prev,
      user: {
        id: generateId(),
        email,
        displayName: name,
        plan: 'free',
        createdAt: new Date().toISOString(),
      },
    }));
  }, []);

  const signUp = useCallback((email: string, name: string) => {
    signIn(email, name);
  }, [signIn]);

  const signOut = useCallback(() => {
    setState(prev => ({ ...prev, user: null }));
  }, []);

  const upgradePlan = useCallback(() => {
    setState(prev => prev.user ? {
      ...prev,
      user: { ...prev.user, plan: 'pro' as PlanTier },
    } : prev);
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      project: activeProject?.project || defaultProject,
      signing: activeProject?.signing || defaultSigning,
      checklist: activeProject?.checklist || {},
      activeProject,
      plan,
      isProUser,
      canCreateProject,
      updateProject,
      updateSigning,
      updateChecklist,
      updatePreferences,
      createProject,
      duplicateProject,
      deleteProject,
      archiveProject,
      unarchiveProject,
      selectProject,
      loadExampleProject,
      importProject,
      exportProject,
      signIn,
      signOut,
      signUp,
      upgradePlan,
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
