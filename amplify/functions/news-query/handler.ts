import type { Schema } from '../../data/resource';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { sessionIdentity } from '../access-shared/identity';

type TickerNewsHandler = Schema['getTickerNews']['functionHandler'];
type IndustryHandler = Schema['getCompaniesByIndustry']['functionHandler'];

interface SecurityRow extends RowDataPacket {
  ticker: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
}

interface NewsRow extends RowDataPacket {
  id: number;
  ticker: string;
  headline: string;
  summary: string | null;
  publishedDate: Date;
  source: string | null;
  url: string | null;
}

// ── Dow Jones story-chaining fields ──────────────────────────────────────────
// Columns exist on every news row; they are NULL on non-DJ rows (and absent from the API result then).
const DJ_COLUMNS =
  'dj_accession_number, dj_seq, dj_take_id, dj_hot, dj_corrected, dj_temp, dj_display_time, dj_codes';

// dj_display_time is stored UTC (DATETIME, no zone); the mysql2 connection returns it as a Date in the
// Lambda's local zone (UTC), same as createdAt.
const djFields = (row: any) => ({
  djAccessionNumber: row.dj_accession_number ?? null,
  djSeq:             row.dj_seq ?? null,
  djTakeId:          row.dj_take_id ?? null,
  djHot:             row.dj_hot == null ? null : !!row.dj_hot,
  djCorrected:       row.dj_corrected == null ? null : !!row.dj_corrected,
  djTemp:            row.dj_temp == null ? null : !!row.dj_temp,
  djDisplayTime:     row.dj_display_time ? new Date(row.dj_display_time).toISOString() : null,
  djCodes:           row.dj_codes ?? null,
});

// publishNewArticle: pass the optional dj fields through unchanged (undefined -> null).
const djPassthrough = (a: any) => ({
  djAccessionNumber: a.djAccessionNumber ?? null,
  djSeq:             a.djSeq ?? null,
  djTakeId:          a.djTakeId ?? null,
  djHot:             a.djHot ?? null,
  djCorrected:       a.djCorrected ?? null,
  djTemp:            a.djTemp ?? null,
  djDisplayTime:     a.djDisplayTime ?? null,
  djCodes:           a.djCodes ?? null,
});

const secretsClient = new SecretsManagerClient({ region: 'us-east-2' });
let secretsResolved = false;

async function resolveDBCredentials(): Promise<void> {
  if (secretsResolved) return;
  const secretName = process.env.SECRET_NAME || 'in4m/rds/credentials';
  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretName }));
  const secret = JSON.parse(response.SecretString || '{}');
  process.env.DB_HOST     = secret.host;
  process.env.DB_PORT     = secret.port?.toString() || '3306';
  process.env.SQL_DATABASE = secret.dbname;
  process.env.SQL_USER    = secret.username;
  process.env.SQL_PASSWORD = secret.password;
  secretsResolved = true;
}

export const handler = async (event: any) => {
  if (event.typeName === 'Subscription' ||
      event.fieldName === 'onNewArticle' ||
      event.fieldName === 'onTickerOfInterest') {
    return null;
  }

  await resolveDBCredentials();

  console.log('ENV CHECK:', {
    DB_HOST:      process.env.DB_HOST      || '*** NOT SET ***',
    DB_PORT:      process.env.DB_PORT      || '*** NOT SET ***',
    SQL_DATABASE: process.env.SQL_DATABASE || '*** NOT SET ***',
    SQL_USER:     process.env.SQL_USER     || '*** NOT SET ***',
    SQL_PASSWORD: process.env.SQL_PASSWORD ? '*** SET ***' : '*** NOT SET ***',
  });

  const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
    connectTimeout: 10000,
  };

  // Browser sessions (Lambda authorizer): identity comes from the verified session,
  // never from client arguments. Guest-IAM callers keep the legacy behaviour (phase 1).
  const who = sessionIdentity(event);
  if (who) {
    event.arguments = { ...(event.arguments || {}) };
    if ('email' in event.arguments || event.fieldName === 'getUserProfile' || event.fieldName === 'notifyTickerOfInterest') {
      event.arguments.email = who.email;
    }
    if (event.fieldName === 'getTickerNews' || event.fieldName === 'getMacroNews' || event.fieldName === 'getStoryTakes') {
      event.arguments.allowedSources = who.allowedSources; // [] => no rows (default deny)
    }
  }

  switch (event.fieldName) {
    case 'getCompanyProfile':        return handleGetCompanyProfile(event, dbConfig);
    case 'getUserProfile':           return handleGetUserProfile(event, dbConfig);
    case 'getCompaniesByIndustry':   return handleGetCompaniesByIndustry(event, dbConfig);
    case 'getMacroNews':             return handleGetMacroNews(event, dbConfig);
    case 'publishNewArticle':        return handlePublishNewArticle(event);
    case 'notifyTickerOfInterest':   return handleNotifyTickerOfInterest(event);
    case 'getTickerNews':            return handleGetTickerNews(event, dbConfig);
    case 'getStoryTakes':            return handleGetStoryTakes(event, dbConfig);
    default:
      console.error('Unknown fieldName:', event.fieldName);
      throw new Error(`Unknown operation: ${event.fieldName}`);
  }
};

