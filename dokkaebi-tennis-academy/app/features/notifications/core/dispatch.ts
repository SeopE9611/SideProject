import { sendEmail } from '../channels/email';
import { sendSlack } from '../channels/slack';
import { sendSmsStub } from '../channels/sms.kakao.stub';
import { markFailed, markSent } from './outbox.repo';

export async function dispatchOutbox(_id: any, rendered: any, channels: ('email' | 'slack' | 'sms')[]) {
  try {
    for (const ch of channels) {
      if (ch === 'email' && rendered.email) {
        await sendEmail(rendered.email);
      } else if (ch === 'slack' && rendered.slack) {
        await sendSlack(rendered.slack.text);
      } else if (ch === 'sms' && rendered.sms) {
        await sendSmsStub(rendered.sms);
      }
    }
    await markSent(_id);
  } catch (e: any) {
    await markFailed(_id, String(e?.message || e));
  }
}
