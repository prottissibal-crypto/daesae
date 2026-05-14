import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import 'react-notion-x/src/styles.css';
import 'prismjs/themes/prism.css';
import 'katex/dist/katex.min.css';
import './globals.css';

export const metadata: Metadata = {
  applicationName: '대세영어학원',
  description: '도래울 영어 내신 관리와 학생별 학습 진행을 함께 관리하는 대세영어학원입니다.',
  icons: {
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: [{ url: '/favicon.ico' }]
  },
  metadataBase: new URL('https://daesae.kro.kr'),
  openGraph: {
    description: '도래울 영어 내신 관리와 학생별 학습 진행을 함께 관리하는 대세영어학원입니다.',
    images: [
      {
        alt: '대세영어학원',
        url: '/daesae-logo.webp'
      }
    ],
    locale: 'ko_KR',
    siteName: '대세영어학원',
    title: '대세영어학원',
    type: 'website',
    url: '/'
  },
  title: {
    default: '대세영어학원',
    template: '%s | 대세영어학원'
  },
  twitter: {
    card: 'summary',
    description: '도래울 영어 내신 관리와 학생별 학습 진행을 함께 관리하는 대세영어학원입니다.',
    images: ['/daesae-logo.webp'],
    title: '대세영어학원'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
