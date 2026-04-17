import type { Metadata } from "next";
import { Toaster } from "sonner";

import { QueryProvider } from "@/components/providers/query-provider";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "QQuiz Web",
  description: "QQuiz Next.js frontend migration scaffold"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
