"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox({ names }) {
  const [query, setQuery] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestionStatus, setSuggestionStatus] = useState("");
  const router = useRouter();

  const match = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("ru-RU");
    if (!q) return null;
    return names.find((n) => n.name.toLocaleLowerCase("ru-RU") === q) || null;
  }, [query, names]);

  function submit(event) {
    event.preventDefault();
    if (match) {
      router.push(`/name/${match.slug}`);
      return;
    }
    if (query.trim().length >= 2) setShowSuggest(true);
  }

  async function suggest() {
    setSuggestionStatus("Отправляем...");
    const response = await fetch("/api/names/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: query }),
    });
    const data = await response.json();

    if (response.ok) {
      setSuggestionStatus(data.alreadyExists ? "Это имя уже есть в рейтинге." : data.alreadySuggested ? "Имя уже ждёт проверки." : "Готово. Имя отправлено на проверку.");
    } else {
      setSuggestionStatus(data.error || "Не удалось отправить имя.");
    }
  }

  return (
    <div className="search-block">
      <form className="search-form" onSubmit={submit}>
        <span className="search-prompt">&gt;</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggest(false);
            setSuggestionStatus("");
          }}
          placeholder="НАЙТИ СВОЁ ИМЯ_"
          aria-label="Найти имя"
        />
        <button type="submit">ENTER</button>
      </form>

      {showSuggest && !match ? (
        <div className="suggest-box">
          <div>ИМЯ «{query.trim()}» НЕ НАЙДЕНО.</div>
          <button onClick={suggest}>ПРЕДЛОЖИТЬ ИМЯ</button>
          {suggestionStatus ? <p>{suggestionStatus}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
