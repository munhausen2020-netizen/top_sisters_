import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isValidFemaleName, normalizeName, slugifyName } from "@/lib/names";

export async function POST(request) {
  try {
    const body = await request.json();
    const rawName = String(body?.name || "");

    if (!isValidFemaleName(rawName)) {
      return NextResponse.json(
        { error: "Используй только буквы русского алфавита и дефис." },
        { status: 400 }
      );
    }

    const name = normalizeName(rawName);
    const slug = slugifyName(name);
    const supabase = getSupabaseAdmin();

    const { data: existingName } = await supabase
      .from("names")
      .select("id,name,slug")
      .eq("slug", slug)
      .maybeSingle();

    if (existingName) {
      return NextResponse.json({ ok: true, alreadyExists: true, name: existingName });
    }

    const { data: existingSuggestion } = await supabase
      .from("name_suggestions")
      .select("id,status")
      .eq("normalized_name", name.toLocaleLowerCase("ru-RU"))
      .maybeSingle();

    if (existingSuggestion) {
      return NextResponse.json({ ok: true, alreadySuggested: true });
    }

    const { error } = await supabase.from("name_suggestions").insert({
      name,
      normalized_name: name.toLocaleLowerCase("ru-RU"),
      status: "pending",
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Не удалось отправить имя." }, { status: 500 });
  }
}
