import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import nodemailer from 'nodemailer';
import { mailConfig } from 'src/core/config/app.config';

type LoginCodeTemplateData = {
  code: string;
  email: string;
  expiresIn: string;
};

@Injectable()
export class MailService {
  constructor(
    @Inject(mailConfig.KEY)
    private readonly mailConf: ConfigType<typeof mailConfig>,
  ) {}

  async sendLoginCode(email: string, code: string, expiresIn: string) {
    this.ensureConfigured();

    const transporter = nodemailer.createTransport({
      host: this.mailConf.host,
      port: this.mailConf.port,
      secure: this.mailConf.secure,
      auth:
        this.mailConf.user && this.mailConf.pass
          ? {
              user: this.mailConf.user,
              pass: this.mailConf.pass,
            }
          : undefined,
    });

    await transporter.sendMail({
      from: this.mailConf.from,
      to: email,
      subject: 'Your Hippimo login code',
      text: `Your Hippimo login code is ${code}. It expires in ${expiresIn}.`,
      html: await this.renderLoginCodeHtml({ code, email, expiresIn }),
    });
  }

  private ensureConfigured() {
    if (!this.mailConf.host || !this.mailConf.from) {
      throw new InternalServerErrorException('Mail configuration is missing');
    }
  }

  private async renderLoginCodeHtml(data: LoginCodeTemplateData) {
    const template = await this.getLoginCodeTemplate();

    return template
      .replaceAll('{{code}}', this.escapeHtml(data.code))
      .replaceAll('{{email}}', this.escapeHtml(data.email))
      .replaceAll('{{expiresIn}}', this.escapeHtml(data.expiresIn));
  }

  private async getLoginCodeTemplate() {
    if (this.mailConf.loginCodeTemplateHtml) {
      return this.mailConf.loginCodeTemplateHtml;
    }

    if (this.mailConf.loginCodeTemplatePath) {
      const templatePath = path.isAbsolute(this.mailConf.loginCodeTemplatePath)
        ? this.mailConf.loginCodeTemplatePath
        : path.join(process.cwd(), this.mailConf.loginCodeTemplatePath);

      return fs.readFile(templatePath, 'utf8');
    }

    return `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h1 style="font-size: 20px; margin: 0 0 16px;">Hippimo login code</h1>
        <p style="margin: 0 0 12px;">Use this code to finish signing in to {{email}}.</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 0 0 12px;">{{code}}</p>
        <p style="margin: 0;">This code expires in {{expiresIn}}.</p>
      </div>
    `;
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
