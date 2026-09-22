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


async function getPayment(paymentId) {
    const response =
        await fetch(
            `https://api.yookassa.ru/v3/payments/${paymentId}`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        getAuthHeader(),
                },

                cache: "no-store",
            }
        );

    if (!response.ok) {
        const text =
            await response.text();

        throw new Error(
            `YooKassa payment check failed: ${text}`
        );
    }

    return response.json();
}


export async function POST(request) {
    try {
        const body =
            await request.json();

        const paymentId =
            String(
                body?.paymentId || ""
            ).trim();


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


        const payment =
            await getPayment(
                paymentId
            );


        /*
          Платёж ещё не закончен.
          Клиент попробует проверить ещё раз.
        */
        if (
            payment.status === "pending"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    status: "pending",
                },
                {
                    status: 202,
                }
            );
        }


        if (
            payment.status === "canceled"
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    status: "canceled",
                    error:
                        "Платёж отменён",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            payment.status !==
            "succeeded" ||
            payment.paid !== true
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    status:
                    payment.status,
                    error:
                        "Платёж ещё не подтверждён",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            payment.amount
                ?.currency !== "RUB"
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
                payment.amount?.value
            );

        const votes =
            Number(
                payment.metadata
                    ?.votes
            );

        const nameId =
            String(
                payment.metadata
                    ?.name_id || ""
            );

        const name =
            String(
                payment.metadata
                    ?.name || ""
            );


        if (
            !nameId ||
            !Number.isInteger(amount) ||
            amount <= 0 ||
            !Number.isInteger(votes) ||
            votes !== amount
        ) {
            console.error(
                "Invalid payment data:",
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
                "Verify RPC error:",
                error
            );

            return NextResponse.json(
                {
                    error:
                        "Не удалось начислить голоса",
                },
                {
                    status: 500,
                }
            );
        }


        console.log(
            "Payment verified:",
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

            paymentId:
            payment.id,

            name,

            votes,

            /*
              true:
              голоса начислены сейчас.

              false:
              этот payment_id уже был
              обработан webhook или
              предыдущей проверкой.
            */
            credited:
            data,
        });

    } catch (error) {
        console.error(
            "Verify payment error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Ошибка проверки платежа",
            },
            {
                status: 500,
            }
        );
    }
}