"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VoteButton({ nameId, name, compact = false }) {
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function vote() {
    if (state === "loading" || state === "done") return;

    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setState(data.alreadyVoted ? "blocked" : "error");
        setMessage(data.error || "Ошибка");
        return;
      }

      setState("done");
      setMessage(`> VOTE ACCEPTED · ${name.toUpperCase()} +1`);
      router.refresh();
    } catch {
      setState("error");
      setMessage("Не удалось отправить голос.");
    }
  }

  return (
    <div className={compact ? "vote-wrap compact" : "vote-wrap"}>
      <button className="terminal-button" onClick={vote} disabled={state === "loading" || state === "done"}>
        {state === "loading" ? "..." : state === "done" ? "ГОЛОС ПРИНЯТ" : compact ? "+1" : "ГОЛОСОВАТЬ"}
      </button>
      {message ? <div className={`terminal-message ${state}`}>{message}</div> : null}
    </div>
  );
}
