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
        }, 2500);
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
          `ГОЛОС ПРИНЯТ · ${name.toUpperCase()} +1`,
          "success"
      );

      router.refresh();
    } catch {
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
              onClick={vote}
              aria-busy={isLoading}
              aria-label={`Голосовать за ${name}`}
          >
            {compact
                ? "ГОЛОСУЙ"
                : "ГОЛОСОВАТЬ"}
          </button>
        </div>

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