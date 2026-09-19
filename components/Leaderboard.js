import VoteButton from "./VoteButton";

export default function Leaderboard({ names }) {
    return (
        <section className="leaderboard">
            <div className="leaderboard-head">
                <span>ОБЩИЙ РЕЙТИНГ</span>

                <span>
          / {names.length} ИМЁН /
        </span>
            </div>

            <div className="leaderboard-list">
                {names.map((item, index) => {
                    const rank = index + 1;

                    return (
                        <div
                            className="leader-row"
                            id={`name-${item.slug}`}
                            data-name={item.name}
                            key={item.id}
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
                })}
            </div>

            <div className="ranking-end">
                &gt; КОНЕЦ РЕЙТИНГА_
            </div>
        </section>
    );
}