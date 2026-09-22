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


        async function verifyPayment() {
            const paymentId =
                window.localStorage
                    .getItem(
                        PAYMENT_STORAGE_KEY
                    );


            if (!paymentId) {
                return;
            }


            /*
              Показываем короткую плашку,
              но не зависаем на несколько секунд.
            */
            setIsError(false);

            setMessage(
                "ПРОВЕРЯЕМ ОПЛАТУ..."
            );


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
                  YooKassa ещё не успела
                  перевести платёж в succeeded.

                  Ничего не удаляем.
                  Просто убираем плашку.

                  На следующем заходе
                  проверим снова.
                */
                if (
                    response.status ===
                    202
                ) {
                    if (
                        !cancelled
                    ) {
                        setMessage("");
                    }

                    return;
                }


                /*
                  Платёж отменён.
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
                        setIsError(true);

                        setMessage(
                            "ПЛАТЁЖ ОТМЕНЁН"
                        );


                        setTimeout(() => {
                            if (
                                !cancelled
                            ) {
                                setMessage("");
                            }
                        }, 2500);
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
                */
                window.localStorage
                    .removeItem(
                        PAYMENT_STORAGE_KEY
                    );


                if (
                    cancelled
                ) {
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
                    setMessage(
                        "ГОЛОСЫ УЖЕ ЗАЧИСЛЕНЫ"
                    );
                }


                /*
                  Убираем параметры
                  оплаты из URL.
                */
                window.history
                    .replaceState(
                        {},
                        "",
                        window.location.pathname
                    );


                /*
                  Сразу обновляем рейтинг.
                */
                router.refresh();


                setTimeout(() => {
                    if (
                        !cancelled
                    ) {
                        setMessage("");
                    }
                }, 2500);

            } catch (error) {
                console.error(
                    "Payment verification error:",
                    error
                );


                /*
                  Даже при ошибке не держим
                  пользователя на плашке.

                  paymentId остаётся,
                  поэтому при следующем заходе
                  проверка повторится.
                */
                if (
                    !cancelled
                ) {
                    setMessage("");
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