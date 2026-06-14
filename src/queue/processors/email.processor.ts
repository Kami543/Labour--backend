// src/queue/processors/email.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('email')
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  @Process('send-email')
  async handleSendEmail(job: Job) {
    this.logger.log(`Processing email job ${job.id}`);
    const { to, subject, template, data } = job.data;

    // TODO: integrar com MailService / Nodemailer / SES
    this.logger.log(`Email para ${to} | assunto: ${subject} | template: ${template}`);

    return { sent: true, to };
  }
}