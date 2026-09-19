import Header from "@/components/Header";
import Leaderboard from "@/components/Leaderboard";
import SearchBox from "@/components/SearchBox";
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

    const searchNames = names.map(({ id, name, slug }) => ({
        id,
        name,
        slug,
    }));

    return (
        <main>
            <Header />

            <section className="hero">
                <h1>
                    КАКОЕ ЖЕНСКОЕ ИМЯ
                    <br />
                    №1 В РОССИИ?
                </h1>

                <p className="hero-description">
                    Голосуй за своё имя и поднимай его в рейтинге.
                </p>

                <p className="rule">
                    1 ЧЕЛОВЕК = 1 ГОЛОС В ДЕНЬ
                </p>

                <SearchBox names={searchNames} />
            </section>

            <div id="rating" className="content-shell">
                <Leaderboard names={names} limit={10} />
            </div>

            <section id="about" className="about-section">
                <div className="terminal-title">
                    / КАК ЭТО РАБОТАЕТ /
                </div>

                <div className="about-grid">
                    <div>
                        <b>01</b>
                        <span>Найди своё имя</span>
                    </div>

                    <div>
                        <b>02</b>
                        <span>Отдай один голос</span>
                    </div>

                    <div>
                        <b>03</b>
                        <span>Возвращайся завтра</span>
                    </div>
                </div>

                <p>
                    Если имени нет, предложи его через поиск.
                    После проверки оно появится в рейтинге.
                </p>
            </section>

            <footer>
                <span>ИМЕНА ДЕЛАЮТ МИР ЯРЧЕ ♥</span>
                <span>© 2026 ИМЯ.</span>
            </footer>
        </main>
    );
}