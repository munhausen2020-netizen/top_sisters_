import "./globals.css";
import { Press_Start_2P } from "next/font/google";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin", "cyrillic"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata = {
  title: "WOMEN NAME",
  description:
      "Рейтинг женских имён. Голосуй за своё имя и поднимай его выше.",
};

export default function RootLayout({ children }) {
  return (
      <html lang="ru">
      <body className={pressStart2P.variable}>
      {children}
      </body>
      </html>
  );
}