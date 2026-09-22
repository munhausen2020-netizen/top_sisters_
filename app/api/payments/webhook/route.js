import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";


function getAuthHeader() {
    const shopId =
        process.env.YOOKASSA_SHOP_ID;

    const secretKey =
        process.env.YOOKASSA_SECRET_KEY;


    if (!shopId || !secretKey) {
        throw new Error(
            "YooKassa credentials are missing"
        );
    }


    return (
        "Basic " +
        Buffer
            .from(
                `${shopId}:${secretKey}`
            )
            .toString("base64")
    );
}


async function getPayment(
    paymentId
) {
    const response =
        await fetch(
            `https://api.yookassa.ru/v3/payments/${paymentId}`,
            {
                method:
                    "GET",

                headers: {
                    Authorization:
                        getAuthHeader(),
                },

                cache:
                    "no-store",
            }
        );


    if (!response.ok) {
        const text =
            await response.text();

        throw new Error(
            `YooKassa check failed: ${text}`
        );
    }


    return response.json();
}


export async function POST(request) {
    try {
        const notification =
            await request.json();


        if (
            notification?.event !==
            "payment.succeeded"
        ) {
            return NextResponse.json({
                ok: true,
            });
        }


        const paymentId =
            notification
                ?.object
                ?.id;


        if (!paymentId) {
            return NextResponse.json(
                {
                    error:
                        "Payment ID missing",
                },
                {
                    status: 400,
                }
            );
        }


        /*
          Ещё раз проверяем платёж
          напрямую через API ЮKassa.
        */
        const payment =
            await getPayment(
                paymentId
            );


        if (
            payment.status !==
            "succeeded" ||
            payment.paid !== true
        ) {
            return NextResponse.json(
                {
                    error:
                        "Payment is not succeeded",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            payment.amount
                ?.currency !==
            "RUB"
        ) {
            return NextResponse.json(
                {
                    error:
                        "Invalid currency",
                },
                {
                    status: 400,
                }
            );
        }


        const amount =
            Number(
                payment.amount
                    ?.value
            );


        const votes =
            Number(
                payment.metadata
                    ?.votes
            );


        const nameId =
            String(
                payment.metadata
                    ?.name_id ||
                ""
            );


        if (
            !nameId ||
            !Number.isInteger(amount) ||
            amount <= 0 ||
            !Number.isInteger(votes) ||
            votes !== amount
        ) {
            console.error(
                "Invalid payment:",
                payment
            );


            return NextResponse.json(
                {
                    error:
                        "Invalid payment data",
                },
                {
                    status: 400,
                }
            );
        }


        const supabase =
            getSupabaseAdmin();


        const {
            data,
            error,
        } = await supabase.rpc(
            "credit_paid_votes",
            {
                p_payment_id:
                payment.id,

                p_name_id:
                nameId,

                p_amount_rub:
                amount,

                p_votes_count:
                votes,
            }
        );


        if (error) {
            console.error(
                "Supabase RPC error:",
                error
            );


            return NextResponse.json(
                {
                    error:
                        "Could not credit votes",
                },
                {
                    status: 500,
                }
            );
        }


        console.log(
            "Paid votes processed:",
            {
                paymentId:
                payment.id,

                nameId,

                votes,

                credited:
                data,
            }
        );


        return NextResponse.json({
            ok: true,
            credited:
            data,
        });

    } catch (error) {
        console.error(
            "Webhook error:",
            error
        );


        return NextResponse.json(
            {
                error:
                    "Webhook error",
            },
            {
                status: 500,
            }
        );
    }
}