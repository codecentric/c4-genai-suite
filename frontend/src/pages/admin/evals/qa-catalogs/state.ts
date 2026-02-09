import { create } from 'zustand';
import type { NewQAPair, QAPair } from 'src/api/generated-eval';

/**
 * Represents a pending change to a Q&A pair
 */
export type PendingChange =
  | { type: 'addition'; tempId: string; data: NewQAPair }
  | { type: 'update'; id: string; data: QAPair; original: QAPair }
  | { type: 'deletion'; id: string; original: QAPair };

type QaCatalogsState = {
  // Pending changes that haven't been saved yet (client-only state)
  pendingChanges: PendingChange[];
};

type QaCatalogsActions = {
  // Add a pending change (addition, update, or deletion)
  addPendingChange: (change: PendingChange) => void;

  // Remove a pending change by its id/tempId
  removePendingChange: (id: string) => void;

  // Clear all pending changes
  clearPendingChanges: () => void;

  // Get the effective Q&A pairs list (original + pending changes applied)
  getEffectiveQaPairs: (qaPairs: QAPair[]) => QAPair[];

  // Check if there are any pending changes
  hasPendingChanges: () => boolean;

  // Get counts for each type of pending change
  getPendingChangeCounts: () => { additions: number; updates: number; deletions: number };
};

const useQaCatalogsStore_ = create<QaCatalogsState & QaCatalogsActions>()((set, get) => ({
  pendingChanges: [],

  addPendingChange: (change: PendingChange) => {
    return set((state) => {
      const pendingChanges = [...state.pendingChanges];

      if (change.type === 'addition') {
        // For additions, just add to the list
        pendingChanges.push(change);
      } else if (change.type === 'update') {
        // For updates, check if there's already a pending change for this id
        const existingIndex = pendingChanges.findIndex(
          (c) => (c.type === 'update' && c.id === change.id) || (c.type === 'deletion' && c.id === change.id),
        );

        if (existingIndex >= 0) {
          const existing = pendingChanges[existingIndex];
          if (existing.type === 'update') {
            // Replace the update with the new one, keeping the original
            pendingChanges[existingIndex] = {
              ...change,
              original: existing.original,
            };
          }
          // If it was marked for deletion, don't allow updating
        } else {
          pendingChanges.push(change);
        }
      } else if (change.type === 'deletion') {
        // For deletions, check if it was a pending addition
        const additionIndex = pendingChanges.findIndex((c) => c.type === 'addition' && c.tempId === change.id);

        if (additionIndex >= 0) {
          // Just remove the pending addition
          pendingChanges.splice(additionIndex, 1);
        } else {
          // Check if there's an update pending
          const updateIndex = pendingChanges.findIndex((c) => c.type === 'update' && c.id === change.id);

          if (updateIndex >= 0) {
            // Replace the update with a deletion, using the original data
            const existingUpdate = pendingChanges[updateIndex] as { type: 'update'; original: QAPair };
            pendingChanges[updateIndex] = {
              type: 'deletion',
              id: change.id,
              original: existingUpdate.original,
            };
          } else {
            // Check if already marked for deletion
            const deletionIndex = pendingChanges.findIndex((c) => c.type === 'deletion' && c.id === change.id);
            if (deletionIndex < 0) {
              pendingChanges.push(change);
            }
          }
        }
      }

      return { pendingChanges };
    });
  },

  removePendingChange: (id: string) => {
    return set((state) => ({
      pendingChanges: state.pendingChanges.filter((c) => {
        if (c.type === 'addition') return c.tempId !== id;
        return c.id !== id;
      }),
    }));
  },

  clearPendingChanges: () => {
    return set({ pendingChanges: [] });
  },

  getEffectiveQaPairs: (qaPairs: QAPair[]) => {
    const { pendingChanges } = get();

    // Start with original pairs
    const effectivePairs: (QAPair & { _pendingStatus?: 'added' | 'updated' | 'deleted' })[] = qaPairs.map((pair) => ({
      ...pair,
    }));

    // Apply pending changes
    for (const change of pendingChanges) {
      if (change.type === 'addition') {
        // Add new pair with temp id
        effectivePairs.push({
          id: change.tempId,
          ...change.data,
          metaData: {},
          _pendingStatus: 'added',
        });
      } else if (change.type === 'update') {
        // Update existing pair
        const index = effectivePairs.findIndex((p) => p.id === change.id);
        if (index >= 0) {
          effectivePairs[index] = { ...change.data, _pendingStatus: 'updated' };
        }
      } else if (change.type === 'deletion') {
        // Mark as deleted (we keep it in the list with a flag)
        const index = effectivePairs.findIndex((p) => p.id === change.id);
        if (index >= 0) {
          effectivePairs[index] = { ...effectivePairs[index], _pendingStatus: 'deleted' };
        }
      }
    }

    return effectivePairs;
  },

  hasPendingChanges: () => {
    return get().pendingChanges.length > 0;
  },

  getPendingChangeCounts: () => {
    const { pendingChanges } = get();
    return {
      additions: pendingChanges.filter((c) => c.type === 'addition').length,
      updates: pendingChanges.filter((c) => c.type === 'update').length,
      deletions: pendingChanges.filter((c) => c.type === 'deletion').length,
    };
  },
}));

/**
 * Zustand store for QA Catalogs pending changes state management.
 * Only handles client-side pending changes - server data comes from React Query.
 */
export const useQaCatalogsStore = useQaCatalogsStore_;
