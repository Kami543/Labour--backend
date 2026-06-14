// src/queue/queue.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface PaymentJobData {
  transactionId: string;
  pedidoId: string;
  userId: string;
  valor: number;
  gateway: string;
  paymentDetails: any;
}

export interface NotificationJobData {
  userId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  metadata?: any;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface FraudCheckJobData {
  transactionId: string;
  userId: string;
  deviceFingerprint: string;
  ipAddress: string;
  valor: number;
}

type QueueName = 'payment' | 'notification' | 'email' | 'fraud-check';

@Injectable()
export class QueueService {
  private readonly queues: Record<QueueName, Queue>;

  constructor(
    @InjectQueue('payment') private paymentQueue: Queue,
    @InjectQueue('notification') private notificationQueue: Queue,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('fraud-check') private fraudCheckQueue: Queue,
  ) {
    this.queues = {
      payment: this.paymentQueue,
      notification: this.notificationQueue,
      email: this.emailQueue,
      'fraud-check': this.fraudCheckQueue,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getQueue(queueName: string): Queue {
    const queue = this.queues[queueName as QueueName];
    if (!queue) throw new NotFoundException(`Queue "${queueName}" not found`);
    return queue;
  }

  // ── Produtores ─────────────────────────────────────────────────────────────

  async addPaymentJob(data: PaymentJobData): Promise<string> {
    const jobId = `payment_${data.transactionId}_${Date.now()}`;
    const job = await this.paymentQueue.add('process-payment', data, {
      jobId,
      priority: 1,
      delay: 0,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    });
    return String(job.id);
  }

  async addNotificationJob(data: NotificationJobData): Promise<string> {
    const job = await this.notificationQueue.add('send-notification', data, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 2000 },
    });
    return String(job.id);
  }

  async addEmailJob(data: EmailJobData): Promise<string> {
    const job = await this.emailQueue.add('send-email', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    });
    return String(job.id);
  }

  async addFraudCheckJob(data: FraudCheckJobData): Promise<string> {
    const job = await this.fraudCheckQueue.add('check-fraud', data, {
      priority: 2,
      timeout: 15000,
      attempts: 2,
    });
    return String(job.id);
  }

  // ── Monitoramento ──────────────────────────────────────────────────────────

  async getQueueMetrics(queueName: string) {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  async getAllMetrics(): Promise<Record<QueueName, Awaited<ReturnType<typeof this.getQueueMetrics>>>> {
    const entries = await Promise.all(
      (Object.keys(this.queues) as QueueName[]).map(async (name) => [
        name,
        await this.getQueueMetrics(name),
      ]),
    );
    return Object.fromEntries(entries);
  }

  async getJobStatus(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) return null;

    const [state, progress] = await Promise.all([job.getState(), job.progress()]);

    return {
      id: job.id,
      state,
      progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade,
    };
  }

  async retryFailedJob(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found');

    await job.retry();
    return { success: true, jobId };
  }

  async cleanOldJobs(queueName: string, ageInHours = 24) {
    const queue = this.getQueue(queueName);
    const ageInMs = ageInHours * 60 * 60 * 1000;

    await Promise.all([
      queue.clean(ageInMs, 'completed'),
      queue.clean(ageInMs, 'failed'),
    ]);

    return { success: true, olderThan: new Date(Date.now() - ageInMs) };
  }
}