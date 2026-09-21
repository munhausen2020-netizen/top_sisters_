export const METRIKA_ID = 112874757;

export function reachGoal(
    goal,
    params = {}
) {
    if (
        typeof window === "undefined"
    ) {
        return;
    }

    if (
        typeof window.ym !==
        "function"
    ) {
        return;
    }

    try {
        window.ym(
            METRIKA_ID,
            "reachGoal",
            goal,
            params
        );
    } catch (error) {
        console.error(
            "Yandex Metrika goal error:",
            error
        );
    }
}