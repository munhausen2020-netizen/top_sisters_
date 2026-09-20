import RankingExperience from "@/components/RankingExperience";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function getNames() {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from("name_ranking")
        .select("id,name,slug,score,today_score")
        .order("score", { ascending: false })
        .order("name", { ascending: true });

    if (error) {
        throw error;
    }

    return data || [];
}

export default async function HomePage() {
    const names = await getNames();

    return (
        <main className="page">
            <header className="topbar">
                <nav className="topbar-left">
                    <a href="#leaderboard">РЕЙТИНГ</a>
                    <a href="#about">О ПРОЕКТЕ</a>
                    <a href="#faq">FAQ</a>
                </nav>

                <div className="topbar-brand">
                    <div className="brand-wordmark">ИМЯ.</div>
                    <div className="brand-subtitle">
                        БОЛЬШЕ, ЧЕМ ПРОСТО ИМЯ
                    </div>
                </div>

                <div className="topbar-right">
                    <a href="#search">НАЙТИ</a>
                </div>
            </header>

            <section className="hero">
                <div className="hero-mascot">
                    <img
                        src="/pixel-princess.png"
                        alt="Pixel princess"
                    />
                </div>

                <h1 className="hero-title">
                    КАКОЕ ЖЕНСКОЕ ИМЯ №1
                    <br />
                    В РОССИИ?
                </h1>

                <p className="hero-description">
                    Голосуй за своё имя и поднимай его в рейтинге.
                </p>
            </section>

            <RankingExperience names={names} />

            <section id="about" className="bottom-copy">
                <p>ИМЕНА ДЕЛАЮТ МИР ЯРЧЕ ♥</p>
            </section>

            <section id="faq" className="faq-note">
                <p>1 ЧЕЛОВЕК = 1 ГОЛОС В ДЕНЬ</p>
            </section>
        </main>
    );
}