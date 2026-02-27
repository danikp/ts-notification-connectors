function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Buffer);
}

export function deepMerge(
  target: Record<string, unknown>,
  ...sources: Record<string, unknown>[]
): Record<string, unknown> {
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue;

      if (isPlainObject(value) && isPlainObject(target[key])) {
        target[key] = deepMerge(
          { ...(target[key] as Record<string, unknown>) },
          value
        );
      } else {
        target[key] = value;
      }
    }
  }
  return target;
}
