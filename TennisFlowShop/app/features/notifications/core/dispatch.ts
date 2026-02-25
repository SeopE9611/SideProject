import { sendSMS } from '@/app/features/notifications/channels/sms';
import { sendEmail } from '../channels/email';
import { sendSlack } from '../channels/slack';
import { markFailed, markSent } from './outbox.repo';

export async function dispatchOutbox(_id: any, rendered: any, channels: ('email' | 'slack' | 'sms')[]) {
  let hadError = false;

  for (const ch of channels) {
    try {
      if (ch === 'email' && rendered.email) {
        await sendEmail(rendered.email);
      } else if (ch === 'slack' && rendered.slack) {
        await sendSlack(rendered.slack.text);
      } else if (ch === 'sms' && rendered.sms) {
        await sendSMS(rendered.sms.to, rendered.sms.text);
      }
    } catch (err: any) {
      hadError = true;
      console.error('[notify] channel failed:', ch, err?.message || err);
      // 계속 진행해서 다음 채널은 보내도록 한다
    }
  }

  if (hadError) {
    // 일부 실패는 기록만 남기고 전체를 실패로 간주할지 정책에 따라 결정
    // 부분 성공을 허용하려면 markSent로 처리하고, 실패 내역은 outbox에 별도 필드로 남길 수도 있음
    await markSent(_id); // 또는 await markFailed(_id, 'partial failure');
  } else {
    await markSent(_id);
  }
}
