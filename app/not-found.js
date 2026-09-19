import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <div>404</div>
      <p>ИМЯ НЕ НАЙДЕНО</p>
      <Link href="/">← ВЕРНУТЬСЯ В РЕЙТИНГ</Link>
    </main>
  );
}
