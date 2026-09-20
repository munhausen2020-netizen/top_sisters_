"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import VoteButton from "@/components/VoteButton";

const TOP_LIMIT = 20;
const TOP_PREVIEW_LIMIT = 3;
const CONTEXT_BEFORE = 2;
const CONTEXT_AFTER = 2;

function normalize(value) {
    return value.trim().toLocaleLowerCase("ru-RU");
}

function CompactPreviewRow({ item, rank }) {
    return (
        <div className="preview-row">
      <span className="preview-rank">
        {rank}.
      </span>

            <span className="preview-name">
        {item.name}
      </span>

            <span className="preview-dots">
        ................................
      </span>

            <span className="preview-score">
        {Number(item.score || 0).toLocaleString("ru-RU")}
      </span>
        </div>
    );
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
        {Number(item.score || 0).toLocaleString("ru-RU")}
      </span>

            <VoteButton
                nameId={item.id}
                name={item.name}
                compact
            />
        </div>
    );
}

export default function RankingExperience({ names }) {
    const router = useRouter();

    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [status, setStatus] = useState("");
    const [notFoundName, setNotFoundName] = useState("");
    const [addState, setAddState] = useState("idle");

    const topRef = useRef(null);

    const topPreview = useMemo(() => {
        return names.slice(0, TOP_PREVIEW_LIMIT);
    }, [names]);

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
            match = names.find((item) =>
                normalize(item.name).startsWith(normalized)
            );
        }

        if (!match) {
            setSelectedId(null);
            setStatus(
                `ИМЯ «${query.trim().toUpperCase()}» НЕ НАЙДЕНО`
            );
            setNotFoundName(query.trim());
            setAddState("idle");
            return;
        }

        const rank =
            names.findIndex(
                (item) => item.id === match.id
            ) + 1;

        setSelectedId(match.id);
        setNotFoundName("");
        setAddState("idle");
        setStatus(
            `${match.name.toUpperCase()} · #${rank}`
        );

        if (rank <= TOP_LIMIT) {
            window.setTimeout(() => {
                topRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 50);
        }
    }

    function submit(event) {
        event.preventDefault();
        findName();
    }

    async function addName() {
        if (!notFoundName || addState === "loading") {
            return;
        }

        setAddState("loading");
        setStatus("ПРОВЕРЯЕМ ИМЯ...");

        try {
            const response = await fetch("/api/names/suggest", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: notFoundName,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setAddState("error");
                setStatus(
                    data.error || "НЕ УДАЛОСЬ ПРОВЕРИТЬ ИМЯ"
                );
                return;
            }

            if (data.alreadyExists) {
                setAddState("done");
                setSelectedId(data.name.id);
                setNotFoundName("");
                setQuery(data.name.name);
                setStatus(
                    `${data.name.name.toUpperCase()} УЖЕ ЕСТЬ В РЕЙТИНГЕ`
                );
                router.refresh();
                return;
            }

            if (data.decision === "approved") {
                setAddState("done");
                setSelectedId(data.name.id);
                setNotFoundName("");
                setQuery(data.name.name);
                setStatus(
                    `${data.name.name.toUpperCase()} ДОБАВЛЕНА ✓`
                );
                router.refresh();
                return;
            }

            if (data.decision === "review") {
                setAddState("review");
                setNotFoundName("");
                setStatus(
                    "НЕ УДАЛОСЬ АВТОМАТИЧЕСКИ ПОДТВЕРДИТЬ ИМЯ"
                );
                return;
            }

            setAddState("rejected");
            setStatus(
                data.message || "НЕ УДАЛОСЬ ПОДТВЕРДИТЬ ИМЯ"
            );
        } catch {
            setAddState("error");
            setStatus("НЕ УДАЛОСЬ ПРОВЕРИТЬ ИМЯ");
        }
    }

    const selectedName =
        selectedIndex >= 0 ? names[selectedIndex] : null;

    return (
        <section className="ranking-experience">
            <a href="#search" className="hero-action">
                НАЙТИ СВОЁ ИМЯ
            </a>

            <div className="top-preview-box">
                <div className="top-preview-head">
                    <span>СЕЙЧАС В ЛИДЕРАХ:</span>
                    <span>/ ТОП-3 /</span>
                </div>

                <div className="top-preview-list">
                    {topPreview.map((item, index) => (
                        <CompactPreviewRow
                            key={item.id}
                            item={item}
                            rank={index + 1}
                        />
                    ))}
                </div>
            </div>

            <div id="search" className="search-stack">
                <form className="search-form large-search" onSubmit={submit}>
                    <span className="search-icon">⌕</span>

                    <input
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            clearSearchResult();
                        }}
                        placeholder="Найти имя..."
                        autoComplete="off"
                        aria-label="Найти имя"
                    />

                    <button type="submit">НАЙТИ</button>
                </form>

                {status ? (
                    <div
                        className={
                            addState === "error" || addState === "rejected"
                                ? "search-status error"
                                : "search-status"
                        }
                    >
                        &gt; {status}
                    </div>
                ) : null}

                {notFoundName ? (
                    <div className="add-name-box">
                        <div className="add-name-question">
                            Добавить это имя в рейтинг?
                        </div>

                        <button
                            className="add-name-button"
                            onClick={addName}
                            disabled={addState === "loading"}
                        >
                            {addState === "loading"
                                ? "ПРОВЕРЯЕМ..."
                                : "+ ДОБАВИТЬ"}
                        </button>
                    </div>
                ) : null}
            </div>

            {selectedName && selectedIndex >= TOP_LIMIT ? (
                <div className="local-ranking compact-block">
                    <div className="local-ranking-head">
                        <span>ТВОЁ МЕСТО</span>
                        <span>/ #{selectedIndex + 1} /</span>
                    </div>

                    <div className="local-ranking-list">
                        {localContext.map((item) => {
                            const rank =
                                names.findIndex(
                                    (name) => name.id === item.id
                                ) + 1;

                            return (
                                <RankingRow
                                    key={item.id}
                                    item={item}
                                    rank={rank}
                                    highlighted={item.id === selectedId}
                                />
                            );
                        })}
                    </div>
                </div>
            ) : null}

            <div
                id="leaderboard"
                ref={topRef}
                className="leaderboard compact-block"
            >
                <div className="leaderboard-head">
                    <span>РЕЙТИНГ</span>
                    <span>/ ТОП-20 /</span>
                </div>

                <div className="leaderboard-list">
                    {topNames.map((item, index) => (
                        <RankingRow
                            key={item.id}
                            item={item}
                            rank={index + 1}
                            highlighted={item.id === selectedId}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}