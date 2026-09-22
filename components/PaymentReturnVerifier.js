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


        async function run() {
            const params =
                new URLSearchParams(
                    window.location.search
                );


            if (
                params.get("payment") !==
                "success"
            ) {
                return;
            }


            const paymentId =
                window.localStorage
                    .getItem(
                        PAYMENT_STORAGE_KEY
                    );


            if (!paymentId) {
                /*
                  Например, пользователь
                  вернулся в другом браузере.

                  Ничего не начисляем без
                  проверки paymentId.
                */
                setIsError(true);

                setMessage(
                    "НЕ УДАЛОСЬ НАЙТИ ПЛАТЁЖ"
                );

                return;
            }


            setMessage(
                "ПРОВЕРЯЕМ ОПЛАТУ..."
            );


            /*
              На случай небольшой задержки
              статуса после возврата.
            */
            for (
                let attempt = 1;
                attempt <= 5;
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
                            }
                        );


                    const data =
                        await response.json();


                    /*
                      Платёж ещё обрабатывается.
                    */
                    if (
                        response.status ===
                        202
                    ) {
                        await new Promise(
                            (resolve) =>
                                setTimeout(
                                    resolve,
                                    2000
                                )
                        );

                        continue;
                    }


                    if (!response.ok) {
                        throw new Error(
                            data?.error ||
                            "Ошибка проверки платежа"
                        );
                    }


                    window.localStorage
                        .removeItem(
                            PAYMENT_STORAGE_KEY
                        );


                    if (cancelled) {
                        return;
                    }


                    setIsError(false);


                    if (
                        data.credited
                    ) {
                        setMessage(
                            `+${data.votes} ГОЛОСОВ ЗАЧИСЛЕНО`
                        );
                    } else {
                        /*
                          Например webhook всё-таки
                          успел обработать платёж.
                        */
                        setMessage(
                            "ГОЛОСЫ УЖЕ ЗАЧИСЛЕНЫ"
                        );
                    }


                    /*
                      Убираем payment=success
                      из URL.
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
                      Перезапрашиваем Server
                      Components и новый рейтинг.
                    */
                    router.refresh();


                    setTimeout(() => {
                        if (!cancelled) {
                            setMessage("");
                        }
                    }, 4000);


                    return;

                } catch (error) {
                    console.error(
                        "Payment verification error:",
                        error
                    );


                    /*
                      Последняя попытка.
                    */
                    if (
                        attempt === 5
                    ) {
                        if (
                            !cancelled
                        ) {
                            setIsError(true);

                            setMessage(
                                "НЕ УДАЛОСЬ ПРОВЕРИТЬ ОПЛАТУ"
                            );
                        }

                        return;
                    }


                    await new Promise(
                        (resolve) =>
                            setTimeout(
                                resolve,
                                2000
                            )
                    );
                }
            }
        }


        run();


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