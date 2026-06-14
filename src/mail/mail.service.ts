// src/mail/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendMail(to: string, subject: string, template: string, data: Record<string, any>) {
    // TODO: integrar com Nodemailer, SES, Resend, etc.
    this.logger.log(`[STUB] Enviando email para ${to} | assunto: ${subject}`);
    return { sent: true, to };
  }
}