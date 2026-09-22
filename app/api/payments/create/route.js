import crypto from "crypto";

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


export async function POST(request) {
    try {
        const body =
            await request.json();


        const nameId =
            String(
                body?.nameId || ""
            ).trim();


        const amount =
            Number(
                body?.amount
            );


        if (!nameId) {
            return NextResponse.json(
                {
                    error:
                        "Name ID is missing",
                },
                {
                    status: 400,
                }
            );
        }


        if (
            !Number.isInteger(amount) ||
            amount < 1 ||
            amount > 5000
        ) {
            return NextResponse.json(
                {
                    error:
                        "Сумма должна быть от 1 до 5000 ₽",
                },
                {
                    status: 400,
                }
            );
        }


        /*
          1 ₽ = 1 голос
        */
        const votes =
            amount;


        const supabase =
            getSupabaseAdmin();


        /*
          Проверяем имя
        */
        const {
            data: name,
            error: nameError,
        } =
            await supabase
                .from("names")
                .select(
                    "id,name,slug,is_active"
                )
                .eq(
                    "id",
                    nameId
                )
                .eq(
                    "is_active",
                    true
                )
                .single();


        if (
            nameError ||
            !name
        ) {
            console.error(
                "Name lookup error:",
                nameError
            );

            return NextResponse.json(
                {
                    error:
                        "Имя не найдено",
                },
                {
                    status: 404,
                }
            );
        }


        const siteUrl =
            process.env
                .NEXT_PUBLIC_SITE_URL ||
            "https://womenname.ru";


        /*
          Создаём платёж в ЮKassa
        */
        const response =
            await fetch(
                "https://api.yookassa.ru/v3/payments",
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            getAuthHeader(),

                        "Content-Type":
                            "application/json",

                        "Idempotence-Key":
                            crypto.randomUUID(),
                    },

                    body:
                        JSON.stringify({
                            amount: {
                                value:
                                    amount.toFixed(2),

                                currency:
                                    "RUB",
                            },

                            capture: true,

                            confirmation: {
                                type:
                                    "redirect",

                                return_url:
                                    `${siteUrl}/?payment=success`,
                            },

                            description:
                                `${votes} голосов за ${name.name}`,

                            metadata: {
                                name_id:
                                name.id,

                                name:
                                name.name,

                                votes:
                                    String(votes),
                            },
                        }),
                }
            );


        const payment =
            await response.json();


        if (!response.ok) {
            console.error(
                "YooKassa create error:",
                payment
            );

            return NextResponse.json(
                {
                    error:
                        payment?.description ||
                        "Не удалось создать платёж",
                },
                {
                    status:
                    response.status,
                }
            );
        }


        if (
            !payment?.id ||
            !payment?.confirmation?.confirmation_url
        ) {
            console.error(
                "Invalid YooKassa payment:",
                payment
            );

            return NextResponse.json(
                {
                    error:
                        "Некорректный ответ ЮKassa",
                },
                {
                    status: 500,
                }
            );
        }


        /*
          ВАЖНО:

          Платёж ещё НЕ оплачен.

          Но мы уже сохраняем его,
          чтобы потом сервер сам
          мог проверить статус.
        */
        const {
            error: orderError,
        } =
            await supabase
                .from(
                    "payment_orders"
                )
                .insert({
                    payment_id:
                    payment.id,

                    name_id:
                    name.id,

                    amount_rub:
                    amount,

                    votes_count:
                    votes,

                    status:
                        payment.status ||
                        "pending",

                    credited:
                        false,
                });


        if (orderError) {
            console.error(
                "Could not save payment order:",
                orderError
            );


            /*
              Здесь лучше НЕ отправлять
              человека на оплату.

              Иначе деньги могут быть
              оплачены, а payment_id
              мы потеряем.
            */
            return NextResponse.json(
                {
                    error:
                        "Не удалось сохранить платёж",
                },
                {
                    status: 500,
                }
            );
        }


        console.log(
            "Payment created:",
            {
                paymentId:
                payment.id,

                name:
                name.name,

                amount,

                votes,
            }
        );


        return NextResponse.json({
            paymentId:
            payment.id,

            confirmationUrl:
            payment.confirmation
                .confirmation_url,
        });

    } catch (error) {
        console.error(
            "Create payment error:",
            error
        );


        return NextResponse.json(
            {
                error:
                    "Ошибка создания платежа",
            },
            {
                status: 500,
            }
        );
    }
}
