function createId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }


    return [
        Date.now(),
        Math.random()
            .toString(36)
            .slice(2),
    ].join("-");
}


export function getVisitorId() {
    if (
        typeof window === "undefined"
    ) {
        return null;
    }


    const key =
        "womenname_visitor_id";


    let visitorId =
        window.localStorage.getItem(
            key
        );


    if (!visitorId) {
        visitorId =
            createId();


        window.localStorage.setItem(
            key,
            visitorId
        );
    }


    return visitorId;
}


export function getSessionId() {
    if (
        typeof window === "undefined"
    ) {
        return null;
    }


    const key =
        "womenname_session_id";


    let sessionId =
        window.sessionStorage.getItem(
            key
        );


    if (!sessionId) {
        sessionId =
            createId();


        window.sessionStorage.setItem(
            key,
            sessionId
        );
    }


    return sessionId;
}


export async function trackProductEvent({
                                            eventName,
                                            nameId = null,
                                            name = null,
                                            amountRub = null,
                                            votesCount = null,
                                            paymentId = null,
                                        }) {
    if (
        typeof window === "undefined"
    ) {
        return false;
    }


    try {
        const response =
            await fetch(
                "/api/analytics/event",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    keepalive: true,

                    body:
                        JSON.stringify({
                            eventName,

                            visitorId:
                                getVisitorId(),

                            sessionId:
                                getSessionId(),

                            nameId,

                            name,

                            amountRub,

                            votesCount,

                            paymentId,

                            pageUrl:
                            window.location.href,
                        }),
                }
            );


        if (!response.ok) {
            console.error(
                "Product analytics request failed:",
                eventName,
                response.status
            );

            return false;
        }


        return true;

    } catch (error) {
        console.error(
            "Product analytics tracking error:",
            eventName,
            error
        );

        return false;
    }
}