const handlePublishNewArticle = (event: any) => {
  const a = event.arguments;
  return {
    id:            a.id            ?? 0,
    ticker:        a.ticker        ?? '',
    headline:      a.headline      ?? '',
    summary:       a.summary       ?? '',
    article:       a.article       ?? '',
    publishedDate: a.publishedDate ?? new Date().toISOString(),
    source:        a.source        ?? '',
    url:           a.url           ?? '',
    importance:    a.importance    ?? '',
    category:      a.category      ?? '',
    screen:        a.screen        ?? '',
    ...djPassthrough(a),
  };
};

const handleNotifyTickerOfInterest = (event: any) => {
  const { email, ticker } = event.arguments;
  return { email: email ?? '', ticker: ticker ?? '' };
};

function normalizeDepartment(name: string | null): string {
  const lower = (name || '').toLowerCase();
  if (lower.startsWith('option')) return 'options';
  if (lower.startsWith('equit'))  return 'equity';
  return 'equity';
}

const handleGetUserProfile = async (event: any, dbConfig: object) => {
  const { email } = event.arguments;
  console.log('Fetching user profile for:', email);

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute<any[]>(
      `SELECT p.accessList, d.name AS departmentName
       FROM   persons p
       LEFT JOIN departments d ON p.fkDepartmentId = d.id
       WHERE  p.email = ?
       LIMIT  1`,
      [email]
    );

    if (!rows.length) {
      console.warn('No person record found for:', email);
      return { allowedSources: [], department: 'equity' };
    }

    const accessList: { Source: string; Permission: boolean }[] =
      typeof rows[0].accessList === 'string'
        ? JSON.parse(rows[0].accessList || '[]')
        : (rows[0].accessList || []);

    const allowedSources = accessList
      .filter(item => item.Permission === true)
      .map(item => item.Source);

    const department = normalizeDepartment(rows[0].departmentName ?? null);
    console.log('Profile for', email, '— sources:', JSON.stringify(allowedSources), '| department:', department);

    return { allowedSources, department };

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { allowedSources: [], department: 'equity' };
  } finally {
    if (connection) await connection.end();
  }
};

