import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getClientIp, getMoscowDateString, hashValue } from "@/lib/vote-id";

export async function POST(request) {
  try {
    const body = await request.json();
    const nameId = body?.nameId;

    if (!nameId) {
      return NextResponse.json({ error: "nameId is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const headerStore = await headers();

    let deviceId = cookieStore.get("name_top_device")?.value;
    let shouldSetCookie = false;

    if (!deviceId) {
      deviceId = crypto.randomUUID();
      shouldSetCookie = true;
    }

    const ip = getClientIp(headerStore);
    const userAgent = headerStore.get("user-agent") || "unknown";
    const voteDate = getMoscowDateString();

    const voterHash = hashValue(`${deviceId}|${ip}|${userAgent}`);
    const ipHash = hashValue(ip);

    const supabase = getSupabaseAdmin();

    // Soft anti-abuse cap: no more than 80 successful votes per IP per Moscow day.
    // This is intentionally generous so school / office Wi-Fi does not block normal users.
    const { count: ipVotes, error: ipCountError } = await supabase
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("vote_date", voteDate);

    if (ipCountError) throw ipCountError;

    if ((ipVotes || 0) >= 80) {
      return NextResponse.json(
        { error: "С этого подключения сегодня слишком много голосов." },
        { status: 429 }
      );
    }

    const { data, error } = await supabase.rpc("cast_daily_vote", {
      p_name_id: nameId,
      p_voter_hash: voterHash,
      p_ip_hash: ipHash,
      p_vote_date: voteDate,
    });

    if (error) {
      if (error.code === "23505" || String(error.message).includes("votes_voter_day_unique")) {
        return NextResponse.json(
          { error: "Ты уже голосовал сегодня.", alreadyVoted: true },
          { status: 409 }
        );
      }
      throw error;
    }

    const response = NextResponse.json({ ok: true, result: data?.[0] || data });

    if (shouldSetCookie) {
      response.cookies.set("name_top_device", deviceId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось принять голос." }, { status: 500 });
  }
}
