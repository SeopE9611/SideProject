import { sendSMS } from '@/app/features/notifications/channels/sms';
import { sendEmail } from '../channels/email';
import { sendSlack } from '../channels/slack';
import { markFailed, markSent } from './outbox.repo';

export async function dispatchOutbox(_id: any, rendered: any, channels: ('email' | 'slack' | 'sms')[]) {
  try {
    for (const ch of channels) {
      if (ch === 'email' && rendered.email) {
        await sendEmail(rendered.email);
      } else if (ch === 'slack' && rendered.slack) {
        await sendSlack(rendered.slack.text);
      } else if (ch === 'sms' && rendered.sms) {
        await sendSMS(rendered.sms.to, rendered.sms.text);
      }
    }
    await markSent(_id);
  } catch (e: any) {
    await markFailed(_id, String(e?.message || e));
  }
}
