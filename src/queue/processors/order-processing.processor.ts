// src/queue/processors/order-processing.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('order-processing')
export class OrderProcessingProcessor {
  private readonly logger = new Logger(OrderProcessingProcessor.name);

  @Process('process-order')
  async handleProcessOrder(job: Job) {
    this.logger.log(`Processing order job ${job.id}`);

    // TODO: implementar lógica de processamento de pedido
    return { processed: true, jobId: job.id };
  }
}