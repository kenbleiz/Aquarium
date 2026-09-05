import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
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
  title: "Arc — Stream → Content Engine",
  description:
    "Dépose une VOD. Arc reconstitue les histoires (contexte → tension → événement → réaction → conclusion) et génère des clips verticaux prêts à publier.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${geistSans.className} min-h-full bg-background text-foreground`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
