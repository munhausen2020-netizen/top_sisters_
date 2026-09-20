import {
  NextResponse,
} from "next/server";

import {
  headers,
} from "next/headers";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

import {
  getClientIp,
  hashValue,
} from "@/lib/vote-id";

import {
  isValidFemaleName,
  normalizeName,
  normalizeNameForComparison,
  slugifyName,
} from "@/lib/names";

const OPENAI_MODEL =
    "gpt-5.6-luna";

const MAX_NAME_ATTEMPTS_PER_DAY =
    10;

function getTodayUtc() {
  return new Date()
      .toISOString()
      .slice(0, 10);
}

function extractResponseText(
    response
) {
  if (
      typeof response?.output_text ===
      "string"
  ) {
    return response.output_text;
  }

  const outputs =
      response?.output || [];

  for (const output of outputs) {
    const content =
        output?.content || [];

    for (const part of content) {
      if (
          part?.type ===
          "output_text" &&
          typeof part?.text ===
          "string"
      ) {
        return part.text;
      }
    }
  }

  return "";
}

function parseAiJson(text) {
  const cleaned = String(
      text || ""
  )
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function validateWithAi(
    name
) {
  const apiKey =
      process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
        "OPENAI_API_KEY is missing"
    );
  }

  const prompt = `
Ты модерируешь рейтинг женских личных имён.

Нужно определить, является ли строка реальным женским личным именем.

Имя пользователя:
"${name}"

Учитывай:
- русские имена;
- татарские;
- башкирские;
- чеченские;
- дагестанские;
- кавказские;
- тюркские;
- арабские;
- мусульманские;
- европейские;
- азиатские;
- другие реальные иностранные женские имена.

Не отклоняй имя только потому, что оно редкое.

ACCEPT:
реальное женское личное имя или распространённый самостоятельный вариант женского имени.

REJECT:
мужское имя;
фамилия;
никнейм;
случайный набор символов;
бранное слово;
название бренда;
город;
предмет;
мем;
фраза;
явный спам.

REVIEW:
ты не уверен, существует ли такое женское имя.

Верни ТОЛЬКО JSON без markdown:

{
  "decision": "accept" | "reject" | "review",
  "canonical_name": "нормализованное имя",
  "confidence": число от 0 до 1,
  "reason": "короткая техническая причина"
}
`;

  const response =
      await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",

            headers: {
              Authorization:
                  `Bearer ${apiKey}`,

              "Content-Type":
                  "application/json",
            },

            body: JSON.stringify({
              model:
              OPENAI_MODEL,

              input: prompt,

              max_output_tokens:
                  180,
            }),
          }
      );

  if (!response.ok) {
    const errorText =
        await response.text();

    console.error(
        "OpenAI error:",
        response.status,
        errorText
    );

    throw new Error(
        "AI validation failed"
    );
  }

  const responseJson =
      await response.json();

  const text =
      extractResponseText(
          responseJson
      );

  const parsed =
      parseAiJson(text);

  if (!parsed) {
    console.error(
        "Could not parse AI response:",
        text
    );

    return {
      decision: "review",
      canonical_name: name,
      confidence: 0,
      reason:
          "invalid_ai_response",
    };
  }

  const decision =
      ["accept", "reject", "review"]
          .includes(
              parsed.decision
          )
          ? parsed.decision
          : "review";

  return {
    decision,

    canonical_name:
        String(
            parsed.canonical_name ||
            name
        ),

    confidence:
        Number(
            parsed.confidence || 0
        ),

    reason:
        String(
            parsed.reason ||
            ""
        ).slice(0, 250),
  };
}

