import "./globals.css";

export const metadata = {
  title: "WOMEN NAME",
  description: "Рейтинг женских имён. Голосуй за своё имя и поднимай его выше.",
};

export default function RootLayout({ children }) {
  return (
      <html lang="ru">
      <body>{children}</body>
      </html>
  );
}