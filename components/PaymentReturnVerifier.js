"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    useRouter,
} from "next/navigation";


const PAYMENT_STORAGE_KEY =
    "womenname_pending_payment_id";


export default function PaymentReturnVerifier() {
    const router =
        useRouter();

    const [message, setMessage] =
        useState("");

    const [isError, setIsError] =
        useState(false);


    useEffect(() => {
        let cancelled = false;


        async function sleep(ms) {
            return new Promise(
                (resolve) =>
                    setTimeout(
                        resolve,
                        ms
                    )
            );
        }


        async function verifyPayment() {
            /*
              Главное изменение:

              больше НЕ проверяем
              ?payment=success.

              Если paymentId есть в
              localStorage — проверяем
              платёж при любом заходе
              на сайт.
            */
            const paymentId =
                window.localStorage
                    .getItem(
                        PAYMENT_STORAGE_KEY
                    );


            /*
              Pending платежа нет —
              ничего делать не нужно.
            */
            if (!paymentId) {
                return;
            }


            setIsError(false);

            setMessage(
                "ПРОВЕРЯЕМ ОПЛАТУ..."
            );


            /*
              Делаем несколько быстрых
              попыток.

              Это полезно, если человек
              вернулся на сайт буквально
              сразу после оплаты, а YooKassa
              ещё секунду-две обновляет статус.
            */
            for (
                let attempt = 1;
                attempt <= 6;
                attempt += 1
            ) {
                if (cancelled) {
                    return;
                }


                try {
                    const response =
                        await fetch(
                            "/api/payments/verify",
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",
                                },

                                body:
                                    JSON.stringify({
                                        paymentId,
                                    }),

                                cache:
                                    "no-store",
                            }
                        );


                    const data =
                        await response.json();


                    /*
                      Платёж ещё pending.

                      Ждём немного и
                      проверяем снова.
                    */
                    if (
                        response.status ===
                        202
                    ) {
                        if (
                            attempt < 6
                        ) {
                            await sleep(
                                1000
                            );

                            continue;
                        }


                        if (
                            !cancelled
                        ) {
                            setIsError(
                                false
                            );

                            setMessage(
                                "ПЛАТЁЖ ОБРАБАТЫВАЕТСЯ..."
                            );
                        }


                        return;
                    }


                    /*
                      Например платёж отменён.
                    */
                    if (
                        response.status ===
                        400 &&
                        data?.status ===
                        "canceled"
                    ) {
                        window.localStorage
                            .removeItem(
                                PAYMENT_STORAGE_KEY
                            );


                        if (
                            !cancelled
                        ) {
                            setIsError(
                                true
                            );

                            setMessage(
                                "ПЛАТЁЖ ОТМЕНЁН"
                            );
                        }


                        return;
                    }


                    if (
                        !response.ok
                    ) {
                        throw new Error(
                            data?.error ||
                            "Ошибка проверки платежа"
                        );
                    }


                    /*
                      Успех.

                      Убираем paymentId,
                      потому что этот платёж
                      больше проверять не надо.
                    */
                    window.localStorage
                        .removeItem(
                            PAYMENT_STORAGE_KEY
                        );


                    if (cancelled) {
                        return;
                    }


                    setIsError(false);


                    if (
                        data.credited ===
                        true
                    ) {
                        setMessage(
                            `+${data.votes} ГОЛОСОВ ЗАЧИСЛЕНО`
                        );
                    } else {
                        /*
                          Если webhook или cron
                          уже успел обработать
                          этот payment_id.
                        */
                        setMessage(
                            "ГОЛОСЫ УЖЕ ЗАЧИСЛЕНЫ"
                        );
                    }


                    /*
                      Убираем параметры оплаты
                      из URL, если они остались.
                    */
                    const cleanUrl =
                        window.location.pathname;


                    window.history
                        .replaceState(
                            {},
                            "",
                            cleanUrl
                        );


                    /*
                      Обновляем Server Components,
                      чтобы сразу подтянулся
                      новый рейтинг из Supabase.
                    */
                    router.refresh();


                    /*
                      Через несколько секунд
                      убираем уведомление.
                    */
                    setTimeout(
                        () => {
                            if (
                                !cancelled
                            ) {
                                setMessage(
                                    ""
                                );
                            }
                        },
                        4000
                    );


                    return;

                } catch (error) {
                    console.error(
                        "Payment verification error:",
                        error
                    );


                    /*
                      Если это была не последняя
                      попытка — пробуем ещё раз.
                    */
                    if (
                        attempt < 6
                    ) {
                        await sleep(
                            1000
                        );

                        continue;
                    }


                    /*
                      ВАЖНО:

                      paymentId НЕ удаляем.

                      Значит при следующем заходе
                      пользователя на сайт мы снова
                      попробуем проверить платёж.
                    */
                    if (
                        !cancelled
                    ) {
                        setIsError(
                            true
                        );

                        setMessage(
                            "НЕ УДАЛОСЬ ПРОВЕРИТЬ ОПЛАТУ"
                        );
                    }


                    return;
                }
            }
        }


        verifyPayment();


        return () => {
            cancelled = true;
        };
    }, [router]);


    if (!message) {
        return null;
    }


    return (
        <div
            className={
                isError
                    ? "vote-toast error"
                    : "vote-toast"
            }
        >
      <span className="vote-toast-prompt">
        {isError
            ? "!"
            : ">"}
      </span>

            <span>
        {message}
      </span>
        </div>
    );
}