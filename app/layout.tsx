export const metadata = {
  title: "Ethereal Echo",
  description: "Mystic-but-clean spiritual chat + ITC transcript interpretation with voice-ready readings."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
