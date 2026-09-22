"use client";

import {
    useState,
} from "react";


export default function PaidVoteButton({
                                           nameId,
                                           name,
                                           compact = false,
                                       }) {
    const [isOpen, setIsOpen] =
        useState(false);

    const [amount, setAmount] =
        useState(100);

    const [customAmount, setCustomAmount] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");


    async function pay(
        selectedAmount
    ) {
        if (loading) {
            return;
        }


        const finalAmount =
            Number(
                selectedAmount
            );


        if (
            !Number.isInteger(finalAmount) ||
            finalAmount < 1 ||
            finalAmount > 5000
        ) {
            setError(
                "Введите сумму от 1 до 5000 ₽"
            );

            return;
        }


        setLoading(true);
        setError("");


        try {
            const response =
                await fetch(
                    "/api/payments/create",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                nameId,
                                amount:
                                finalAmount,
                            }),
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    "Ошибка оплаты"
                );
            }


            if (
                !data
                    ?.confirmationUrl
            ) {
                throw new Error(
                    "Нет ссылки на оплату"
                );
            }


            window.location.href =
                data.confirmationUrl;

        } catch (error) {
            console.error(
                error
            );


            setError(
                error?.message ||
                "Не удалось создать платёж"
            );


            setLoading(
                false
            );
        }
    }


    if (!isOpen) {
        return (
            <div
                className={
                    compact
                        ? "vote-wrap compact"
                        : "vote-wrap"
                }
            >
                <button
                    type="button"
                    className="terminal-button"
                    onClick={() =>
                        setIsOpen(true)
                    }
                >
                    {compact
                        ? "ПОДНЯТЬ"
                        : "ПОДНЯТЬ ИМЯ"}
                </button>
            </div>
        );
    }


    return (
        <div className="paid-vote-box">

            <div className="paid-vote-title">
                ПОДНЯТЬ {name.toUpperCase()}
            </div>


            <div className="paid-vote-rate">
                1 ₽ = 1 ГОЛОС
            </div>


            <div className="paid-vote-presets">

                {[50, 100, 300].map(
                    (value) => (
                        <button
                            type="button"
                            key={value}
                            className={
                                amount === value
                                    ? "paid-vote-preset active"
                                    : "paid-vote-preset"
                            }
                            onClick={() => {
                                setAmount(
                                    value
                                );

                                setCustomAmount(
                                    ""
                                );
                            }}
                        >
                            +{value}
                            <br />
                            {value} ₽
                        </button>
                    )
                )}

            </div>


            <div className="paid-vote-custom">

                <input
                    type="number"
                    min="1"
                    max="5000"
                    inputMode="numeric"
                    placeholder="ДРУГАЯ СУММА"
                    value={customAmount}
                    onChange={(event) => {
                        setCustomAmount(
                            event.target.value
                        );
                    }}
                />

            </div>


            {error ? (
                <div className="paid-vote-error">
                    {error}
                </div>
            ) : null}


            <div className="paid-vote-actions">

                <button
                    type="button"
                    className="paid-vote-cancel"
                    disabled={loading}
                    onClick={() => {
                        setIsOpen(false);
                        setError("");
                    }}
                >
                    НАЗАД
                </button>


                <button
                    type="button"
                    className="paid-vote-confirm"
                    disabled={loading}
                    onClick={() =>
                        pay(
                            customAmount
                                ? Number(
                                    customAmount
                                )
                                : amount
                        )
                    }
                >
                    {loading
                        ? "ПЕРЕХОД..."
                        : `ОПЛАТИТЬ ${
                            customAmount ||
                            amount
                        } ₽`}
                </button>

            </div>

        </div>
    );
}