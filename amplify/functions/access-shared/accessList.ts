/** persons.accessList is JSON: [{"Source":"DowJones","Permission":true}, ...] */
export function parseAllowedSources(accessList: unknown): string[] {
  let list: any = accessList;
  if (typeof list === 'string') {
    try { list = JSON.parse(list || '[]'); } catch { return []; }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((i) => i && i.Permission === true && typeof i.Source === 'string')
    .map((i) => i.Source as string);
}

export function normalizeDepartment(name: string | null | undefined): string {
  const lower = (name || '').toLowerCase();
  if (lower.startsWith('option')) return 'options';
  return 'equity';
}
