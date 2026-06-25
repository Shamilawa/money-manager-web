import "./globals.css";

export const metadata = {
  title: "Aether Finance | Consolidated Asset Ledger",
  description: "Personal finance dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans text-zinc-100 bg-bg-base overflow-hidden">
        {children}
      </body>
    </html>
  );
}
