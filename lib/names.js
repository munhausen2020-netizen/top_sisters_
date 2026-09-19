export function normalizeName(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru-RU")
    .replace(/^./u, (c) => c.toLocaleUpperCase("ru-RU"));
}

export function isValidFemaleName(value) {
  const name = value.trim();
  if (name.length < 2 || name.length > 32) return false;
  return /^[А-ЯЁа-яё-]+$/u.test(name);
}

export function slugifyName(value) {
  return value
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9-]+/giu, "-")
    .replace(/^-+|-+$/g, "");
}
