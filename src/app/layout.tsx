import type { Metadata } from "next";
import Script from "next/script";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { FireMetricsProvider } from "@/context/FireMetricsContext";
import { ThemeProvider } from "@/context/ThemeContext";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Drawdown Desk",
  description: "A tool for calculating taxes and withdrawals for retirement income.",
};

// Blocking theme script - runs before any React renders
const themeScript = `
(function() {
  try {
    // Read theme from localStorage
    var theme = localStorage.getItem('theme');
    
    // If theme is "system" or not set, use system preference
    if (!theme || theme === 'system') {
      var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.add(systemTheme);
      return;
    }
    
    // Apply explicit theme
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    // Default to dark on error
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${playfair.variable} ${dmSans.variable} antialiased`}
      >
        <ConvexClientProvider>
          <ThemeProvider>
            <FireMetricsProvider>
              {children}
            </FireMetricsProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
