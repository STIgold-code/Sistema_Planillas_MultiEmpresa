import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('Email transporter initialized');
    } else {
      this.logger.warn(
        'Email transporter not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env',
      );
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email not sent: transporter not configured');
      return false;
    }

    try {
      const from =
        this.configService.get<string>('SMTP_FROM') ||
        'noreply@sistema-rrhh.com';

      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      });

      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  async sendBoletaEmail(
    to: string,
    empleadoNombre: string,
    mes: string,
    anio: number,
    pdfBuffer: Buffer,
  ): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Boleta de Pago</h2>
        <p>Estimado(a) <strong>${empleadoNombre}</strong>,</p>
        <p>Adjunto encontrará su boleta de pago correspondiente al período <strong>${mes} ${anio}</strong>.</p>
        <p>Si tiene alguna consulta, por favor comuníquese con el área de Recursos Humanos.</p>
        <br>
        <p style="color: #666; font-size: 12px;">
          Este es un correo automático, por favor no responda a este mensaje.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Boleta de Pago - ${mes} ${anio}`,
      html,
      attachments: [
        {
          filename: `Boleta_${mes}_${anio}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }
}
