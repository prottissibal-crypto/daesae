import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        alignItems: 'center',
        background:
          'linear-gradient(180deg, rgba(255, 245, 239, 0.95) 0%, rgba(255, 255, 255, 1) 54%)',
        color: '#1f2933',
        display: 'flex',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '32px'
      }}
    >
      <section
        style={{
          maxWidth: '520px',
          textAlign: 'center',
          width: '100%'
        }}
      >
        <p
          style={{
            color: '#f97316',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0',
            margin: '0 0 12px'
          }}
        >
          404
        </p>
        <h1
          style={{
            fontSize: 'clamp(30px, 6vw, 46px)',
            lineHeight: 1.15,
            margin: '0 0 14px'
          }}
        >
          이 페이지는 존재하지 않습니다!
        </h1>
        <p
          style={{
            color: '#52606d',
            fontSize: '16px',
            lineHeight: 1.6,
            margin: '0 auto 28px',
            maxWidth: '380px'
          }}
        >
          주소가 잘못되었거나, 아직 등록되지 않은 페이지입니다.
        </p>
        <Link
          href="/"
          style={{
            alignItems: 'center',
            background: '#f97316',
            borderRadius: '8px',
            color: '#fff',
            display: 'inline-flex',
            fontSize: '15px',
            fontWeight: 700,
            justifyContent: 'center',
            minHeight: '44px',
            padding: '0 18px',
            textDecoration: 'none'
          }}
        >
          홈으로 가기
        </Link>
      </section>
    </main>
  );
}
