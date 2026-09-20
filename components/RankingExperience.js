"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import VoteButton from "@/components/VoteButton";

const TOP_LIMIT = 20;

function normalize(value) {
    return value
        .trim()
        .toLocaleLowerCase("ru-RU");
}

function RankingRow({
                        item,
                        rank,
                        highlighted = false,
                    }) {
    return (
        <div
            className={
                highlighted
                    ? "leader-row highlighted-row"
                    : "leader-row"
            }
        >
      <span className="rank">
        {String(rank).padStart(2, "0")}
      </span>

            <span className="leader-name">
        {item.name}
      </span>

            <span
                className="dots"
                aria-hidden="true"
            >
        ................................
      </span>

            <span className="score">
        {Number(
            item.score || 0
        ).toLocaleString("ru-RU")}
      </span>

            <VoteButton
                nameId={item.id}
                name={item.name}
                compact
            />
        </div>
    );
}

export default function RankingExperience({
                                              names,
                                          }) {
    const router = useRouter();

    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [status, setStatus] = useState("");
    const [notFoundName, setNotFoundName] = useState("");
    const [addState, setAddState] = useState("idle");

    const topNames = useMemo(() => {
        return names.slice(0, TOP_LIMIT);
    }, [names]);

    function clearSearchResult() {
        setSelectedId(null);
        setStatus("");
        setNotFoundName("");
        setAddState("idle");
    }

    function findName() {
        const normalized = normalize(query);

        if (!normalized) {
            clearSearchResult();
            return;
        }

        let match = names.find(
            (item) =>
                normalize(item.name) === normalized
        );

        if (!match) {
            match = names.find(
                (item) =>
                    normalize(item.name).startsWith(normalized)
            );
        }

        if (!match) {
            setSelectedId(null);

            setStatus(
                `ИМЯ «${query
                    .trim()
                    .toUpperCase()}» НЕ НАЙДЕНО`
            );

            setNotFoundName(
                query.trim()
            );

            setAddState("idle");

            return;
        }

        const rank =
            names.findIndex(
                (item) =>
                    item.id === match.id
            ) + 1;

        setSelectedId(match.id);
        setNotFoundName("");
        setAddState("idle");

        if (rank <= TOP_LIMIT) {
            setStatus(
                `${match.name.toUpperCase()} · #${rank}`
            );

            window.setTimeout(() => {
                const row =
                    document.getElementById(
                        `rank-${match.id}`
                    );

                row?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }, 50);

            return;
        }

        setStatus(
            `${match.name.toUpperCase()} · #${rank} · ВНЕ ТОП-20`
        );
    }

    function submit(event) {
        event.preventDefault();
        findName();
    }

    async function addName() {
        if (
            !notFoundName ||
            addState === "loading"
        ) {
            return;
        }

        setAddState("loading");
        setStatus("ПРОВЕРЯЕМ ИМЯ...");

        try {
            const response = await fetch(
                "/api/names/suggest",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        name: notFoundName,
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                setAddState("error");

                setStatus(
                    data.error ||
                    "НЕ УДАЛОСЬ ПРОВЕРИТЬ ИМЯ"
                );

                return;
            }

            if (data.alreadyExists) {
                setAddState("done");

                setQuery(data.name.name);

                setSelectedId(
                    data.name.id
                );

                setNotFoundName("");

                setStatus(
                    `${data.name.name.toUpperCase()} УЖЕ ЕСТЬ В РЕЙТИНГЕ`
                );

                router.refresh();

                return;
            }

            if (
                data.decision ===
                "approved"
            ) {
                setAddState("done");

                setQuery(
                    data.name.name
                );

                setSelectedId(
                    data.name.id
                );

                setNotFoundName("");

                setStatus(
                    `${data.name.name.toUpperCase()} ДОБАВЛЕНА ✓`
                );

                router.refresh();

                return;
            }

            if (
                data.decision ===
                "review"
            ) {
                setAddState("review");
                setNotFoundName("");

                setStatus(
                    "НЕ УДАЛОСЬ АВТОМАТИЧЕСКИ ПОДТВЕРДИТЬ ИМЯ"
                );

                return;
            }

            setAddState("rejected");

            setStatus(
                data.message ||
                "НЕ УДАЛОСЬ ПОДТВЕРДИТЬ ИМЯ"
            );
        } catch {
            setAddState("error");

            setStatus(
                "НЕ УДАЛОСЬ ПРОВЕРИТЬ ИМЯ"
            );
        }
    }

    return (
        <section className="ranking-shell">
            <div className="search-stack">
                <form
                    className="search-form"
                    onSubmit={submit}
                >
          <span className="search-prompt">
            &gt;
          </span>

                    <input
                        value={query}
                        onChange={(event) => {
                            setQuery(
                                event.target.value
                            );

                            clearSearchResult();
                        }}
                        placeholder="НАЙТИ ИМЯ_"
                        autoComplete="off"
                        aria-label="Найти имя"
                    />

                    <button type="submit">
                        НАЙТИ
                    </button>
                </form>

                {status && (
                    <div
                        className={
                            addState === "error" ||
                            addState === "rejected"
                                ? "search-status error"
                                : "search-status"
                        }
                    >
                        &gt; {status}
                    </div>
                )}

                {notFoundName && (
                    <div className="add-name-box">
                        <div className="add-name-question">
                            ДОБАВИТЬ ИМЯ В РЕЙТИНГ?
                        </div>

                        <button
                            className="add-name-button"
                            onClick={addName}
                            disabled={
                                addState ===
                                "loading"
                            }
                        >
                            {addState ===
                            "loading"
                                ? "ПРОВЕРЯЕМ..."
                                : "+ ДОБАВИТЬ"}
                        </button>
                    </div>
                )}
            </div>

            <div className="leaderboard">
                <div className="leaderboard-head">
          <span>
            РЕЙТИНГ
          </span>

                    <span>
            / ТОП-20 /
          </span>
                </div>

                <div className="leaderboard-list">
                    {topNames.map(
                        (item, index) => (
                            <div
                                id={`rank-${item.id}`}
                                key={item.id}
                            >
                                <RankingRow
                                    item={item}
                                    rank={index + 1}
                                    highlighted={
                                        item.id ===
                                        selectedId
                                    }
                                />
                            </div>
                        )
                    )}
                </div>
            </div>
        </section>
    );
}