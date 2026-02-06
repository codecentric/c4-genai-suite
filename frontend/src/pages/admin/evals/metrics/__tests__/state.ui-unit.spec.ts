import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Metric } from 'src/api/generated-eval';
import { useMetricsStore } from '../state';

const createMockMetric = (id: string, name: string): Metric => ({
  id,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  version: 1,
  _configuration: {
    type: 'ANSWER_RELEVANCY',
    name,
    threshold: 0.7,
    includeReason: true,
    chatModelId: 'chat-1',
    strictMode: false,
    evaluationSteps: [],
    evaluationParams: [],
  },
});

describe('useMetricsStore', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useMetricsStore());

    expect(result.current.metrics).toEqual([]);
    expect(result.current.selectedMetric).toBeNull();
    expect(result.current.totalCount).toBe(0);
  });

  it('should set metrics and total count', () => {
    const { result } = renderHook(() => useMetricsStore());

    const metrics = [
      createMockMetric('1', 'Metric 1'),
      createMockMetric('2', 'Metric 2'),
    ];

    act(() => {
      result.current.setMetrics(metrics, 10);
    });

    expect(result.current.metrics).toEqual(metrics);
    expect(result.current.totalCount).toBe(10);
  });

  it('should set metrics without explicit total count', () => {
    const { result } = renderHook(() => useMetricsStore());

    const metrics = [
      createMockMetric('1', 'Metric 1'),
      createMockMetric('2', 'Metric 2'),
    ];

    act(() => {
      result.current.setMetrics(metrics);
    });

    expect(result.current.metrics).toEqual(metrics);
    expect(result.current.totalCount).toBe(2); // Should default to array length
  });

  it('should update metric in list', () => {
    const { result } = renderHook(() => useMetricsStore());

    const metrics = [
      createMockMetric('1', 'Metric 1'),
      createMockMetric('2', 'Metric 2'),
    ];

    act(() => {
      result.current.setMetrics(metrics);
    });

    const updatedMetric = createMockMetric('1', 'Updated Metric 1');

    act(() => {
      result.current.updateMetricInList(updatedMetric);
    });

    expect(result.current.metrics[0]._configuration.name).toBe('Updated Metric 1');
    expect(result.current.metrics[1]._configuration.name).toBe('Metric 2');
  });

  it('should add metric if not found in list', () => {
    const { result } = renderHook(() => useMetricsStore());

    const metrics = [
      createMockMetric('1', 'Metric 1'),
      createMockMetric('2', 'Metric 2'),
    ];

    act(() => {
      result.current.setMetrics(metrics);
    });

    const newMetric = createMockMetric('999', 'New Metric');

    act(() => {
      result.current.updateMetricInList(newMetric);
    });

    // Metric should be added to the list
    expect(result.current.metrics).toHaveLength(3);
    expect(result.current.metrics[2].id).toBe('999');
    expect(result.current.metrics[2]._configuration.name).toBe('New Metric');
  });

  it('should remove metric from list', () => {
    const { result } = renderHook(() => useMetricsStore());

    const metrics = [
      createMockMetric('1', 'Metric 1'),
      createMockMetric('2', 'Metric 2'),
      createMockMetric('3', 'Metric 3'),
    ];

    act(() => {
      result.current.setMetrics(metrics);
    });

    act(() => {
      result.current.removeMetricFromList('2');
    });

    expect(result.current.metrics).toHaveLength(2);
    expect(result.current.metrics.find((m) => m.id === '2')).toBeUndefined();
    expect(result.current.metrics.find((m) => m.id === '1')).toBeDefined();
    expect(result.current.metrics.find((m) => m.id === '3')).toBeDefined();
  });

  it('should not change list if removing non-existent metric', () => {
    const { result } = renderHook(() => useMetricsStore());

    const metrics = [
      createMockMetric('1', 'Metric 1'),
      createMockMetric('2', 'Metric 2'),
    ];

    act(() => {
      result.current.setMetrics(metrics);
    });

    act(() => {
      result.current.removeMetricFromList('999');
    });

    expect(result.current.metrics).toEqual(metrics);
  });

  it('should set selected metric', () => {
    const { result } = renderHook(() => useMetricsStore());

    const metric = createMockMetric('1', 'Metric 1');

    act(() => {
      result.current.setSelectedMetric(metric);
    });

    expect(result.current.selectedMetric).toEqual(metric);
  });

  it('should clear selected metric', () => {
    const { result } = renderHook(() => useMetricsStore());

    const metric = createMockMetric('1', 'Metric 1');

    act(() => {
      result.current.setSelectedMetric(metric);
    });

    expect(result.current.selectedMetric).toEqual(metric);

    act(() => {
      result.current.setSelectedMetric(null);
    });

    expect(result.current.selectedMetric).toBeNull();
  });

  it('should handle multiple operations in sequence', () => {
    const { result } = renderHook(() => useMetricsStore());

    // Set initial metrics
    const metrics = [
      createMockMetric('1', 'Metric 1'),
      createMockMetric('2', 'Metric 2'),
      createMockMetric('3', 'Metric 3'),
    ];

    act(() => {
      result.current.setMetrics(metrics, 3);
    });

    expect(result.current.metrics).toHaveLength(3);
    expect(result.current.totalCount).toBe(3);

    // Update a metric
    const updatedMetric = createMockMetric('2', 'Updated Metric 2');
    act(() => {
      result.current.updateMetricInList(updatedMetric);
    });

    expect(result.current.metrics[1]._configuration.name).toBe('Updated Metric 2');

    // Remove a metric
    act(() => {
      result.current.removeMetricFromList('3');
    });

    expect(result.current.metrics).toHaveLength(2);

    // Set selected metric
    act(() => {
      result.current.setSelectedMetric(metrics[0]);
    });

    expect(result.current.selectedMetric?.id).toBe('1');
  });
});
