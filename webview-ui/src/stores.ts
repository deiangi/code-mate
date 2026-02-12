import { writable, derived } from 'svelte/store';
import type { Settings, PostProcessor, PostProcessorProfile } from './types';

// Settings store
export const settings = writable<Settings>({
  ollamaUrl: 'http://localhost:11434',
  model: '',
  temperature: 0.7,
  autoComplete: true,
  contextSize: 4096
});

// Available models
export const models = writable<string[]>([]);

// All post-processors (global pool)
export const processors = writable<PostProcessor[]>([]);

// All profiles
export const profiles = writable<PostProcessorProfile[]>([]);

// Currently selected profile ID
export const selectedProfileId = writable<string | null>(null);

// Derived store: currently selected profile
export const selectedProfile = derived(
  [profiles, selectedProfileId],
  ([$profiles, $selectedProfileId]) => {
    return $profiles.find(p => p.id === $selectedProfileId) || null;
  }
);

// Derived store: processors in selected profile (in order)
export const profileProcessors = derived(
  [selectedProfile, processors],
  ([$selectedProfile, $processors]) => {
    if (!$selectedProfile) return [];
    return $selectedProfile.postProcessorIds
      .map(id => $processors.find(p => p.id === id))
      .filter((p): p is PostProcessor => p !== undefined);
  }
);

// Derived store: available processors (not in selected profile)
export const availableProcessors = derived(
  [selectedProfile, processors],
  ([$selectedProfile, $processors]) => {
    if (!$selectedProfile) return $processors;
    const usedIds = new Set($selectedProfile.postProcessorIds);
    return $processors.filter(p => !usedIds.has(p.id));
  }
);

// Loading states
export const loadingModels = writable(false);
export const savingSettings = writable(false);
export const creatingProcessor = writable(false);
export const creatingProfile = writable(false);

// Status message
export const status = writable<{ message: string; type: 'success' | 'error' | '' }>({
  message: '',
  type: ''
});

// Active tab
export const activeTab = writable<'settings' | 'processors'>('settings');
