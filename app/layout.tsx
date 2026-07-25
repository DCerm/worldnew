import type { Metadata } from "next";
import { grotesk } from "./ui/fonts";
import "./globals.css";
import Script from "next/script";
import ToastBridge from "./ui/toast-bridge";
import ActionFeedback from "./ui/action-feedback";


export const metadata: Metadata = {
  title: "World New",
  description: "Making a new world of love emerge through music",
  keywords: [
    
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#333" />
      </head>
      <body
        className={`${grotesk.variable} ${grotesk.className} text-black antialiased`}
      >
        <ActionFeedback />
        <ToastBridge />
        {children}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-9675N3CMWM" />
        <Script id="gtag" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-9675N3CMWM');
          `}
        </Script>
      </body>
    </html>
  );
}
