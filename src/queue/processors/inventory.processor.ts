// src/queue/processors/inventory.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('inventory')
export class InventoryProcessor {
  private readonly logger = new Logger(InventoryProcessor.name);

  @Process('update-inventory')
  async handleUpdateInventory(job: Job) {
    this.logger.log(`Processing inventory job ${job.id}`);

    // TODO: implementar lógica de atualização de estoque
    return { updated: true, jobId: job.id };
  }
}