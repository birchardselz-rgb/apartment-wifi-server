import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DVS网络 — 宽带服务中心',
  description: '公寓千兆宽带 · AI 智能网络服务 · 全链路数字化运营',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="bg-[#0B0F19] text-[#E2E8F0] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
