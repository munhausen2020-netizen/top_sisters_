"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

export default function SearchBox({ names }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const highlightTimer = useRef(null);

  const normalizedQuery = useMemo(() => {
    return query
        .trim()
        .toLocaleLowerCase("ru-RU");
  }, [query]);

  function findName() {
    if (!normalizedQuery) {
      return null;
    }

    const exactMatch = names.find(
        (item) =>
            item.name.toLocaleLowerCase(
                "ru-RU"
            ) === normalizedQuery
    );

    if (exactMatch) {
      return exactMatch;
    }

    const startsWithMatch = names.find(
        (item) =>
            item.name
                .toLocaleLowerCase("ru-RU")
                .startsWith(normalizedQuery)
    );

    if (startsWithMatch) {
      return startsWithMatch;
    }

    return null;
  }

  function scrollToName(item) {
    const element =
        document.getElementById(
            `name-${item.slug}`
        );

    if (!element) {
      setStatus("ИМЯ НЕ НАЙДЕНО");
      return;
    }

    document
        .querySelectorAll(
            ".leader-row.search-highlight"
        )
        .forEach((row) => {
          row.classList.remove(
              "search-highlight"
          );
        });

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    window.setTimeout(() => {
      element.classList.add(
          "search-highlight"
      );
    }, 350);

    if (highlightTimer.current) {
      clearTimeout(
          highlightTimer.current
      );
    }

    highlightTimer.current =
        setTimeout(() => {
          element.classList.remove(
              "search-highlight"
          );
        }, 3000);

    const position =
        names.findIndex(
            (name) => name.id === item.id
        ) + 1;

    setStatus(
        `НАЙДЕНО · ${item.name.toUpperCase()} · #${position}`
    );
  }

  function submit(event) {
    event.preventDefault();

    const match = findName();

    if (!match) {
      setStatus("ИМЯ НЕ НАЙДЕНО");
      return;
    }

    scrollToName(match);
  }

  return (
      <div className="search-block">
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
                setStatus("");
              }}
              placeholder="ИМЯ_"
              aria-label="Найти имя"
              autoComplete="off"
          />

          <button type="submit">
            FIND
          </button>
        </form>

        {status ? (
            <div
                className={
                  status === "ИМЯ НЕ НАЙДЕНО"
                      ? "search-status error"
                      : "search-status"
                }
            >
              &gt; {status}
            </div>
        ) : null}
      </div>
  );
}