export async function POST(
    request
) {
  try {
    const body =
        await request.json();

    const rawName =
        String(
            body?.name || ""
        );

    if (
        !isValidFemaleName(
            rawName
        )
    ) {
      return NextResponse.json(
          {
            error:
                "Введите имя буквами без цифр и специальных символов.",
          },
          {
            status: 400,
          }
      );
    }

    const name =
        normalizeName(
            rawName
        );

    const comparisonName =
        normalizeNameForComparison(
            name
        );

    const slug =
        slugifyName(
            name
        );

    const supabase =
        getSupabaseAdmin();

    /*
     * --------------------------------------------------
     * 1. Повторная проверка существующего имени
     * --------------------------------------------------
     */

    const {
      data: existingName,
      error:
          existingNameError,
    } =
        await supabase
            .from("names")
            .select(
                "id,name,slug"
            )
            .eq("slug", slug)
            .maybeSingle();

    if (
        existingNameError
    ) {
      throw existingNameError;
    }

    if (existingName) {
      return NextResponse.json({
        ok: true,
        alreadyExists: true,
        name: existingName,
      });
    }

    /*
     * --------------------------------------------------
     * 2. Rate limit добавления имён
     * --------------------------------------------------
     */

    const headerStore =
        await headers();

    const ip =
        getClientIp(
            headerStore
        );

    const ipHash =
        hashValue(ip);

    const today =
        getTodayUtc();

    const {
      count:
          attemptsToday,
      error:
          attemptsError,
    } =
        await supabase
            .from(
                "name_suggestions"
            )
            .select(
                "id",
                {
                  count: "exact",
                  head: true,
                }
            )
            .eq(
                "ip_hash",
                ipHash
            )
            .eq(
                "created_date",
                today
            );

    if (attemptsError) {
      throw attemptsError;
    }

    if (
        (attemptsToday || 0) >=
        MAX_NAME_ATTEMPTS_PER_DAY
    ) {
      return NextResponse.json(
          {
            error:
                "Сегодня с этого подключения добавлено слишком много имён.",
          },
          {
            status: 429,
          }
      );
    }

    /*
     * --------------------------------------------------
     * 3. Проверяем, не модерировали ли это имя раньше
     * --------------------------------------------------
     */

    const {
      data:
          previousSuggestion,
      error:
          previousSuggestionError,
    } =
        await supabase
            .from(
                "name_suggestions"
            )
            .select(
                "id,status,canonical_name,reason"
            )
            .eq(
                "normalized_name",
                comparisonName
            )
            .maybeSingle();

    if (
        previousSuggestionError
    ) {
      throw previousSuggestionError;
    }

    if (
        previousSuggestion
            ?.status ===
        "rejected"
    ) {
      return NextResponse.json(
          {
            ok: true,
            decision:
                "rejected",
            message:
                "НЕ УДАЛОСЬ ПОДТВЕРДИТЬ ИМЯ",
          }
      );
    }

    if (
        previousSuggestion
            ?.status ===
        "pending"
    ) {
      return NextResponse.json({
        ok: true,
        decision: "review",
      });
    }

    /*
     * --------------------------------------------------
     * 4. Проверка через ИИ
     * --------------------------------------------------
     */

    const aiResult =
        await validateWithAi(
            name
        );

    /*
     * --------------------------------------------------
     * 5. Очень высокая уверенность → добавляем автоматически
     *
     * Низкая уверенность даже при accept → manual review.
     * --------------------------------------------------
     */

    const autoApprove =
        aiResult.decision ===
        "accept" &&
        aiResult.confidence >=
        0.86;

    if (autoApprove) {
      const canonicalName =
          normalizeName(
              aiResult
                  .canonical_name ||
              name
          );

      if (
          !isValidFemaleName(
              canonicalName
          )
      ) {
        aiResult.decision =
            "review";
      } else {
        const canonicalSlug =
            slugifyName(
                canonicalName
            );

        /*
         * На случай, если AI привёл имя
         * к уже существующему каноническому варианту.
         */

        const {
          data:
              canonicalExisting,
          error:
              canonicalExistingError,
        } =
            await supabase
                .from("names")
                .select(
                    "id,name,slug"
                )
                .eq(
                    "slug",
                    canonicalSlug
                )
                .maybeSingle();

        if (
            canonicalExistingError
        ) {
          throw canonicalExistingError;
        }

        if (
            canonicalExisting
        ) {
          return NextResponse.json({
            ok: true,
            alreadyExists:
                true,
            name:
            canonicalExisting,
          });
        }

        /*
         * Сначала создаём/обновляем запись модерации.
         */

        const {
          error:
              moderationError,
        } =
            await supabase
                .from(
                    "name_suggestions"
                )
                .upsert(
                    {
                      name,

                      normalized_name:
                      comparisonName,

                      canonical_name:
                      canonicalName,

                      status:
                          "approved",

                      confidence:
                      aiResult.confidence,

                      reason:
                      aiResult.reason,

                      ip_hash:
                      ipHash,

                      created_date:
                      today,

                      reviewed_at:
                          new Date()
                              .toISOString(),
                    },
                    {
                      onConflict:
                          "normalized_name",
                    }
                );

        if (
            moderationError
        ) {
          throw moderationError;
        }

        /*
         * Добавляем имя.
         */

        const {
          data:
              insertedName,
          error:
              insertError,
        } =
            await supabase
                .from("names")
                .insert({
                  name:
                  canonicalName,

                  slug:
                  canonicalSlug,
                })
                .select(
                    "id,name,slug"
                )
                .single();

        /*
         * Если два человека одновременно
         * добавили одно имя — просто возвращаем
         * уже созданную запись.
         */

        if (
            insertError?.code ===
            "23505"
        ) {
          const {
            data:
                raceExisting,
          } =
              await supabase
                  .from("names")
                  .select(
                      "id,name,slug"
                  )
                  .eq(
                      "slug",
                      canonicalSlug
                  )
                  .single();

          return NextResponse.json({
            ok: true,
            alreadyExists:
                true,
            name:
            raceExisting,
          });
        }

        if (insertError) {
          throw insertError;
        }

        return NextResponse.json({
          ok: true,

          decision:
              "approved",

          name:
          insertedName,
        });
      }
    }

    /*
     * --------------------------------------------------
     * 6. REJECT
     * --------------------------------------------------
     */

    if (
        aiResult.decision ===
        "reject"
    ) {
      const {
        error:
            rejectedError,
      } =
          await supabase
              .from(
                  "name_suggestions"
              )
              .upsert(
                  {
                    name,

                    normalized_name:
                    comparisonName,

                    canonical_name:
                        null,

                    status:
                        "rejected",

                    confidence:
                    aiResult.confidence,

                    reason:
                    aiResult.reason,

                    ip_hash:
                    ipHash,

                    created_date:
                    today,

                    reviewed_at:
                        new Date()
                            .toISOString(),
                  },
                  {
                    onConflict:
                        "normalized_name",
                  }
              );

      if (rejectedError) {
        throw rejectedError;
      }

      return NextResponse.json({
        ok: true,

        decision:
            "rejected",

        message:
            "НЕ УДАЛОСЬ ПОДТВЕРДИТЬ ИМЯ",
      });
    }

    /*
     * --------------------------------------------------
     * 7. Всё сомнительное → ручная проверка
     * --------------------------------------------------
     */

    const {
      error:
          reviewError,
    } =
        await supabase
            .from(
                "name_suggestions"
            )
            .upsert(
                {
                  name,

                  normalized_name:
                  comparisonName,

                  canonical_name:
                      normalizeName(
                          aiResult
                              .canonical_name ||
                          name
                      ),

                  status:
                      "pending",

                  confidence:
                  aiResult.confidence,

                  reason:
                  aiResult.reason,

                  ip_hash:
                  ipHash,

                  created_date:
                  today,
                },
                {
                  onConflict:
                      "normalized_name",
                }
            );

    if (reviewError) {
      throw reviewError;
    }

    return NextResponse.json({
      ok: true,
      decision: "review",
    });
  } catch (error) {
    console.error(
        "Name moderation error:",
        error
    );

    return NextResponse.json(
        {
          error:
              "Не удалось проверить имя.",
        },
        {
          status: 500,
        }
    );
  }
}