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

const AUTO_APPROVE_CONFIDENCE =
    0.7;

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
      .replace(
          /^```json\s*/i,
          ""
      )
      .replace(
          /^```\s*/i,
          ""
      )
      .replace(
          /\s*```$/i,
          ""
      );

  try {
    return JSON.parse(
        cleaned
    );
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

Пользователь предлагает имя:
"${name}"

Твоя задача — определить, можно ли считать эту строку реальным женским личным именем.

ОЧЕНЬ ВАЖНО:
не отправляй имя на REVIEW только потому, что оно редкое, региональное или тебе плохо знакомо.

Особенно учитывай реальные имена следующих групп:
- русские;
- татарские;
- башкирские;
- чеченские;
- ингушские;
- дагестанские;
- аварские;
- даргинские;
- лезгинские;
- кумыкские;
- лакские;
- табасаранские;
- азербайджанские;
- казахские;
- киргизские;
- узбекские;
- таджикские;
- турецкие;
- арабские;
- персидские;
- мусульманские;
- кавказские;
- тюркские;
- европейские;
- азиатские;
- африканские;
- другие реальные иностранные женские имена.

Если имя редкое, но выглядит как правдоподобное реальное женское имя и ты считаешь, что оно действительно используется как личное имя — выбирай ACCEPT.

ACCEPT:
- реальное женское личное имя;
- редкое региональное женское имя;
- иностранное женское имя;
- традиционное этническое женское имя;
- распространённый самостоятельный вариант женского имени.

REJECT:
- явно мужское имя;
- фамилия;
- отчество;
- никнейм;
- случайный набор символов;
- бранное слово;
- оскорбление;
- название бренда;
- название города;
- предмет;
- животное;
- мем;
- фраза;
- спам;
- бессмысленный набор букв.

REVIEW:
используй только если действительно невозможно понять,
является ли это реальным женским именем.

Если у тебя есть сомнение между ACCEPT и REVIEW,
но строка выглядит как нормальное личное имя,
предпочитай ACCEPT.

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
      [
        "accept",
        "reject",
        "review",
      ].includes(
          parsed.decision
      )
          ? parsed.decision
          : "review";

  const confidence =
      Number(
          parsed.confidence || 0
      );

  return {
    decision,

    canonical_name:
        String(
            parsed.canonical_name ||
            name
        ),

    confidence:
        Number.isFinite(
            confidence
        )
            ? confidence
            : 0,

    reason:
        String(
            parsed.reason || ""
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
     * ==================================================
     * 1. Проверяем, есть ли имя уже сейчас
     * ==================================================
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
            .eq(
                "slug",
                slug
            )
            .maybeSingle();

    if (
        existingNameError
    ) {
      throw existingNameError;
    }

    if (existingName) {
      return NextResponse.json({
        ok: true,

        alreadyExists:
            true,

        name:
        existingName,
      });
    }

    /*
     * ==================================================
     * 2. Rate limit
     * ==================================================
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

    if (
        attemptsError
    ) {
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
     * ==================================================
     * 3. Проверяем прошлую модерацию
     * ==================================================
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
                "id,status,canonical_name,reason,confidence"
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

    /*
     * Если раньше уже отклонили —
     * не тратим повторно запрос к ИИ.
     */
    if (
        previousSuggestion
            ?.status ===
        "rejected"
    ) {
      return NextResponse.json({
        ok: true,

        decision:
            "rejected",

        message:
            "НЕ УДАЛОСЬ ПОДТВЕРДИТЬ ИМЯ",
      });
    }

    /*
     * Если имя уже висит на ручной проверке.
     */
    if (
        previousSuggestion
            ?.status ===
        "pending"
    ) {
      return NextResponse.json({
        ok: true,

        decision:
            "review",
      });
    }

    /*
     * ==================================================
     * 4. AI moderation
     * ==================================================
     */

    const aiResult =
        await validateWithAi(
            name
        );

    /*
     * ==================================================
     * 5. ACCEPT
     * ==================================================
     */

    const shouldAutoApprove =
        aiResult.decision ===
        "accept" &&
        aiResult.confidence >=
        AUTO_APPROVE_CONFIDENCE;

    if (
        shouldAutoApprove
    ) {
      const canonicalName =
          normalizeName(
              aiResult
                  .canonical_name ||
              name
          );

      /*
       * На всякий случай ещё раз
       * валидируем то, что вернул AI.
       */
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
         * AI мог привести редкий вариант
         * к каноническому имени,
         * которое уже есть в базе.
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
         * Записываем результат AI-модерации.
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
         * Добавляем имя в основной рейтинг.
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
         * Race condition:
         * два пользователя одновременно
         * добавили одно имя.
         */
        if (
            insertError?.code ===
            "23505"
        ) {
          const {
            data:
                raceExisting,
            error:
                raceError,
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

          if (
              raceError
          ) {
            throw raceError;
          }

          return NextResponse.json({
            ok: true,

            alreadyExists:
                true,

            name:
            raceExisting,
          });
        }

        if (
            insertError
        ) {
          throw insertError;
        }

        return NextResponse.json({
          ok: true,

          decision:
              "approved",

          name:
          insertedName,

          confidence:
          aiResult.confidence,
        });
      }
    }

    /*
     * ==================================================
     * 6. REJECT
     * ==================================================
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

      if (
          rejectedError
      ) {
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
     * ==================================================
     * 7. ACCEPT, но уверенность ниже 0.70
     *    или настоящий REVIEW
     * ==================================================
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

    if (
        reviewError
    ) {
      throw reviewError;
    }

    return NextResponse.json({
      ok: true,

      decision:
          "review",

      confidence:
      aiResult.confidence,
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