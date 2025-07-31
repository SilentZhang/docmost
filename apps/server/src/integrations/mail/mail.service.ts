import { Inject, Injectable } from '@nestjs/common';
import { MAIL_DRIVER_TOKEN } from './mail.constants';
import { MailDriver } from './drivers/interfaces/mail-driver.interface';
import { MailMessage } from './interfaces/mail.message';
import { EnvironmentService } from '../environment/environment.service';
import { render } from '@react-email/render';

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_DRIVER_TOKEN) private mailDriver: MailDriver,
    private readonly environmentService: EnvironmentService,
  ) {}

  async sendEmail(message: MailMessage): Promise<void> {
    if (message.template) {
      message.html = await render(message.template, {
        pretty: true,
      });
      message.text = await render(message.template, { plainText: true });
    }

    let from = this.environmentService.getMailFromAddress();
    if (message.from) {
      from = message.from;
    }

    const sender = `${this.environmentService.getMailFromName()} <${from}> `;
    await this.mailDriver.sendMail({ from: sender, ...message });
  }
}
