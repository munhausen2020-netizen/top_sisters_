import {
    NextResponse,
} from "next/server";

import {
    getSupabaseAdmin,
} from "@/lib/supabase-admin";


export const runtime =
    "nodejs";

export const dynamic =
    "force-dynamic";


function getAuthHeader() {
    const shopId =
        process.env
            .YOOKASSA_SHOP_ID;

    const secretKey =
        process.env
            .YOOKASSA_SECRET_KEY;


    if (
        !shopId ||
        !secretKey
    ) {
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
            .toString(
                "base64"
            )
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


    if (
        !response.ok
    ) {
        const text =
            await response.text();


        throw new Error(
            `YooKassa check failed: ${text}`
        );
    }


    return response.json();
}


function checkCronSecret(
    request
) {
    const expected =
        process.env
            .PAYMENTS_CRON_SECRET;


    if (!expected) {
        throw new Error(
            "PAYMENTS_CRON_SECRET is missing"
        );
    }


    const authHeader =
        request.headers.get(
            "authorization"
        );


    return (
        authHeader ===
        `Bearer ${expected}`
    );
}


export async function GET(
    request
) {
    try {
        /*
          Никто извне не должен
          иметь возможность запускать
          reconciler без секрета.
        */
        if (
            !checkCronSecret(
                request
            )
        ) {
            return NextResponse.json(
                {
                    error:
                        "Unauthorized",
                },
                {
                    status:
                        401,
                }
            );
        }


        const supabase =
            getSupabaseAdmin();


        /*
          Берём максимум 50 pending
          платежей за один проход.

          Для MVP более чем достаточно.
        */
        const {
            data: orders,
            error:
                ordersError,
        } =
            await supabase
                .from(
                    "payment_orders"
                )
                .select(
                    "payment_id,name_id,amount_rub,votes_count,status,credited,created_at"
                )
                .eq(
                    "credited",
                    false
                )
                .in(
                    "status",
                    [
                        "pending",
                        "waiting_for_capture",
                    ]
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            true,
                    }
                )
                .limit(
                    50
                );


        if (
            ordersError
        ) {
            console.error(
                "Orders load error:",
                ordersError
            );


            return NextResponse.json(
                {
                    error:
                        "Could not load pending payments",
                },
                {
                    status:
                        500,
                }
            );
        }


        if (
            !orders ||
            orders.length === 0
        ) {
            return NextResponse.json({
                ok: true,
                checked: 0,
                credited: 0,
            });
        }


        let checked =
            0;

        let credited =
            0;

        let canceled =
            0;

        let failed =
            0;


        for (
            const order
            of orders
            ) {
            try {
                const payment =
                    await getPayment(
                        order.payment_id
                    );


                checked += 1;


                /*
                  Отмечаем, что платёж
                  проверяли.
                */
                await supabase
                    .from(
                        "payment_orders"
                    )
                    .update({
                        status:
                            payment.status ||
                            order.status,

                        checked_at:
                            new Date()
                                .toISOString(),
                    })
                    .eq(
                        "payment_id",
                        order.payment_id
                    );


                /*
                  Платёж всё ещё ждёт оплаты.
                */
                if (
                    payment.status ===
                    "pending"
                ) {
                    continue;
                }


                /*
                  Пользователь отменил
                  или платёж протух.
                */
                if (
                    payment.status ===
                    "canceled"
                ) {
                    canceled += 1;

                    continue;
                }


                /*
                  Нас интересует только
                  реально успешный платёж.
                */
                if (
                    payment.status !==
                    "succeeded" ||
                    payment.paid !==
                    true
                ) {
                    continue;
                }


                /*
                  Дополнительная проверка:
                  должны совпасть сумма
                  и валюта.
                */
                if (
                    payment.amount
                        ?.currency !==
                    "RUB"
                ) {
                    throw new Error(
                        "Invalid payment currency"
                    );
                }


                const actualAmount =
                    Number(
                        payment.amount
                            ?.value
                    );


                if (
                    !Number.isInteger(
                        actualAmount
                    ) ||
                    actualAmount !==
                    order.amount_rub
                ) {
                    throw new Error(
                        `Payment amount mismatch: expected ${order.amount_rub}, got ${actualAmount}`
                    );
                }


                const metadataNameId =
                    String(
                        payment.metadata
                            ?.name_id ||
                        ""
                    );


                const metadataVotes =
                    Number(
                        payment.metadata
                            ?.votes
                    );


                if (
                    metadataNameId !==
                    String(
                        order.name_id
                    ) ||
                    metadataVotes !==
                    order.votes_count
                ) {
                    throw new Error(
                        "Payment metadata mismatch"
                    );
                }


                /*
                  Теперь начисляем.

                  credit_paid_votes уже
                  защищён уникальным
                  payment_id, поэтому
                  двойного начисления
                  не будет.
                */
                const {
                    data:
                        creditResult,

                    error:
                        creditError,
                } =
                    await supabase.rpc(
                        "credit_paid_votes",
                        {
                            p_payment_id:
                            order.payment_id,

                            p_name_id:
                            order.name_id,

                            p_amount_rub:
                            order.amount_rub,

                            p_votes_count:
                            order.votes_count,
                        }
                    );


                if (
                    creditError
                ) {
                    throw creditError;
                }


                /*
                  creditResult = true:
                  начислили сейчас.

                  false:
                  этот payment_id
                  уже был обработан,
                  например webhook'ом.
                */
                await supabase
                    .from(
                        "payment_orders"
                    )
                    .update({
                        status:
                            "succeeded",

                        credited:
                            true,

                        credited_at:
                            new Date()
                                .toISOString(),

                        checked_at:
                            new Date()
                                .toISOString(),
                    })
                    .eq(
                        "payment_id",
                        order.payment_id
                    );


                if (
                    creditResult ===
                    true
                ) {
                    credited += 1;
                }


                console.log(
                    "Payment reconciled:",
                    {
                        paymentId:
                        order.payment_id,

                        votes:
                        order.votes_count,

                        newlyCredited:
                        creditResult,
                    }
                );

            } catch (error) {
                failed += 1;


                console.error(
                    "Payment reconcile error:",
                    {
                        paymentId:
                        order.payment_id,

                        error,
                    }
                );
            }
        }


        return NextResponse.json({
            ok:
                true,

            checked,

            credited,

            canceled,

            failed,
        });

    } catch (error) {
        console.error(
            "Reconcile error:",
            error
        );


        return NextResponse.json(
            {
                error:
                    "Reconcile failed",
            },
            {
                status:
                    500,
            }
        );
    }
}