"use client";

import PaidVoteButton from "@/components/PaidVoteButton";

export default function VoteButton({
                                       nameId,
                                       name,
                                       compact = false,
                                   }) {
    return (
        <PaidVoteButton
            nameId={nameId}
            name={name}
            compact={compact}
        />
    );
}