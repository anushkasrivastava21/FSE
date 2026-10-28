import type { Metadata } from "next";
import { Web3Provider } from "@/providers/Web3Provider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Food Surplus Exchange | Decentralized Allocation Protocol",
  description:
    "Blockchain-powered food surplus exchange connecting donors with NGOs through transparent, urgency-scored matching.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#EEE9E0] text-[#4A4238] min-h-screen font-sans antialiased selection:bg-[#C8BFB0] selection:text-[#2C2620]">
        <Web3Provider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#E4DDD1",
                color: "#2C2620",
                border: "1px solid #C8BFB0",
                borderRadius: "4px",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "13px",
              },
            }}
          />
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
