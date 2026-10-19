/**
 * Persistence contract. Link tokens are stateless (HMAC-signed), so the only state is one
 * nullable column, persons.tokens_valid_after (revocation). Implemented by MysqlAccessRepo
 * and MemoryAccessRepo (tests).
 */
export interface PersonRow {
  id: number;
  email: string;
  accessList: unknown;
  departmentName: string | null;
  /** Link tokens issued (UTC day start) before this instant are rejected. */
  tokensValidAfter: Date | null;
}

export interface AccessRepo {
  findPersonById(id: number): Promise<PersonRow | null>;
  findPersonByEmail(email: string): Promise<PersonRow | null>;
  listPersons(): Promise<PersonRow[]>;
  setTokensValidAfter(personId: number, at: Date | null): Promise<number>;
}

export class MemoryAccessRepo implements AccessRepo {
  persons = new Map<number, PersonRow>();
  reads = 0;

  addPerson(p: Omit<PersonRow, 'tokensValidAfter'> & { tokensValidAfter?: Date | null }) {
    const row = { tokensValidAfter: null, ...p };
    this.persons.set(p.id, row);
    return row;
  }
  async findPersonById(id: number) { this.reads++; return this.persons.get(id) ?? null; }
  async findPersonByEmail(email: string) {
    this.reads++;
    return [...this.persons.values()].find((p) => p.email.toLowerCase() === email.toLowerCase()) ?? null;
  }
  async listPersons() { return [...this.persons.values()]; }
  async setTokensValidAfter(personId: number, at: Date | null) {
    const p = this.persons.get(personId);
    if (!p) return 0;
    p.tokensValidAfter = at;
    return 1;
  }
}
