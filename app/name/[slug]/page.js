import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import VoteButton from "@/components/VoteButton";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function NamePage({ params }) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();

  const { data: ranking, error } = await supabase
    .from("name_ranking")
    .select("id,name,slug,score,today_score")
    .order("score", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw error;

  const index = (ranking || []).findIndex((item) => item.slug === slug);
  if (index === -1) notFound();

  const item = ranking[index];
  const previous = index > 0 ? ranking[index - 1] : null;
  const gap = previous ? Math.max(0, Number(previous.score) - Number(item.score) + 1) : 0;

  return (
    <main>
      <Header />
      <section className="name-page">
        <Link href="/" className="back-link">← НАЗАД</Link>
        <div className="name-rank">#{index + 1}</div>
        <h1>{item.name.toUpperCase()}</h1>
        <div className="name-score">{Number(item.score).toLocaleString("ru-RU")} ГОЛОСОВ</div>
        <div className="name-today">+{Number(item.today_score || 0).toLocaleString("ru-RU")} СЕГОДНЯ</div>

        {previous ? (
          <div className="target-box">
            ДО #{index}: {gap.toLocaleString("ru-RU")} ГОЛОС{gap === 1 ? "" : "ОВ"}
          </div>
        ) : (
          <div className="target-box">СЕЙЧАС ЭТО ИМЯ №1</div>
        )}

        <VoteButton nameId={item.id} name={item.name} />

        <div className="ascii-divider">+----------------------------------+</div>
        <p className="name-copy">Один голос в день. Голос обновляется по московскому времени.</p>
        <div className="share-copy">ПОДЕЛИСЬ ССЫЛКОЙ: /name/{item.slug}</div>
      </section>
    </main>
  );
}
