import type { Metadata } from "next";
import { grotesk } from './ui/fonts';
import "./globals.css";
import Script from 'next/script';


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
    <>
    <html lang="en">
        <head>
            <meta name="theme-color" content="#143c14" />
        
        </head>
       
      <body
        className={` ${grotesk.className} text-black antialiased`}
      >
        {children}
      </body>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-9675N3CMWM" />
      <Script id="gtag" strategy="lazyOnload">
            {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-9675N3CMWM');
            `}
      </Script>

    </html>
    </>
  );
}
