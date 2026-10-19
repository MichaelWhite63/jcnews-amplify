import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { AccessRepo, PersonRow } from './repo';

const PERSON_SELECT = `SELECT p.id, p.email, p.accessList, p.tokens_valid_after, d.name AS departmentName
  FROM persons p LEFT JOIN departments d ON d.id = p.fkDepartmentId`;

function toPerson(r: RowDataPacket): PersonRow {
  return {
    id: Number(r.id), email: r.email, accessList: r.accessList, departmentName: r.departmentName ?? null,
    tokensValidAfter: r.tokens_valid_after ? new Date(r.tokens_valid_after) : null,
  };
}

/**
 * MySQL implementation. The pool MUST be created with `timezone: 'Z'` so DATETIME values
 * are written and read as UTC (see createAccessPool in runtime.ts).
 */
export class MysqlAccessRepo implements AccessRepo {
  constructor(private pool: Pool) {}

  async findPersonById(id: number) {
    const [rows] = await this.pool.execute<RowDataPacket[]>(`${PERSON_SELECT} WHERE p.id = ? LIMIT 1`, [id]);
    return rows.length ? toPerson(rows[0]) : null;
  }

  async findPersonByEmail(email: string) {
    const [rows] = await this.pool.execute<RowDataPacket[]>(`${PERSON_SELECT} WHERE p.email = ? LIMIT 1`, [email]);
    return rows.length ? toPerson(rows[0]) : null;
  }

  async listPersons() {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `${PERSON_SELECT} WHERE p.email IS NOT NULL AND p.email <> '' ORDER BY p.id`);
    return rows.map(toPerson);
  }

  async setTokensValidAfter(personId: number, at: Date | null) {
    const [res] = await this.pool.execute<ResultSetHeader>(
      `UPDATE persons SET tokens_valid_after = ? WHERE id = ?`, [at, personId]);
    return res.affectedRows;
  }
}
