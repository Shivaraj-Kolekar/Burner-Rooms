import type { Metadata } from "next";
import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-providers";
import { Toaster } from "@/components/ui/sonner";

const fontSans = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title:
    "Burner Rooms - Anonymous Encrypted Chat Rooms | Self-Destructing Messages",
  description:
    "Create temporary, anonymous chat rooms. No registration required. Rooms self-destruct after time limit. Perfect for secure, private conversations.",
  keywords: [
    "anonymous chat",
    "temporary chat",
    "self-destructing messages",
    "private chat",
    "secure messaging",
    "ephemeral chat",
    "burner chat",
    "no registration chat",
    "temporary messaging",
  ],
  authors: [{ name: "Burner Rooms" }],
  creator: "Burner Rooms",
  publisher: "Burner Rooms",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://burnerrooms.shivraj-kolekar.in",
    title: "Burner Rooms - Anonymous Chat Rooms",
    description:
      "Create temporary, anonymous chat rooms. No registration required. Self-destructing messages for maximum privacy.",
    siteName: "Burner Rooms",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Burner Rooms - Encrypted Anonymous Chat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Burner Rooms - Anonymous Encrypted Chat Rooms",
    description:
      "Create temporary, anonymous chat rooms with end-to-end encryption. No registration required.",
    images: ["/og-image.png"],
    creator: "@burnerrooms",
  },
  alternates: {
    canonical: "https://burnerrooms.com",
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "Technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ea580c" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta property="og:type" content="website" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Burner Rooms",
              description: "Create temporary and anonymous chat rooms",
              url: "https://burnerrooms.shivraj-kolekar.in",
              applicationCategory: "CommunicationApplication",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                //     "End-to-end encryption",
                "Anonymous chat",
                "Self-destructing rooms",
                "No registration required",
                "Emoji and GIF support",
                "Message reactions",
                "Message Threads",
                // "Disappearing messages",
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${fontSans.variable} antialiased max-w-full flex justify-center flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <Toaster />
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
