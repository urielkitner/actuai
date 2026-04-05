import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ActuAi — המערכת החכמה לאיזון משאבים",
  description: "פלטפורמה מקצועית לאקטוארים לניהול תיקי איזון משאבים בצורה מדויקת, מהירה ומאורגנת",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
