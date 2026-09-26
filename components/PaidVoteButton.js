"use client";

import {
    useState,
} from "react";

import {
    trackProductEvent,
} from "@/lib/product-analytics";


const METRIKA_ID =
    112874757;


function reachGoal(
    goal,
    params = {}
) {
    if (
        typeof window ===
        "undefined"
    ) {
        return;
    }


    if (
        typeof window.ym !==
        "function"
    ) {
        return;
    }


    try {
        window.ym(
            METRIKA_ID,
            "reachGoal",
            goal,
            params
        );

    } catch (error) {
        console.error(
            "Yandex Metrika goal error:",
            goal,
            error
        );
    }
}


export default function PaidVoteButton({
                                           nameId,
                                           name,
                                           compact = false,
                                       }) {
    const [
        isOpen,
        setIsOpen,
    ] =
        useState(false);


    const [
        amount,
        setAmount,
    ] =
        useState(30);


    const [
        customAmount,
        setCustomAmount,
    ] =
        useState("");


    const [
        loading,
        setLoading,
    ] =
        useState(false);


    const [
        error,
        setError,
    ] =
        useState("");


    function openModal() {
        setError("");
        setIsOpen(true);


        reachGoal(
            "vote_open",
            {
                name,
                name_id:
                nameId,
            }
        );


        trackProductEvent({
            eventName:
                "vote_open",

            nameId,

            name,
        });
    }


    function closeModal() {
        if (loading) {
            return;
        }


        setIsOpen(false);

        setError("");

        setCustomAmount("");

        setAmount(30);
    }


    async function startPayment() {
        if (loading) {
            return;
        }


        const finalAmount =
            customAmount
                ? Number(
                    customAmount
                )
                : amount;


        if (
            !Number.isInteger(
                finalAmount
            ) ||
            finalAmount < 1 ||
            finalAmount > 50000
        ) {
            setError(
                "ВВЕДИ СУММУ ОТ 1 ДО 50 000 ₽"
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
                    "НЕ УДАЛОСЬ СОЗДАТЬ ПЛАТЁЖ"
                );
            }


            if (
                !data
                    ?.confirmationUrl
            ) {
                throw new Error(
                    "НЕ ПОЛУЧЕНА ССЫЛКА НА ОПЛАТУ"
                );
            }


            reachGoal(
                "payment_started",
                {
                    name,

                    name_id:
                    nameId,

                    amount:
                    finalAmount,

                    votes:
                    finalAmount,
                }
            );


            await trackProductEvent({
                eventName:
                    "payment_started",

                nameId,

                name,

                amountRub:
                finalAmount,

                votesCount:
                finalAmount,

                paymentId:
                    data.paymentId ||
                    data.payment_id ||
                    null,
            });


            window.location.href =
                data.confirmationUrl;

        } catch (error) {
            console.error(
                "Payment error:",
                error
            );


            setError(
                error?.message ||
                "ОШИБКА ОПЛАТЫ"
            );


            setLoading(false);
        }
    }


    const finalAmount =
        customAmount
            ? Number(
            customAmount
        ) || 0
            : amount;


    return (
        <>
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
                    onClick={
                        openModal
                    }
                >
                    ГОЛОСУЙ
                </button>
            </div>


            {isOpen && (
                <div
                    className="vote-modal-overlay"

                    onMouseDown={(
                        event
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeModal();
                        }
                    }}
                >
                    <div
                        className="vote-modal"
                    >

                        <div
                            className="vote-modal-label"
                        >
                            {">"} ГОЛОСУЙ ЗА ИМЯ
                        </div>


                        <div
                            className="vote-modal-title"
                        >
                            {name.toUpperCase()}
                        </div>


                        <div
                            className="vote-modal-note"
                        >
                            1 ₽ = 1 ГОЛОС
                        </div>


                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(3, 1fr)",

                                gap:
                                    "8px",

                                marginTop:
                                    "22px",
                            }}
                        >
                            {[10, 30, 50].map(
                                (
                                    value
                                ) => (
                                    <button
                                        key={
                                            value
                                        }

                                        type="button"

                                        className="terminal-button"

                                        disabled={
                                            loading
                                        }

                                        onClick={() => {
                                            setAmount(
                                                value
                                            );

                                            setCustomAmount(
                                                ""
                                            );

                                            setError(
                                                ""
                                            );
                                        }}

                                        style={{
                                            minHeight:
                                                "58px",

                                            background:
                                                !customAmount &&
                                                amount === value
                                                    ? "var(--green)"
                                                    : "#000",

                                            color:
                                                !customAmount &&
                                                amount === value
                                                    ? "#000"
                                                    : "var(--green)",
                                        }}
                                    >
                                        {value} ₽
                                    </button>
                                )
                            )}
                        </div>


                        <div
                            style={{
                                marginTop:
                                    "10px",
                            }}
                        >
                            <input
                                type="number"
                                min="1"
                                max="50000"
                                inputMode="numeric"

                                value={
                                    customAmount
                                }

                                disabled={
                                    loading
                                }

                                placeholder="ДРУГАЯ СУММА"

                                onChange={(
                                    event
                                ) => {
                                    setCustomAmount(
                                        event
                                            .target
                                            .value
                                    );

                                    setError(
                                        ""
                                    );
                                }}

                                style={{
                                    width:
                                        "100%",

                                    minHeight:
                                        "54px",

                                    border:
                                        "2px solid var(--green)",

                                    outline:
                                        "none",

                                    padding:
                                        "0 12px",

                                    background:
                                        "#000",

                                    color:
                                        "var(--green)",

                                    fontFamily:
                                        "var(--font-pixel), monospace",

                                    fontSize:
                                        "16px",

                                    textAlign:
                                        "center",
                                }}
                            />
                        </div>


                        {error && (
                            <div
                                style={{
                                    marginTop:
                                        "14px",

                                    color:
                                        "var(--danger)",

                                    fontSize:
                                        "8px",

                                    lineHeight:
                                        "1.7",

                                    textAlign:
                                        "center",
                                }}
                            >
                                {error}
                            </div>
                        )}


                        <div
                            className="vote-modal-actions"
                        >

                            <button
                                type="button"
                                className="vote-modal-cancel"
                                disabled={
                                    loading
                                }
                                onClick={
                                    closeModal
                                }
                            >
                                НАЗАД
                            </button>


                            <button
                                type="button"
                                className="vote-modal-confirm"
                                disabled={
                                    loading
                                }
                                onClick={
                                    startPayment
                                }
                            >
                                {loading ? (
                                    <span
                                        className="loading-content"
                                    >
                                        <span
                                            className="inline-loader dark"
                                        />

                                        ПЕРЕХОД...
                                    </span>
                                ) : (
                                    <>
                                        ОПЛАТИТЬ
                                        <br />
                                        {finalAmount} ₽
                                    </>
                                )}
                            </button>

                        </div>

                    </div>
                </div>
            )}
        </>
    );
}