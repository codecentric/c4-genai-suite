import { Module, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseExporter } from 'langfuse-vercel';

@Module({})
export class OpenTelemetryModule implements OnApplicationBootstrap, OnApplicationShutdown {
  private sdk!: NodeSDK;

  onApplicationBootstrap() {
    this.sdk = new NodeSDK({
      traceExporter: new LangfuseExporter(),
      instrumentations: [getNodeAutoInstrumentations()],
    });
    this.sdk.start();
  }

  async onApplicationShutdown(_signal?: string) {
    if (this.sdk) {
      await this.sdk.shutdown();
    }
  }
}
