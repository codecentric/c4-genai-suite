import {
  Configuration,
  DashboardApi,
  EvaluationResultsApi,
  EvaluationsApi,
  LlmEndpointsApi,
  MetricsApi,
  Middleware,
  QaCatalogApi,
} from 'src/api/generated-eval';
import { useTransientNavigate } from 'src/hooks';
import { useEvalClientStore } from './zustand/evalClientStore';

export function useEvalApi() {
  const navigate = useTransientNavigate();
  return useEvalClientStore((state) => state.getEvalClient(navigate));
}

export class EvalClient {
  public readonly dashboard: DashboardApi;
  public readonly evaluationResults: EvaluationResultsApi;
  public readonly evaluations: EvaluationsApi;
  public readonly llmEndpoints: LlmEndpointsApi;
  public readonly metrics: MetricsApi;
  public readonly qaCatalog: QaCatalogApi;

  public get url() {
    return this.configuration.basePath;
  }

  constructor(
    readonly configuration: Configuration,
    middleware: Middleware,
  ) {
    this.dashboard = new DashboardApi(configuration).withMiddleware(middleware);
    this.evaluationResults = new EvaluationResultsApi(configuration).withMiddleware(middleware);
    this.evaluations = new EvaluationsApi(configuration).withMiddleware(middleware);
    this.llmEndpoints = new LlmEndpointsApi(configuration).withMiddleware(middleware);
    this.metrics = new MetricsApi(configuration).withMiddleware(middleware);
    this.qaCatalog = new QaCatalogApi(configuration).withMiddleware(middleware);
  }
}
