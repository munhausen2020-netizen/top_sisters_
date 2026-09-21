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
            <section className="hero">
                <div className="hero-mascot">
                    <img
                        src="/pixel-princess.png"
                        alt="Pixel princess"
                    />
                </div>

                <h1 className="hero-title">
                    КАКОЕ ЖЕНСКОЕ ИМЯ
                    <br />
                    №1 В РОССИИ?
                </h1>
            </section>

            <RankingExperience names={names} />
        </main>
    );
}