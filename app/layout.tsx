import type { ReactNode } from 'react';
import 'react-notion-x/src/styles.css';
import 'prismjs/themes/prism.css';
import 'katex/dist/katex.min.css';

export const metadata = {
  title: 'daesae',
  description: 'Notion page viewer using Next.js and react-notion-x'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
