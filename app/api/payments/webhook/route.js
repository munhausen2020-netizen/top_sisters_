import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";


function getClientIp(request) {
    const forwarded =
        request.headers.get("x-forwarded-for");

    if (forwarded) {
        return forwarded
            .split(",")[0]
            .trim();
    }

    return (
        request.headers.get("x-real-ip") ||
        ""
    );
}


function ipToInt(ip) {
    return ip
        .split(".")
        .reduce(
            (acc, part) =>
                (acc << 8) +
                Number(part),
            0
        ) >>> 0;
}


function isIpInCidr(
    ip,
    cidr
) {
    const [
        network,
        prefixLength,
    ] =
        cidr.split("/");

    const prefix =
        Number(
            prefixLength
        );

    const ipInt =
        ipToInt(ip);

    const networkInt =
        ipToInt(network);

    const mask =
        prefix === 0
            ? 0
            : (
            0xffffffff <<
            (32 - prefix)
        ) >>> 0;

    return (
        (ipInt & mask) ===
        (networkInt & mask)
    );
}


function isYooKassaIp(ip) {
    if (!ip) {
        return false;
    }


    /*
      IPv6 диапазон ЮKassa.
      Пока просто разрешаем их
      известный префикс.
    */
    if (
        ip
            .toLowerCase()
            .startsWith(
                "2a02:5180:"
            )
    ) {
        return true;
    }


    /*
      IPv4 диапазоны из документации
      ЮKassa.
    */
    const cidrs = [
        "185.71.76.0/27",
        "185.71.77.0/27",
        "77.75.153.0/25",
        "77.75.154.128/25",
    ];


    const exactIps = [
        "77.75.156.11",
        "77.75.156.35",
    ];


    if (
        exactIps.includes(ip)
    ) {
        return true;
    }


    if (
        !/^\d+\.\d+\.\d+\.\d+$/.test(
            ip
        )
    ) {
        return false;
    }


    return cidrs.some(
        (cidr) =>
            isIpInCidr(
                ip,
                cidr
            )
    );
}


export async function POST(
    request
) {
    const startedAt =
        Date.now();

    try {
        const clientIp =
            getClientIp(
                request
            );


        console.log(
            "YooKassa webhook received:",
            {
                clientIp,
            }
        );


        /*
          Проверяем источник.

          ВАЖНО:
          Railway обычно передаёт
          реальный IP через
          x-forwarded-for.
        */
        if (
            !isYooKassaIp(
                clientIp
            )
        ) {
            console.error(
                "Webhook rejected: invalid IP",
                {
                    clientIp,
                }
            );


            return NextResponse.json(
                {
                    error:
                        "Invalid source",
                },
                {
                    status: 403,
                }
            );
        }


        const notification =
            await request.json();


        /*
          Другие события нам
          сейчас не нужны.
        */
        if (
            notification?.event !==
            "payment.succeeded"
        ) {
            return NextResponse.json({
                ok: true,
            });
        }


        const payment =
            notification?.object;


        if (
            !payment?.id
        ) {
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
          Сам webhook уже содержит
          актуальный объект платежа.
        */
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


        /*
          1 ₽ = 1 голос
        */
        if (
            !nameId ||
            !Number.isInteger(
                amount
            ) ||
            amount <= 0 ||
            !Number.isInteger(
                votes
            ) ||
            votes !== amount
        ) {
            console.error(
                "Invalid webhook payment:",
                {
                    paymentId:
                    payment.id,

                    amount,

                    votes,

                    nameId,
                }
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
        } =
            await supabase.rpc(
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


            /*
              Возвращаем 500.

              Тогда ЮKassa повторит
              доставку уведомления.
            */
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

                durationMs:
                    Date.now() -
                    startedAt,
            }
        );


        return NextResponse.json({
            ok:
                true,

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