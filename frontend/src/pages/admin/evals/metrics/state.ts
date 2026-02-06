import { create } from 'zustand';
import type { Metric } from 'src/api/generated-eval';

type MetricsState = {
  // List of metrics for the list page
  metrics: Metric[];

  // Currently selected/viewed metric
  selectedMetric: Metric | null;

  // Total count for pagination
  totalCount: number;
};

type MetricsActions = {
  // Set all metrics (from list fetch)
  setMetrics: (metrics: Metric[], totalCount?: number) => void;

  // Update a single metric in the list
  updateMetricInList: (metric: Metric) => void;

  // Remove a metric from the list
  removeMetricFromList: (id: string) => void;

  // Set the currently selected metric
  setSelectedMetric: (metric: Metric | null) => void;
};

const useMetricsStore_ = create<MetricsState & MetricsActions>()((set) => ({
  metrics: [],
  selectedMetric: null,
  totalCount: 0,

  setMetrics: (metrics: Metric[], totalCount?: number) => {
    return set({ metrics, totalCount: totalCount ?? metrics.length });
  },

  updateMetricInList: (metric: Metric) => {
    return set((state) => {
      const metrics = [...state.metrics];
      const index = metrics.findIndex((m) => m.id === metric.id);
      if (index >= 0) {
        metrics[index] = metric;
      } else {
        metrics.push(metric);
      }
      return { metrics };
    });
  },

  removeMetricFromList: (id: string) => {
    return set((state) => ({
      metrics: state.metrics.filter((m) => m.id !== id),
      totalCount: Math.max(0, state.totalCount - 1),
    }));
  },

  setSelectedMetric: (metric: Metric | null) => {
    return set({ selectedMetric: metric });
  },
}));

/**
 * Zustand store for Metrics state management.
 * Handles metric list, selected metric, and pagination.
 */
export const useMetricsStore = useMetricsStore_;
