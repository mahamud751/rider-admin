import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bahon Control",
  description: "Operations dashboard for the Bahon platform",
  icons: { icon: "/bahon-logo.jpeg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