const handleGetTickerNews = async (event: any, dbConfig: object) => {
  const { ticker, limit = 10, allowedSources } = event.arguments;
  console.log('Fetching news for ticker:', ticker, 'with limit:', limit);

  let connection;

  try {
    // Create database connection
    connection = await mysql.createConnection(dbConfig);

    // Query for security information
    const [securityRows] = await connection.execute<any[]>(
      `SELECT ticker, name, exchange, sector, industry,
              earningsDate, exDivDate, exDivAmount, shortInterest, shortRatio,
              primaryExchange, avgDailyVolume,
              cusip, isin, indexes
       FROM securities
       WHERE ticker = ?
       LIMIT 1`,
      [ticker]
    );

    const securityRow = securityRows.length > 0 ? securityRows[0] : null;

    // Calculate cutoff: go back 2 business days (skip weekends)
    const now = new Date();
    let daysBack = 0;
    let businessDaysBack = 0;
    while (businessDaysBack < 2) {
      daysBack++;
      const d = new Date(now);
      d.setDate(now.getDate() - daysBack);
      const dow = d.getDay(); // 0=Sun, 6=Sat
      if (dow !== 0 && dow !== 6) businessDaysBack++;
    }
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - daysBack);
    cutoff.setHours(0, 0, 0, 0);
    const cutoffStr = cutoff.toISOString().slice(0, 19).replace('T', ' ');
    console.log(`Cutoff date for query: ${cutoffStr}`);

    let newsRows: any[];
    if (allowedSources && allowedSources.length === 0) {
      newsRows = [];
    } else if (allowedSources && allowedSources.length > 0) {
      const placeholders = allowedSources.map(() => '?').join(', ');
      [newsRows] = await connection.query<any[]>(
        `SELECT id, ticker, title, summary, article, articleURL, source, createdAt, importance, category,
                ${DJ_COLUMNS}
         FROM news
         WHERE ticker = ?
           AND createdAt >= ?
           AND source IN (${placeholders})
         ORDER BY createdAt DESC`,
        [ticker, cutoffStr, ...allowedSources]
      );
    } else {
      [newsRows] = await connection.query<any[]>(
        `SELECT id, ticker, title, summary, article, articleURL, source, createdAt, importance, category,
                ${DJ_COLUMNS}
         FROM news
         WHERE ticker = ?
           AND createdAt >= ?
         ORDER BY createdAt DESC`,
        [ticker, cutoffStr]
      );
    }

    return {
      security: securityRow ? {
        ticker: securityRow.ticker || '',
        companyName: securityRow.name || '',
        sector: securityRow.sector || '',
        industry: securityRow.industry || '',
        exchange: securityRow.exchange || '',
        earningsDate: securityRow.earningsDate || '',
        exDivDate: securityRow.exDivDate || '',
        exDivAmount: securityRow.exDivAmount || '',
        shortInterest: securityRow.shortInterest || '',
        shortRatio: securityRow.shortRatio || '',
        primaryExchange: securityRow.primaryExchange || '',
        avgDailyVolume: securityRow.avgDailyVolume || '',
        cusip: securityRow.cusip || '',
        isin: securityRow.isin || '',
        indexes: securityRow.indexes || '',
      } : null,
      newsArticles: newsRows.map((article: any) => ({
        id: article.id || 0,
        ticker: article.ticker || '',
        headline: article.title || '',
        summary: article.summary || '',
        article: article.article || '',
        publishedDate: article.createdAt ? new Date(article.createdAt).toISOString() : new Date().toISOString(),
        source: article.source || '',
        url: article.articleURL || '',
        importance: article.importance || '',
        category: article.category || '',
        ...djFields(article),
      })),
    };

  } catch (error) {
    console.error('Database error:', error);
    throw new Error(`Failed to fetch ticker news: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// All takes of one story, oldest first. Read-only. No date cutoff (early takes of a long-running story
// must still show). allowedSources behaves as in getTickerNews: [] => no rows, undefined => no filter.
// A story is stored once per ticker it is about; collapse to one row per take (dj_take_id), keeping the
// lowest id so the result is stable.
const handleGetStoryTakes = async (event: any, dbConfig: object) => {
  const { accessionNumber, takeId, allowedSources } = event.arguments;
  if (!accessionNumber) return [];
  if (allowedSources && allowedSources.length === 0) return [];

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const sourceClause = allowedSources && allowedSources.length > 0
      ? `AND source IN (${allowedSources.map(() => '?').join(', ')})`
      : '';
    // dj_take_id is "docdate:product:seq"; keep only takes of the selected take's product.
    const [docdate, product] = typeof takeId === 'string' ? takeId.split(':') : [];
    const productClause = docdate && product && /^[A-Za-z0-9]+$/.test(docdate + product)
      ? 'AND dj_take_id LIKE ?'
      : '';
    const [rows] = await connection.query<any[]>(
      `SELECT id, ticker, title, summary, article, articleURL, source, createdAt, importance, category,
              ${DJ_COLUMNS}
       FROM news
       WHERE dj_accession_number = ?
         ${productClause}
         ${sourceClause}
       ORDER BY dj_seq ASC, id ASC`,
      [
        accessionNumber,
        ...(productClause ? [`${docdate}:${product}:%`] : []),
        ...(allowedSources && allowedSources.length > 0 ? allowedSources : []),
      ]
    );

    const seen = new Set<string>();
    const takes: any[] = [];
    for (const row of rows) {
      const key = row.dj_take_id ?? `id:${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      takes.push({
        id: row.id || 0,
        ticker: row.ticker || '',
        headline: row.title || '',
        summary: row.summary || '',
        article: row.article || '',
        publishedDate: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        source: row.source || '',
        url: row.articleURL || '',
        importance: row.importance || '',
        category: row.category || '',
        ...djFields(row),
      });
    }
    return takes;
  } catch (error) {
    console.error('Database error:', error);
    throw new Error(`Failed to fetch story takes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (connection) await connection.end();
  }
};

const handleGetCompaniesByIndustry = async (event: any, dbConfig: object) => {
  const { industry } = event.arguments;
  console.log('Fetching companies for industry:', industry);

  let connection;

  try {
    // Create database connection
    connection = await mysql.createConnection(dbConfig);

    // Query for companies in the same industry
    const [companyRows] = await connection.execute<any[]>(
      `SELECT ticker, name as companyName
       FROM securities
       WHERE industry = ?
       ORDER BY name
       LIMIT 50`,
      [industry]
    );

    return companyRows.map((company: any) => ({
      ticker: company.ticker || '',
      companyName: company.companyName || '',
    }));

  } catch (error) {
    console.error('Database error:', error);
    throw new Error(`Failed to fetch companies by industry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

const handleGetMacroNews = async (event: any, dbConfig: object) => {
  const { screen, limit = 50, allowedSources } = event.arguments;
  console.log('Fetching macro news for screen:', screen, 'limit:', limit);

  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    let rows: any[];
    if (allowedSources && allowedSources.length === 0) {
      rows = [];
    } else if (allowedSources && allowedSources.length > 0) {
      const placeholders = allowedSources.map(() => '?').join(', ');
      [rows] = await connection.query<any[]>(
        `SELECT id, screen, headline, summary, report, source, url,
                published_at, importance, category
         FROM dj_macro_news
         WHERE screen = ?
           AND source IN (${placeholders})
         ORDER BY published_at DESC
         LIMIT ?`,
        [screen, ...allowedSources, limit]
      );
    } else {
      [rows] = await connection.query<any[]>(
        `SELECT id, screen, headline, summary, report, source, url,
                published_at, importance, category
         FROM dj_macro_news
         WHERE screen = ?
         ORDER BY published_at DESC
         LIMIT ?`,
        [screen, limit]
      );
    }

    return rows.map((row: any) => ({
      id:          row.id,
      screen:      row.screen,
      headline:    row.headline    || '',
      summary:     row.summary     || '',
      report:      row.report      || '',
      source:      row.source      || 'Dow Jones',
      url:         row.url         || '',
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : new Date().toISOString(),
      importance:  row.importance  ?? 5,
      category:    row.category    || '',
    }));

  } catch (error) {
    console.error('Database error:', error);
    throw new Error(`Failed to fetch macro news: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

const handleGetCompanyProfile = async (event: any, dbConfig: object) => {
  const { ticker } = event.arguments;
  console.log('Fetching company profile for ticker:', ticker);

  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    const [rows] = await connection.query<any[]>(
      `SELECT display_name, description, current_expectation, sensitivity_weight, theme_type, status
       FROM company_status
       WHERE ticker = ?
         AND status IN ('ACTIVE', 'FADING')
       ORDER BY sensitivity_weight DESC`,
      [ticker]
    );

    return rows.map((row: any) => ({
      display_name:       row.display_name        || '',
      description:        row.description         || '',
      expectation:        row.current_expectation || '',
      sensitivity_weight: row.sensitivity_weight   ?? 0,
      theme_type:         row.theme_type           || '',
      status:             row.status               || '',
    }));

  } catch (error) {
    console.error('Database error:', error);
    throw new Error(`Failed to fetch company profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};
