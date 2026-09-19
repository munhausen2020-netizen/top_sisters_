import Link from "next/link";
import VoteButton from "./VoteButton";

export default function Leaderboard({ names, title = "СЕЙЧАС В ЛИДЕРАХ", limit = 10 }) {
  return (
    <section className="leaderboard">
      <div className="leaderboard-head">
        <span>{title}</span>
        <span>/ ТОП-{Math.min(limit, names.length)} /</span>
      </div>

      <div className="leaderboard-list">
        {names.slice(0, limit).map((item, index) => (
          <div className="leader-row" key={item.id}>
            <span className="rank">{String(index + 1).padStart(2, "0")}</span>
            <Link href={`/name/${item.slug}`} className="leader-name">
              {item.name}
            </Link>
            <span className="dots" aria-hidden>................................</span>
            <span className="score">{Number(item.score || 0).toLocaleString("ru-RU")}</span>
            <VoteButton nameId={item.id} name={item.name} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
