export const metadata = {
  title: "Immobilienrechner",
  description: "Baufinanzierung und Vermietung",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body style={{ margin: 0, fontFamily: "Arial", background: "#f3f4f6" }}>
        {children}
      </body>
    </html>
  );
}
