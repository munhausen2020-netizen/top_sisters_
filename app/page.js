import RankingExperience from "@/components/RankingExperience";
import SiteAnalytics from "@/components/SiteAnalytics";

import {
    getSupabaseAdmin,
} from "@/lib/supabase-admin";


export const dynamic =
    "force-dynamic";


async function getNames() {
    const supabase =
        getSupabaseAdmin();


    const {
        data,
        error,
    } =
        await supabase
            .from(
                "name_ranking"
            )
            .select(
                "id,name,slug,score,today_score"
            )
            .order(
                "score",
                {
                    ascending:
                        false,
                }
            )
            .order(
                "name",
                {
                    ascending:
                        true,
                }
            );


    if (error) {
        console.error(
            "Could not load ranking:",
            error
        );

        throw error;
    }


    return data || [];
}


export default async function HomePage() {
    const names =
        await getNames();


    return (
        <main className="page">

            <SiteAnalytics />


            <section className="hero">

                <div className="hero-mascot">
                    <img
                        src="/pixel-princess-pink.webp"
                        alt="Pixel princess"
                        width="160"
                        height="160"
                    />
                </div>


                <h1 className="hero-title">
                    КАКОЕ ЖЕНСКОЕ ИМЯ
                    <br />
                    №1 В РОССИИ?
                </h1>

            </section>


            <RankingExperience
                names={names}
            />

        </main>
    );
}