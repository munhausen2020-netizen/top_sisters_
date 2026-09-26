import { NextResponse } from "next/server";

import {
    getSupabaseAdmin,
} from "@/lib/supabase-admin";


const ALLOWED_EVENTS = new Set([
    "vote_open",
    "payment_started",
]);


export async function POST(request) {
    try {
        const body =
            await request.json();


        const eventName =
            String(
                body?.eventName || ""
            );


        if (
            !ALLOWED_EVENTS.has(
                eventName
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        "Unknown event",
                },
                {
                    status: 400,
                }
            );
        }


        const visitorId =
            body?.visitorId
                ? String(
                    body.visitorId
                ).slice(0, 100)
                : null;


        const sessionId =
            body?.sessionId
                ? String(
                    body.sessionId
                ).slice(0, 100)
                : null;


        const nameId =
            body?.nameId
                ? String(
                    body.nameId
                )
                : null;


        const name =
            body?.name
                ? String(
                    body.name
                ).slice(0, 100)
                : null;


        const amountRub =
            Number.isInteger(
                Number(
                    body?.amountRub
                )
            )
                ? Number(
                    body.amountRub
                )
                : null;


        const votesCount =
            Number.isInteger(
                Number(
                    body?.votesCount
                )
            )
                ? Number(
                    body.votesCount
                )
                : null;


        const pageUrl =
            body?.pageUrl
                ? String(
                    body.pageUrl
                ).slice(0, 1000)
                : null;


        const supabase =
            getSupabaseAdmin();


        const {
            error,
        } =
            await supabase
                .from(
                    "product_events"
                )
                .insert({
                    event_name:
                    eventName,

                    visitor_id:
                    visitorId,

                    session_id:
                    sessionId,

                    name_id:
                    nameId,

                    name,

                    amount_rub:
                    amountRub,

                    votes_count:
                    votesCount,

                    page_url:
                    pageUrl,
                });


        if (error) {
            console.error(
                "Product analytics insert error:",
                error
            );

            throw error;
        }


        return NextResponse.json({
            ok: true,
        });

    } catch (error) {
        console.error(
            "Product analytics error:",
            error
        );


        return NextResponse.json(
            {
                error:
                    "Analytics error",
            },
            {
                status: 500,
            }
        );
    }
}