import "./globals.css";

export const metadata = {
  title: "ИМЯ. — рейтинг женских имён",
  description: "Голосуй за своё имя и поднимай его в рейтинге.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
