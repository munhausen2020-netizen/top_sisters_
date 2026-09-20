"use client";

import { useMemo, useRef, useState } from "react";
import VoteButton from "@/components/VoteButton";

const TOP_LIMIT = 20;
const CONTEXT_BEFORE = 2;
const CONTEXT_AFTER = 2;

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
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] =
        useState(null);

    const [status, setStatus] = useState("");

    const topRef = useRef(null);

    const topNames = useMemo(() => {
        return names.slice(0, TOP_LIMIT);
    }, [names]);

    const selectedIndex = useMemo(() => {
        if (!selectedId) {
            return -1;
        }

        return names.findIndex(
            (item) => item.id === selectedId
        );
    }, [names, selectedId]);

    const localContext = useMemo(() => {
        if (selectedIndex < TOP_LIMIT) {
            return [];
        }

        if (selectedIndex === -1) {
            return [];
        }

        const start = Math.max(
            0,
            selectedIndex - CONTEXT_BEFORE
        );

        const end = Math.min(
            names.length,
            selectedIndex + CONTEXT_AFTER + 1
        );

        return names.slice(start, end);
    }, [names, selectedIndex]);

    function findName() {
        const normalized = normalize(query);

        if (!normalized) {
            setSelectedId(null);
            setStatus("");
            return;
        }

        let match = names.find(
            (item) =>
                normalize(item.name) === normalized
        );

        if (!match) {
            match = names.find((item) =>
                normalize(item.name).startsWith(
                    normalized
                )
            );
        }

        if (!match) {
            setSelectedId(null);
            setStatus("ИМЯ НЕ НАЙДЕНО");
            return;
        }

        const rank =
            names.findIndex(
                (item) => item.id === match.id
            ) + 1;

        setSelectedId(match.id);

        setStatus(
            `${match.name.toUpperCase()} · #${rank}`
        );

        if (rank <= TOP_LIMIT) {
            window.setTimeout(() => {
                topRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }, 50);
        }
    }

    function submit(event) {
        event.preventDefault();
        findName();
    }

    const selectedName =
        selectedIndex >= 0
            ? names[selectedIndex]
            : null;

    return (
        <section className="main-layout">
            <div
                className="rating-column"
                ref={topRef}
            >
                <div className="leaderboard">
                    <div className="leaderboard-head">
                        <span>ТОП-20</span>

                        <span>
              / ЖЕНСКИЕ ИМЕНА /
            </span>
                    </div>

                    <div className="leaderboard-list">
                        {topNames.map(
                            (item, index) => (
                                <RankingRow
                                    key={item.id}
                                    item={item}
                                    rank={index + 1}
                                    highlighted={
                                        item.id === selectedId
                                    }
                                />
                            )
                        )}
                    </div>
                </div>
            </div>

            <aside className="search-column">
                <div className="side-label">
                    НАЙТИ СВОЁ ИМЯ
                </div>

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
                            setQuery(event.target.value);

                            if (!event.target.value) {
                                setSelectedId(null);
                                setStatus("");
                            }
                        }}
                        placeholder="ИМЯ_"
                        autoComplete="off"
                        aria-label="Найти имя"
                    />

                    <button type="submit">
                        FIND
                    </button>
                </form>

                {status && (
                    <div
                        className={
                            status === "ИМЯ НЕ НАЙДЕНО"
                                ? "search-status error"
                                : "search-status"
                        }
                    >
                        &gt; {status}
                    </div>
                )}

                {selectedName &&
                    selectedIndex >= TOP_LIMIT && (
                        <div className="local-ranking">
                            <div className="local-ranking-head">
                <span>
                  ТВОЁ МЕСТО
                </span>

                                <span>
                  / #{selectedIndex + 1} /
                </span>
                            </div>

                            <div className="local-ranking-list">
                                {localContext.map(
                                    (item) => {
                                        const rank =
                                            names.findIndex(
                                                (name) =>
                                                    name.id === item.id
                                            ) + 1;

                                        return (
                                            <RankingRow
                                                key={item.id}
                                                item={item}
                                                rank={rank}
                                                highlighted={
                                                    item.id ===
                                                    selectedId
                                                }
                                            />
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    )}
            </aside>
        </section>
    );
}