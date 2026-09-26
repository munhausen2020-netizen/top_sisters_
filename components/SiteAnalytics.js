"use client";

import {
    useEffect,
    useRef,
} from "react";

import {
    trackProductEvent,
} from "@/lib/product-analytics";


export default function SiteAnalytics() {
    const trackedRef =
        useRef(false);


    useEffect(() => {
        if (
            trackedRef.current
        ) {
            return;
        }


        trackedRef.current =
            true;


        trackProductEvent({
            eventName:
                "site_entry",
        });
    }, []);


    return null;
}