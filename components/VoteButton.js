"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import { useRouter } from "next/navigation";

export default function VoteButton({
                                       nameId,
                                       name,
                                       compact = false,
                                   }) {
    const router = useRouter();

    const [isLoading, setIsLoading] =
        useState(false);

    const [isConfirmOpen, setIsConfirmOpen] =
        useState(false);

    const [toast, setToast] =
        useState(null);

    const toastTimer =
        useRef(null);

    function showToast(
        message,
        type = "success"
    ) {
        if (toastTimer.current) {
            clearTimeout(
                toastTimer.current
            );
        }

        setToast({
            message,
            type,
        });

        toastTimer.current =
            setTimeout(() => {
                setToast(null);
            }, 3000);
    }

    useEffect(() => {
        return () => {
            if (toastTimer.current) {
                clearTimeout(
                    toastTimer.current
                );
            }
        };
    }, []);

    function openConfirm() {
        if (isLoading) {
            return;
        }

        setIsConfirmOpen(true);
    }

    function closeConfirm() {
        if (isLoading) {
            return;
        }

        setIsConfirmOpen(false);
    }

    async function vote() {
        if (isLoading) {
            return;
        }

        setIsLoading(true);

        try {
            const response =
                await fetch(
                    "/api/vote",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({
                            nameId,
                        }),
                    }
                );

            const data =
                await response.json();

            setIsConfirmOpen(false);

            if (!response.ok) {
                if (data.alreadyVoted) {
                    showToast(
                        "ТЫ УЖЕ ГОЛОСОВАЛ СЕГОДНЯ",
                        "blocked"
                    );
                } else {
                    showToast(
                        data.error ||
                        "НЕ УДАЛОСЬ ОТПРАВИТЬ ГОЛОС",
                        "error"
                    );
                }

                return;
            }

            showToast(
                `ГОЛОС ЗА «${name.toUpperCase()}» ПРИНЯТ`,
                "success"
            );

            router.refresh();
        } catch {
            setIsConfirmOpen(false);

            showToast(
                "НЕ УДАЛОСЬ ОТПРАВИТЬ ГОЛОС",
                "error"
            );
        } finally {
            setIsLoading(false);
        }
    }

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
                    className="terminal-button"
                    onClick={openConfirm}
                    aria-busy={isLoading}
                    aria-label={`Голосовать за ${name}`}
                >
                    {compact
                        ? "ГОЛОСУЙ"
                        : "ГОЛОСОВАТЬ"}
                </button>
            </div>

            {isConfirmOpen && (
                <div
                    className="vote-modal-overlay"
                    onClick={closeConfirm}
                >
                    <div
                        className="vote-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`vote-title-${nameId}`}
                        onClick={(event) => {
                            event.stopPropagation();
                        }}
                    >
                        <div className="vote-modal-label">
                            &gt; ПОДТВЕРЖДЕНИЕ
                        </div>

                        <div
                            className="vote-modal-title"
                            id={`vote-title-${nameId}`}
                        >
                            ГОЛОСУЕМ ЗА
                            <br />
                            «{name.toUpperCase()}»?
                        </div>

                        <div className="vote-modal-note">
                            ОДИН ГОЛОС В ДЕНЬ
                        </div>

                        <div className="vote-modal-actions">
                            <button
                                className="vote-modal-cancel"
                                type="button"
                                onClick={closeConfirm}
                                disabled={isLoading}
                            >
                                НЕТ
                            </button>

                            <button
                                className="vote-modal-confirm"
                                type="button"
                                onClick={vote}
                                disabled={isLoading}
                            >
                                {isLoading
                                    ? "..."
                                    : "ДА, ГОЛОСУЮ"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div
                    className={`vote-toast ${toast.type}`}
                    role="status"
                    aria-live="polite"
                >
          <span className="vote-toast-prompt">
            &gt;
          </span>

                    <span>
            {toast.message}
          </span>
                </div>
            )}
        </>
    );
}