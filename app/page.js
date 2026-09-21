import Image from "next/image";
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
                    <Image
                        src="/pixel-princess.webp"
                        alt="Pixel princess"
                        width={160}
                        height={160}
                        priority
                        sizes="(max-width: 600px) 128px, 160px"
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