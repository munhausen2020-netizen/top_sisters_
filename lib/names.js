export function normalizeName(
    value
) {
  return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase(
          "ru-RU"
      )
      .split(/([ -])/u)
      .map((part) => {
        if (
            part === " " ||
            part === "-"
        ) {
          return part;
        }

        if (!part) {
          return part;
        }

        return (
            part
                .charAt(0)
                .toLocaleUpperCase(
                    "ru-RU"
                ) +
            part
                .slice(1)
                .toLocaleLowerCase(
                    "ru-RU"
                )
        );
      })
      .join("");
}

export function normalizeNameForComparison(
    value
) {
  return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase(
          "ru-RU"
      )
      .replace(/ё/g, "е");
}

export function isValidFemaleName(
    value
) {
  const name =
      String(value || "")
          .trim()
          .replace(/\s+/g, " ");

  if (
      name.length < 2 ||
      name.length > 40
  ) {
    return false;
  }

  /*
   * Разрешаем:
   * Аделина
   * Анна-Мария
   * Нур Айша
   *
   * Цифры, emoji и спецсимволы
   * сюда не проходят.
   */
  return /^[А-ЯЁа-яё]+(?:[ -][А-ЯЁа-яё]+)*$/u.test(
      name
  );
}

export function slugifyName(
    value
) {
  return normalizeNameForComparison(
      value
  )
      .replace(
          /[^а-яa-z0-9]+/giu,
          "-"
      )
      .replace(
          /^-+|-+$/g,
          ""
      );
}