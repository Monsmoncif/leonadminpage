/**
 * Multi-field, token-based search matcher for vehicles (Units).
 * Supports multi-word queries spanning make + model + year + plate + color + category
 * (e.g. "Lamborghini Urus MY20" matching make="Lamborghini" & model="Urus MY20").
 */
export function matchesUnitSearch(unit: any, rawQuery: string): boolean {
  const q = String(rawQuery || "").trim().toLowerCase();
  if (!q) return true;

  const fields = [
    unit?.make,
    unit?.model,
    unit?.plate,
    unit?.vin,
    unit?.color,
    unit?.year != null ? String(unit.year) : "",
    unit?.category,
    unit?.fuelType,
    unit?.transmission,
    unit?.owner,
    unit?.status,
  ]
    .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
    .map((v) => String(v).trim().toLowerCase());

  if (fields.length === 0) return false;

  const haystack = fields.join(" ").replace(/\s+/g, " ");
  const haystackCompact = haystack.replace(/[\s\-_]+/g, "");

  const tokens = q.split(/\s+/).filter(Boolean);
  const allTokensMatch = tokens.every((token) => {
    const compactToken = token.replace(/[\s\-_]+/g, "");
    return (
      haystack.includes(token) ||
      (compactToken.length > 0 && haystackCompact.includes(compactToken))
    );
  });

  if (allTokensMatch) return true;

  const compactQuery = q.replace(/[\s\-_]+/g, "");
  return compactQuery.length > 0 && haystackCompact.includes(compactQuery);
}
