'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home} from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app/global-error.tsx] caught error:', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff66 50%, #faf5ff4d 100%)',
          color: '#0f172a',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 16px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '672px',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '16px',
            backgroundColor: 'rgba(255,255,255,0.92)',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* gradient accent bar */}
          <div
            style={{
              height: '6px',
              width: '100%',
              background: 'linear-gradient(90deg, #ef4444, #f97316, #f59e0b)',
            }}
          />

          {/* content */}
          <div style={{ padding: '32px' }}>
            {/* icon */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                color: '#fff',
                display: 'grid',
                placeContent: 'center',
                boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                marginBottom: '24px',
              }}
            >
              <AlertTriangle style={{ width: '28px', height: '28px' }} />
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 8px' }}>
              <span style={{ color: '#dc2626' }}>서비스</span>에 오류가 발생했어요
            </h1>
            <p style={{ color: '#475569', margin: 0, lineHeight: 1.6 }}>잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 알려주세요.</p>

            {isDev && (
              <pre
                style={{
                  marginTop: '16px',
                  maxHeight: '192px',
                  overflow: 'auto',
                  borderRadius: '12px',
                  backgroundColor: '#f1f5f9',
                  padding: '16px',
                  fontSize: '12px',
                  color: '#334155',
                  border: '1px solid rgba(226,232,240,0.7)',
                }}
              >
                {String(error?.message ?? error)}
              </pre>
            )}

            {/* badge */}
            <div style={{ marginTop: '16px' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  color: '#b91c1c',
                  border: '1px solid rgba(252,165,165,0.4)',
                }}
              >
                일시적인 오류일 수 있습니다
              </span>
            </div>
          </div>

          {/* footer */}
          <div style={{ padding: '0 32px 32px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, #ef4444, #f97316)',
                color: '#fff',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(239,68,68,0.25)',
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = '/')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '8px',
                background: 'transparent',
                color: '#334155',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
              }}
            >
              <Home style={{ width: '16px', height: '16px' }} />
              홈으로 이동
            </button>
          </div>

          {/* decorative blurs */}
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              top: '-96px',
              right: '-96px',
              width: '176px',
              height: '176px',
              borderRadius: '50%',
              backgroundColor: 'rgba(248,113,113,0.25)',
              filter: 'blur(48px)',
            }}
          />
          <div
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              bottom: '-80px',
              left: '-64px',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              backgroundColor: 'rgba(251,146,60,0.25)',
              filter: 'blur(48px)',
            }}
          />
        </div>
      </body>
    </html>
  );
}
