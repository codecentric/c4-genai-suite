import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useUpdateLastSelectedAssistant } from './listOfAssistants';

// Mock the hooks with simple implementations
vi.mock('./chat', () => ({
  useStateOfChat: () => ({ id: 123, configurationId: 1, createdAt: new Date() }),
}));

vi.mock('../../../hooks/stored', () => ({
  usePersistentState: () => [null, vi.fn()],
}));

describe('Assistant State Management', () => {
  describe('useUpdateLastSelectedAssistant', () => {
    it('returns function to update persistent state', () => {
      const { result } = renderHook(() => useUpdateLastSelectedAssistant());

      expect(typeof result.current).toBe('function');

      // Test the function
      act(() => {
        result.current(2);
      });

      // The function should be callable without errors
      expect(result.current).toBeDefined();
    });
  });
});
