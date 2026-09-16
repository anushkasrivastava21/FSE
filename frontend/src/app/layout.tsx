import type { Metadata } from "next";
import { Web3Provider } from "@/providers/Web3Provider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "FSE — Food Surplus Exchange",
  description:
    "Blockchain-powered food surplus exchange connecting donors with NGOs through transparent, urgency-scored matching.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Web3Provider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#262626",
                color: "#fff",
                border: "1px solid #404040",
                borderRadius: "12px",
              },
            }}
          />
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
