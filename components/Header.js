import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="logo">ИМЯ.</Link>
      <nav>
        <Link href="/#rating">РЕЙТИНГ</Link>
        <Link href="/#about">О ПРОЕКТЕ</Link>
      </nav>
    </header>
  );
}
