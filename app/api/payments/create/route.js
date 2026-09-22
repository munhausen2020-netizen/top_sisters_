import { NextResponse } from "next/server";
import crypto from "crypto";
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
            Number(body?.amount);


        if (!nameId) {
            return NextResponse.json(
                {
                    error:
                        "Не передано имя",
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


        const supabase =
            getSupabaseAdmin();


        const {
            data: name,
            error: nameError,
        } = await supabase
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
            .maybeSingle();


        if (
            nameError ||
            !name
        ) {
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


        /*
          1 ₽ = 1 голос
        */
        const votes =
            amount;


        const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL ||
            "https://womenname.ru";


        const response =
            await fetch(
                "https://api.yookassa.ru/v3/payments",
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            getAuthHeader(),

                        "Idempotence-Key":
                            crypto.randomUUID(),

                        "Content-Type":
                            "application/json",
                    },

                    body:
                        JSON.stringify({
                            amount: {
                                value:
                                    amount.toFixed(2),

                                currency:
                                    "RUB",
                            },

                            capture:
                                true,

                            confirmation: {
                                type:
                                    "redirect",

                                return_url:
                                    `${siteUrl}/?payment=success&name=${encodeURIComponent(
                                        name.slug
                                    )}`,
                            },

                            description:
                                `${votes} голосов за ${name.name}`,

                            metadata: {
                                name_id:
                                    String(
                                        name.id
                                    ),

                                name:
                                name.name,

                                votes:
                                    String(
                                        votes
                                    ),
                            },
                        }),

                    cache:
                        "no-store",
                }
            );


        const payment =
            await response.json();


        if (!response.ok) {
            console.error(
                "YooKassa error:",
                payment
            );

            return NextResponse.json(
                {
                    error:
                        "Не удалось создать платёж",
                },
                {
                    status: 502,
                }
            );
        }


        const confirmationUrl =
            payment
                ?.confirmation
                ?.confirmation_url;


        if (!confirmationUrl) {
            return NextResponse.json(
                {
                    error:
                        "Не получена ссылка на оплату",
                },
                {
                    status: 502,
                }
            );
        }


        return NextResponse.json({
            paymentId:
            payment.id,

            confirmationUrl,
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