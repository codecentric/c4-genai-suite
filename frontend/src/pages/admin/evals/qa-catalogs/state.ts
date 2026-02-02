import { create } from 'zustand';
import type { QACatalog, QACatalogPreview, QAPair, NewQAPair } from 'src/api/generated-eval';

/**
 * Represents a pending change to a Q&A pair
 */
export type PendingChange =
  | { type: 'addition'; tempId: string; data: NewQAPair }
  | { type: 'update'; id: string; data: QAPair; original: QAPair }
  | { type: 'deletion'; id: string; original: QAPair };

type QaCatalogsState = {
  // List of catalog previews for the list page
  catalogs: QACatalogPreview[];

  // Currently selected/viewed catalog
  selectedCatalog: QACatalog | null;

  // Q&A pairs for the currently selected catalog
  qaPairs: QAPair[];

  // Pending changes that haven't been saved yet
  pendingChanges: PendingChange[];

  // Total count for pagination
  totalCount: number;
};

type QaCatalogsActions = {
  // Set all catalogs (from list fetch)
  setCatalogs: (catalogs: QACatalogPreview[], totalCount?: number) => void;

  // Update a single catalog in the list
  updateCatalogInList: (catalog: QACatalogPreview) => void;

  // Remove a catalog from the list
  removeCatalogFromList: (id: string) => void;

  // Set the currently selected catalog
  setSelectedCatalog: (catalog: QACatalog | null) => void;

  // Set Q&A pairs for the current catalog
  setQaPairs: (pairs: QAPair[]) => void;

  // Add a pending change (addition, update, or deletion)
  addPendingChange: (change: PendingChange) => void;

  // Remove a pending change by its id/tempId
  removePendingChange: (id: string) => void;

  // Clear all pending changes
  clearPendingChanges: () => void;

  // Get the effective Q&A pairs list (original + pending changes applied)
  getEffectiveQaPairs: () => QAPair[];

  // Check if there are any pending changes
  hasPendingChanges: () => boolean;

  // Get counts for each type of pending change
  getPendingChangeCounts: () => { additions: number; updates: number; deletions: number };
};

const useQaCatalogsStore_ = create<QaCatalogsState & QaCatalogsActions>()((set, get) => ({
  catalogs: [],
  selectedCatalog: null,
  qaPairs: [],
  pendingChanges: [],
  totalCount: 0,

  setCatalogs: (catalogs: QACatalogPreview[], totalCount?: number) => {
    return set({ catalogs, totalCount: totalCount ?? catalogs.length });
  },

  updateCatalogInList: (catalog: QACatalogPreview) => {
    return set((state) => {
      const catalogs = [...state.catalogs];
      const index = catalogs.findIndex((c) => c.id === catalog.id);
      if (index >= 0) {
        catalogs[index] = catalog;
      } else {
        catalogs.push(catalog);
      }
      return { catalogs };
    });
  },

  removeCatalogFromList: (id: string) => {
    return set((state) => ({
      catalogs: state.catalogs.filter((c) => c.id !== id),
      totalCount: Math.max(0, state.totalCount - 1),
    }));
  },

  setSelectedCatalog: (catalog: QACatalog | null) => {
    return set({ selectedCatalog: catalog, pendingChanges: [] });
  },

  setQaPairs: (pairs: QAPair[]) => {
    return set({ qaPairs: pairs });
  },

  addPendingChange: (change: PendingChange) => {
    return set((state) => {
      const pendingChanges = [...state.pendingChanges];

      if (change.type === 'addition') {
        // For additions, just add to the list
        pendingChanges.push(change);
      } else if (change.type === 'update') {
        // For updates, check if there's already a pending change for this id
        const existingIndex = pendingChanges.findIndex(
          (c) => (c.type === 'update' && c.id === change.id) || (c.type === 'deletion' && c.id === change.id)
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
        const additionIndex = pendingChanges.findIndex(
          (c) => c.type === 'addition' && c.tempId === change.id
        );

        if (additionIndex >= 0) {
          // Just remove the pending addition
          pendingChanges.splice(additionIndex, 1);
        } else {
          // Check if there's an update pending
          const updateIndex = pendingChanges.findIndex(
            (c) => c.type === 'update' && c.id === change.id
          );

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
            const deletionIndex = pendingChanges.findIndex(
              (c) => c.type === 'deletion' && c.id === change.id
            );
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

  getEffectiveQaPairs: () => {
    const { qaPairs, pendingChanges } = get();

    // Start with original pairs
    let effectivePairs: (QAPair & { _pendingStatus?: 'added' | 'updated' | 'deleted' })[] = qaPairs.map(
      (pair) => ({ ...pair })
    );

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
 * Zustand store for QA Catalogs state management.
 * Handles catalog list, selected catalog, Q&A pairs, and pending changes.
 */
export const useQaCatalogsStore = useQaCatalogsStore_;
