/**
 * Admin CLI for signed link tokens. Works against local MySQL (ACCESS_DB_* + ACCESS_JWT_SECRET +
 * ACCESS_LINK_SECRET env, see local-dev/access.env.example) or AWS (Secrets Manager via your AWS credentials).
 *
 *   npx tsx scripts/access/access-admin.ts mint   --email a@x.com [--ticker "AAPL US"] [--base-url URL] [--issued YYYY-MM-DD]
 *   npx tsx scripts/access/access-admin.ts mint   --all [--csv out.csv]                 # cutover mailing list
 *   npx tsx scripts/access/access-admin.ts revoke --email a@x.com [--keep-today]       # sets persons.tokens_valid_after
 *   npx tsx scripts/access/access-admin.ts status --email a@x.com                      # tokens_valid_after
 *
 * Minting writes nothing (tokens are HMAC-signed and deterministic per person + UTC day).
 * --issued backdates the issue day (testing rotation/expiry). Output/CSV are live credentials.
 */
import { writeFileSync } from 'node:fs';
import { getAccessDeps } from '../../functions/access-shared/runtime';
import { buildLink, mintToken, revokePersonLinks } from '../../functions/access-shared/service';
import { normalizeEmail } from '../../functions/access-shared/tokens';

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = { _: argv[0] };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._ as string;
  const deps = await getAccessDeps();
  const base = (args['base-url'] as string) || deps.config.appBaseUrl;
  const ticker = (args.ticker as string) || null;
  const one = async () => {
    const p = await deps.repo.findPersonByEmail(normalizeEmail(String(args.email || '')));
    if (!p) throw new Error(`No person with email ${args.email}`);
    return p;
  };

  try {
    if (cmd === 'mint') {
      const at = args.issued ? new Date(`${args.issued}T12:00:00Z`) : undefined;
      if (at && Number.isNaN(at.getTime())) throw new Error('--issued must be YYYY-MM-DD');
      const persons = args.all ? await deps.repo.listPersons() : [await one()];
      const rows: string[] = ['email,link'];
      for (const p of persons) {
        const m = mintToken(deps, p.id, at);
        const link = buildLink(base, m.token, ticker);
        rows.push(`${JSON.stringify(p.email)},${JSON.stringify(link)}`);
        if (!args.csv) console.log(`${p.email}\n  ${link}\n  valid until ${m.expiresAt.toISOString()}`);
      }
      if (args.csv) {
        writeFileSync(String(args.csv), rows.join('\n') + '\n', { mode: 0o600 });
        console.log(`Wrote ${rows.length - 1} links to ${args.csv} (mode 600). Contains live credentials - delete after use.`);
      }
    } else if (cmd === 'revoke') {
      const p = await one();
      const r = await revokePersonLinks(deps, p.id, { keepToday: Boolean(args['keep-today']) });
      console.log(`tokens_valid_after=${r.validAfter.toISOString()} for ${p.email}. ` +
        (args['keep-today'] ? 'Links issued before today are dead; today\'s still work. '
                            : 'All current links (incl. today\'s) are dead; new links work from the next UTC day. ') +
        `Existing browser sessions keep working until they expire (<= ${deps.config.sessionTtlSec}s).`);
    } else if (cmd === 'status') {
      const p = await one();
      const [rows] = await (deps.repo as any).pool.execute(
        'SELECT tokens_valid_after FROM persons WHERE id = ?', [p.id]);
      console.table(rows);
    } else {
      console.error('Usage: access-admin.ts <mint|revoke|status> [options]  (see header of this file)');
      process.exitCode = 2;
    }
  } finally {
    await deps.close();
  }
}

main().catch((e) => { console.error(String(e?.message || e)); process.exit(1); });
