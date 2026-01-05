import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Todo Dashboard",
  description: "Manage your tasks with clarity and speed."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
