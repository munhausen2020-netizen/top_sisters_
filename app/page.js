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

    const searchNames = names.map(
        ({ id, name, slug }) => ({
            id,
            name,
            slug,
        })
    );

    return (
        <main className="page">
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
            </section>

            <section className="main-layout">
                <div className="rating-column">
                    <Leaderboard names={names} />
                </div>

                <aside className="search-column">
                    <div className="side-label">
                        НАЙТИ СВОЁ ИМЯ
                    </div>

                    <SearchBox names={searchNames} />

                    <div className="search-hint">
                        ВВЕДИ ИМЯ
                        <br />
                        И МЫ НАЙДЁМ ЕГО В РЕЙТИНГЕ
                    </div>
                </aside>
            </section>

            <footer>
                <span>© 2026</span>
            </footer>
        </main>
    );
}