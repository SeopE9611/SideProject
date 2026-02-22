import { ApplicationCtx, EventType, UserCtx } from '@/app/features/notifications/core/type';

/* ========= Theme ========= */
const THEME = {
  brand: '도깨비 테니스',
  surface: '#FCFFFC',
  text: '#1A1C1A',
  sub: '#4A544A',
  footerMeta: '#4A544A',
  line: '#D7E3D7',
  bgSoft: '#F3F8F3',
  badgeBg: '#E9F6EC',
  badgeText: '#248232',
  btnBg: '#2BA84A',
  btnText: '#1A1C1A',
} as const;

/* ========= Utils ========= */
function fmtKST(date?: string, time?: string): string | undefined {
  if (!date || !time) return undefined;
  const d = new Date(`${date}T${time}:00+09:00`);
  const yoil = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${date}(${yoil}) ${time}`;
}
function shortCode(id?: string | null) {
  if (!id) return '-';
  return `DK-${String(id).slice(-6).toUpperCase()}`;
}
function getRacketName(sd: ApplicationCtx['stringDetails'] | undefined) {
  const anySD = sd as any;
  return anySD?.racketType ?? sd?.racket ?? '-';
}
function getStringNames(sd: ApplicationCtx['stringDetails'] | undefined) {
  const anySD = sd as any;
  if (Array.isArray(anySD?.stringItems)) {
    return (
      (anySD.stringItems as { name?: string }[])
        .map((x) => x?.name)
        .filter(Boolean)
        .join(', ') || '-'
    );
  }
  if (Array.isArray(sd?.stringTypes) && sd!.stringTypes!.length) {
    return sd!.stringTypes!.join(', ');
  }
  return '-';
}
function buildICS(app: ApplicationCtx): string | undefined {
  const dateStr = app.stringDetails?.preferredDate;
  if (!dateStr) return undefined;

  const timeStr = app.stringDetails?.preferredTime ?? '10:00';
  const [hhRaw, mmRaw] = timeStr.includes(':') ? timeStr.split(':') : [timeStr, '00'];
  const hh = String(Number(hhRaw || '10')).padStart(2, '0');
  const mm = String(Number(mmRaw || '00')).padStart(2, '0');

  const date = dateStr.replace(/-/g, '');
  const dtstart = `DTSTART;TZID=Asia/Seoul:${date}T${hh}${mm}00`;

  const endH = Math.min(Number(hh) + 1, 23);
  const endHh = String(endH).padStart(2, '0');
  const endMm = endH === 23 && Number(mm) > 0 ? '59' : mm;
  const dtend = `DTEND;TZID=Asia/Seoul:${date}T${endHh}${endMm}00`;

  const uid = `stringing-${app.applicationId}@dokkaebi-tennis`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dokkaebi Tennis//Stringing//KR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    'SUMMARY:도깨비 테니스 스트링 교체 예약',
    dtstart,
    dtend,
    `DESCRIPTION:참조코드 ${shortCode(app.applicationId)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// 전화번호 고르기: contactPhone 우선, 없으면 배송정보의 phone
function pickPhone(app: ApplicationCtx) {
  const anyApp = app as any;
  const raw = anyApp?.contactPhone ?? anyApp?.phone ?? anyApp?.customer?.phone ?? app.shippingInfo?.phone ?? '';
  return String(raw || '').replace(/[^\d]/g, '');
}

// SMS 공통 포맷
function makeSms(prefix: string, ctx: { name?: string; when?: string; id: string; baseUrl: string }) {
  const lines = [`[도깨비 테니스] ${prefix}`, `${ctx.name ?? ''}님`, `일정: ${ctx.when ?? '미정'}`, `신청번호: ${ctx.id}`, `상세보기: ${ctx.baseUrl}/mypage?tab=applications&applicationId=${ctx.id}`];
  return lines.filter(Boolean).join('\n');
}

// 자가발송이면 운송장 등록 CTA 추가
function selfShipCta(app: ApplicationCtx, baseUrl: string) {
  const method = (app as any)?.shippingInfo?.collectionMethod ?? (app as any)?.collectionMethod ?? '';
  const isSelf = typeof method === 'string' && ['self_ship', 'self', '자가발송'].includes(method.toLowerCase());
  return isSelf ? { label: '운송장 등록하기', url: `${baseUrl}/services/applications/${app.applicationId}/shipping` } : null;
}

/* ========= Layout ========= */
function headerHTML(title: string, badge?: string) {
  return `
  <div style="padding:18px 20px;border-bottom:1px solid ${THEME.line};display:flex;align-items:center;justify-content:space-between;">
    <div style="font-weight:700;color:${THEME.text};font-size:16px;">${THEME.brand}</div>
    ${badge ? `<span style="font-size:12px;padding:6px 10px;border-radius:999px;background:${THEME.badgeBg};color:${THEME.badgeText};font-weight:600;">${badge}</span>` : ''}
  </div>
  <div style="padding:20px 20px 8px 20px;">
    <h1 style="margin:0 0 4px 0;font-size:20px;line-height:1.35;color:${THEME.text};">${title}</h1>
    <p style="margin:0;color:${THEME.sub};font-size:13px;">${THEME.brand} 알림입니다.</p>
  </div>`;
}
function summaryTable(rows: [string, string][]) {
  const tr = rows
    .map(
      ([k, v]) => `
    <tr>
      <td style="padding:12px 14px;font-weight:600;width:120px;color:${THEME.text};background:${THEME.bgSoft};border-bottom:1px solid ${THEME.line};">${k}</td>
      <td style="padding:12px 14px;border-bottom:1px solid ${THEME.line};color:${THEME.text};">${v}</td>
    </tr>
  `
    )
    .join('');
  return `
  <table role="presentation" style="border-collapse:collapse;width:100%;background:${THEME.surface};border:1px solid ${THEME.line};border-radius:10px;overflow:hidden;">
    ${tr}
  </table>`;
}
function buttons(ctas?: { label: string; url: string }[]) {
  if (!ctas || !ctas.length) return '';
  const btns = ctas
    .map(
      (b) => `
    <a href="${b.url}" style="display:inline-block;margin-right:8px;padding:11px 16px;border-radius:10px;background:${THEME.btnBg};color:${THEME.btnText};text-decoration:none;font-weight:700;font-size:14px;">${b.label}</a>
  `
    )
    .join('');
  return `<div style="margin-top:16px;">${btns}</div>`;
}
function footer(note?: string) {
  return `
  ${note ? `<div style="margin-top:18px;padding-top:10px;border-top:1px solid ${THEME.line};color:${THEME.sub};font-size:12px;line-height:1.6;">${note}</div>` : ''}
  <div style="margin-top:14px;color:${THEME.footerMeta};font-size:12px;">
    ⓒ ${THEME.brand} · 문의 010-0000-0000 · 영업시간 10:00–19:00
  </div>`;
}
function wrapEmail({ title, badge, preheader, rows, ctas, note }: { title: string; badge?: string; preheader?: string; rows: [string, string][]; ctas?: { label: string; url: string }[]; note?: string }) {
  const pre = preheader ? `<span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${preheader}</span>` : '';
  return `
  ${pre}
  <div style="max-width:680px;margin:0 auto;background:${THEME.surface};border:1px solid ${THEME.line};border-radius:12px;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans KR',sans-serif;">
    ${headerHTML(title, badge)}
    <div style="padding:18px 20px;">
      ${summaryTable(rows)}
      ${buttons(ctas)}
      ${footer(note)}
    </div>
  </div>`;
}

/* ========= Render ========= */
export async function renderForEvent(event: EventType, ctx: { user?: UserCtx; application: ApplicationCtx; adminDetailUrl?: string }) {
  const app = ctx.application;
  const name = ctx.user?.name || '고객님';
  const whenPretty = fmtKST(app.stringDetails?.preferredDate, app.stringDetails?.preferredTime);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const ADMIN_BCC = process.env.ADMIN_NOTIFY_EMAILS || '';
  const ref = shortCode(app.applicationId);

  /* 접수 완료 */
  if (event === 'stringing.application_submitted') {
    const title = `신청 접수 완료`;
    const pre = `일정 ${whenPretty ?? '미정'} · ${ref}`;
    const rows: [string, string][] = [
      ['일정', whenPretty || '미정'],
      ['신청자', `${name} (${ctx.user?.email || '-'})`],
      ['라켓', getRacketName(app.stringDetails)],
      ['스트링', getStringNames(app.stringDetails)],
      ['신청번호', `#${app.applicationId}`],
    ];

    // 각 이벤트 블록의 CTA 링크+ 자가발송 CTA 병합
    const ctasBase = [
      { label: '신청서 상세 보기', url: `${baseUrl}/mypage?tab=applications&applicationId=${app.applicationId}` },
      { label: '일정 변경', url: `${baseUrl}/services/apply?orderId=${app.orderId}` },
    ];
    const maybeSelfShip = selfShipCta(app, baseUrl);
    const ctas = maybeSelfShip ? [...ctasBase, maybeSelfShip] : ctasBase;

    const html = wrapEmail({ title, badge: '접수', preheader: pre, rows, ctas });
    const ics = whenPretty ? buildICS(app) : undefined;
    const subject = `[${THEME.brand}] ${title} · ${whenPretty ?? '미정'}`;
    const toPhone = pickPhone(app);
    const sms = toPhone ? { to: toPhone, text: makeSms('신청 접수 완료', { name, when: whenPretty, id: app.applicationId, baseUrl }) } : undefined;
    return {
      email: { to: ctx.user!.email, subject, html, ics, bcc: ADMIN_BCC || undefined },
      ...(sms ? { sms } : {}),
    };
  }

  /* 상태 변경 */
  if (event === 'stringing.status_updated') {
    const title = `신청 상태 업데이트`;
    const pre = `${app.status} · ${whenPretty ?? '미정'} · ${ref}`;
    const rows: [string, string][] = [['현재 상태', String(app.status)], ...(whenPretty ? ([['일정', whenPretty]] as [string, string][]) : []), ['신청번호', `#${app.applicationId}`]];
    const ctasBase = [{ label: '신청서 상세 보기', url: `${baseUrl}/mypage?tab=applications&applicationId=${app.applicationId}` }];
    const maybeSelfShip = selfShipCta(app, baseUrl);
    const ctas = maybeSelfShip ? [...ctasBase, maybeSelfShip] : ctasBase;
    const html = wrapEmail({ title, badge: String(app.status), preheader: pre, rows, ctas });
    const subject = `[${THEME.brand}] ${title}: ${app.status}`;
    return { email: { to: ctx.user!.email, subject, html, bcc: ADMIN_BCC || undefined } };
  }

  /* 예약 확정 */
  if (event === 'stringing.schedule_confirmed') {
    const title = `예약 확정 안내`;
    const pre = `${whenPretty ?? '미정'} · ${ref}`;
    const rows: [string, string][] = [
      ['일정', whenPretty || '미정'],
      ['신청자', `${name} (${ctx.user?.email || '-'})`],
      ['라켓', getRacketName(app.stringDetails)],
      ['스트링', getStringNames(app.stringDetails)],
      ['신청번호', `#${app.applicationId}`],
    ];
    const ctasBase = [
      { label: '신청서 상세 보기', url: `${baseUrl}/mypage?tab=applications&applicationId=${app.applicationId}` },
      { label: '일정 변경', url: `${baseUrl}/services/apply?orderId=${app.orderId}` },
    ];
    const maybeSelfShip = selfShipCta(app, baseUrl);
    const ctas = maybeSelfShip ? [...ctasBase, maybeSelfShip] : ctasBase;
    const note = '예약 변경/취소는 방문 24시간 전까지 가능합니다. 이후에는 유선 문의 부탁드립니다.';
    const html = wrapEmail({ title, badge: '확정', preheader: pre, rows, ctas, note });
    const ics = buildICS(app);
    const subject = `[${THEME.brand}] ${title} · ${whenPretty ?? '미정'}`;
    const toPhone = pickPhone(app);
    const sms = toPhone ? { to: toPhone, text: makeSms('예약 확정 안내', { name, when: whenPretty, id: app.applicationId, baseUrl }) } : undefined;
    return {
      email: { to: ctx.user!.email, subject, html, ics, bcc: ADMIN_BCC || undefined },
      ...(sms ? { sms } : {}),
    };
  }

  /* 예약 변경 */
  if (event === 'stringing.schedule_updated') {
    const title = `예약 변경 안내`;
    const pre = `${whenPretty ?? '미정'} · ${ref}`;
    const rows: [string, string][] = [
      ['변경된 일정', whenPretty || '미정'],
      ['신청자', `${name} (${ctx.user?.email || '-'})`],
      ['라켓', getRacketName(app.stringDetails)],
      ['스트링', getStringNames(app.stringDetails)],
      ['신청번호', `#${app.applicationId}`],
    ];
    const html = wrapEmail({
      title,
      badge: '변경',
      preheader: pre,
      rows,
      ctas: [{ label: '신청서 상세 보기', url: `${baseUrl}/my/applications/${app.applicationId}` }],
    });
    const ics = buildICS(app);
    const subject = `[${THEME.brand}] ${title} · ${whenPretty ?? '미정'}`;
    const toPhone = pickPhone(app);
    const sms = toPhone ? { to: toPhone, text: makeSms('예약 변경 안내', { name, when: whenPretty, id: app.applicationId, baseUrl }) } : undefined;
    return {
      email: { to: ctx.user!.email, subject, html, ics, bcc: ADMIN_BCC || undefined },
      ...(sms ? { sms } : {}),
    };
  }

  /* (옵션) 예약 취소 */
  if (event === 'stringing.schedule_canceled') {
    const title = `예약 취소 안내`;
    const pre = `${whenPretty ?? '미정'} · ${ref}`;
    const rows: [string, string][] = [
      ['취소된 일정', whenPretty || '미정'],
      ['신청자', `${name} (${ctx.user?.email || '-'})`],
      ['신청번호', `#${app.applicationId}`],
    ];
    const html = wrapEmail({ title, badge: '취소(예약)', preheader: pre, rows });
    const subject = `[${THEME.brand}] ${title} · ${whenPretty ?? '미정'}`;
    const toPhone = pickPhone(app);
    const sms = toPhone ? { to: toPhone, text: makeSms('신청 취소 안내', { name, when: whenPretty, id: app.applicationId, baseUrl }) } : undefined;
    return {
      email: { to: ctx.user!.email, subject, html, bcc: ADMIN_BCC || undefined },
      ...(sms ? { sms } : {}),
    };
  }

  /* 신청 취소 (한 통) */
  if (event === 'stringing.application_canceled') {
    const title = `신청 취소 안내`;
    const pre = `${whenPretty ?? '미정'} · ${ref}`;
    const rows: [string, string][] = [
      ['취소된 일정', whenPretty || '미정'],
      ['신청자', `${name} (${ctx.user?.email || '-'})`],
      ['신청번호', `#${app.applicationId}`],
    ];
    const html = wrapEmail({
      title,
      badge: '취소',
      preheader: pre,
      rows,
      ctas: [{ label: '다시 신청하기', url: `${baseUrl}/services/apply?orderId=${app.orderId}` }],
      note: '재신청 시 원하는 날짜/시간을 다시 선택해 주세요. 회신으로 문의 가능합니다.',
    });
    const subject = `[${THEME.brand}] ${title} · ${whenPretty ?? '미정'}`;
    const toPhone = pickPhone(app);
    const sms = toPhone ? { to: toPhone, text: makeSms('신청 취소 안내', { name, when: whenPretty, id: app.applicationId, baseUrl }) } : undefined;
    return {
      email: { to: ctx.user!.email, subject, html, bcc: ADMIN_BCC || undefined },
      ...(sms ? { sms } : {}),
    };
  }

  // 작업 완료(교체완료)
  if (event === 'stringing.service_completed') {
    const app = ctx.application;
    const name = ctx.user?.name || '고객님';
    const whenPretty = fmtKST(app.stringDetails?.preferredDate, app.stringDetails?.preferredTime);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const ADMIN_BCC = process.env.ADMIN_NOTIFY_EMAILS || '';
    const ref = shortCode(app.applicationId);

    const title = `교체 완료 안내`;
    const pre = `${whenPretty ?? '미정'} · ${ref}`;
    const rows: [string, string][] = [
      ['일정', whenPretty || '미정'],
      ['신청자', `${name} (${ctx.user?.email || '-'})`],
      ['라켓', getRacketName(app.stringDetails)],
      ['스트링', getStringNames(app.stringDetails)],
      ['신청번호', `#${app.applicationId}`],
    ];
    const html = wrapEmail({
      title,
      badge: '교체완료',
      preheader: pre,
      rows,
      ctas: [{ label: '신청서 상세 보기', url: `${baseUrl}/my/applications/${app.applicationId}` }],
    });
    const subject = `[${THEME.brand}] ${title} · ${whenPretty ?? '미정'}`;

    // 문자
    const toPhone = pickPhone(app);
    const sms = toPhone
      ? {
          to: toPhone,
          text: makeSms('교체 완료 안내', {
            name,
            when: whenPretty,
            id: app.applicationId,
            baseUrl,
          }),
        }
      : undefined;

    return {
      email: { to: ctx.user!.email, subject, html, bcc: ADMIN_BCC || undefined },
      ...(sms ? { sms } : {}),
    };
  }

  /** (선택) 작업 시작 알림 – 원치 않으면 이 블록은 생략해도 됨 */
  if (event === 'stringing.service_in_progress') {
    const app = ctx.application;
    const name = ctx.user?.name || '고객님';
    const whenPretty = fmtKST(app.stringDetails?.preferredDate, app.stringDetails?.preferredTime);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const ADMIN_BCC = process.env.ADMIN_NOTIFY_EMAILS || '';
    const ref = shortCode(app.applicationId);

    const title = `작업 진행 안내`;
    const pre = `${whenPretty ?? '미정'} · ${ref}`;
    const rows: [string, string][] = [
      ['현재 상태', '작업 중'],
      ['일정', whenPretty || '미정'],
      ['신청번호', `#${app.applicationId}`],
    ];
    const html = wrapEmail({
      title,
      badge: '작업 중',
      preheader: pre,
      rows,
      ctas: [{ label: '신청서 상세 보기', url: `${baseUrl}/my/applications/${app.applicationId}` }],
    });
    const subject = `[${THEME.brand}] ${title} · ${whenPretty ?? '미정'}`;

    const toPhone = pickPhone(app);
    const sms = toPhone
      ? {
          to: toPhone,
          text: makeSms('작업 진행 안내', {
            name,
            when: whenPretty,
            id: app.applicationId,
            baseUrl,
          }),
        }
      : undefined;

    return {
      email: { to: ctx.user!.email, subject, html, bcc: ADMIN_BCC || undefined },
      ...(sms ? { sms } : {}),
    };
  }

  throw new Error('Unknown event');
}
