import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  await params; // Ensure params is awaited
  const searchParams = request.nextUrl.searchParams;

  const repo = searchParams.get('repo') || 'my-project';
  const tag = searchParams.get('tag') || 'v1.0.0';
  const title = searchParams.get('title') || 'New Release';
  const highlights = searchParams.getAll('highlight');

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#090d16',
          backgroundImage:
            'radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1e293b 2%, transparent 0%)',
          backgroundSize: '100px 100px',
          color: '#ffffff',
          padding: '60px 70px',
          fontFamily: 'sans-serif',
          justifyContent: 'space-between',
        }}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px',
                fontSize: '22px',
                fontWeight: 'bold',
              }}
            >
              GS
            </div>
            <span style={{ fontSize: '28px', fontWeight: 600, color: '#94a3b8' }}>
              {repo}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid #3b82f6',
              padding: '8px 20px',
              borderRadius: '999px',
              color: '#60a5fa',
              fontSize: '22px',
              fontWeight: 'bold',
            }}
          >
            {tag}
          </div>
        </div>

        {/* Title & Core Content */}
        <div style={{ display: 'flex', flexDirection: 'column', margin: '40px 0' }}>
          <h1
            style={{
              fontSize: '52px',
              fontWeight: 800,
              lineHeight: 1.15,
              margin: '0 0 24px 0',
              background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {title}
          </h1>

          {highlights.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {highlights.slice(0, 3).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '24px', color: '#cbd5e1' }}>
                  <span style={{ color: '#38bdf8', marginRight: '14px', fontSize: '22px' }}>⚡</span>
                  <span>{item.length > 80 ? item.substring(0, 77) + '...' : item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #1e293b',
            paddingTop: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '20px' }}>
            <span>Built & shipped with GitSocial</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: '#38bdf8', fontSize: '20px', fontWeight: 600 }}>
            <span>Powered by Buffer API</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
