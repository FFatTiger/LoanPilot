import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "高精度贷款计算器 - 专业的贷款与提前还款规划工具",
  description: "专业的贷款计算器，支持等额本息、等额本金还款方式，智能提前还款规划，帮您节省利息、优化还款方案。支持商业贷款、公积金贷款计算，提供详细的还款明细表和方案对比分析。",
  keywords: "贷款计算器,房贷计算器,提前还款,等额本息,等额本金,贷款规划,利息计算",
  authors: [{ name: "贷款计算器" }],
  robots: "index, follow",
  openGraph: {
    title: "高精度贷款计算器",
    description: "专业的贷款与提前还款规划工具",
    type: "website",
    locale: "zh_CN",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
