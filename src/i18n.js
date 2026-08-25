export function createMessageFormatter(catalog, getLocale, fallbackLocale = 'en') {
  const fallback = catalog[fallbackLocale];
  if (!fallback) throw new Error(`Missing fallback locale: ${fallbackLocale}`);
  const fallbackKeys = Object.keys(fallback).sort();
  for (const [locale, messages] of Object.entries(catalog)) {
    const missing = fallbackKeys.filter(key => !(key in messages));
    const extra = Object.keys(messages).filter(key => !(key in fallback)).sort();
    if (missing.length || extra.length) {
      const details = [
        missing.length ? `missing: ${missing.join(', ')}` : '',
        extra.length ? `extra: ${extra.join(', ')}` : ''
      ].filter(Boolean).join('; ');
      throw new Error(`${locale} message catalog mismatch (${details})`);
    }
  }

  const locale = () => (catalog[getLocale()] ? getLocale() : fallbackLocale);
  const interpolate = (template, variables) => Object.entries(variables).reduce(
    (value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)),
    template
  );

  function message(key, variables = {}) {
    const activeLocale = locale();
    let resolvedKey = key;
    if (Number.isFinite(Number(variables.count))) {
      const category = new Intl.PluralRules(activeLocale).select(Number(variables.count));
      if (`${key}_${category}` in fallback) resolvedKey = `${key}_${category}`;
    }
    const template = catalog[activeLocale][resolvedKey] ?? fallback[resolvedKey];
    if (template === undefined) throw new Error(`Unknown message key: ${resolvedKey}`);
    return interpolate(template, variables);
  }

  return Object.freeze({
    locale,
    message,
    number: (value, options = {}) => new Intl.NumberFormat(locale(), options).format(value),
    date(value, options = {}) {
      const date = value instanceof Date ? value : new Date(value);
      return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(locale(), options).format(date) : '';
    },
    unit: (value, unit, options = {}) => new Intl.NumberFormat(
      locale(),
      { style: 'unit', unit, ...options }
    ).format(value),
    keys: Object.freeze(fallbackKeys)
  });
}
