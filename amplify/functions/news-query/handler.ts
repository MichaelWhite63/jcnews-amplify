import type { Schema } from '../../data/resource';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

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
  if (event.typeName === 'Subscription' || event.fieldName === 'onNewArticle') {
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

  // Route to appropriate handler based on arguments
  if ('email' in event.arguments && !('ticker' in event.arguments)) {
    return handleGetPersonPermissions(event, dbConfig);
  } else if ('industry' in event.arguments) {
    return handleGetCompaniesByIndustry(event, dbConfig);
  } else if ('screen' in event.arguments && !('ticker' in event.arguments)) {
    return handleGetMacroNews(event, dbConfig);
  } else if ('ticker' in event.arguments && 'screen' in event.arguments) {
    return handlePublishNewArticle(event);
  } else if ('publishedDate' in event.arguments) {
    return handlePublishNewArticle(event);
  } else {
    return handleGetTickerNews(event, dbConfig);
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
  };
};

const handleGetPersonPermissions = async (event: any, dbConfig: object) => {
  const { email } = event.arguments;
  console.log('Fetching permissions for:', email);

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute<any[]>(
      'SELECT accessList FROM persons WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows.length || !rows[0].accessList) return [];

    const accessList: { Source: string; Permission: boolean }[] =
      typeof rows[0].accessList === 'string'
        ? JSON.parse(rows[0].accessList)
        : rows[0].accessList;

    const sources = accessList
      .filter(item => item.Permission === true)
      .map(item => item.Source);
    console.log('Allowed sources for', email, ':', JSON.stringify(sources));
    return sources;

  } catch (error) {
    console.error('Error fetching person permissions:', error);
    return [];
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
        `SELECT id, ticker, title, summary, article, articleURL, source, createdAt, importance, category
         FROM news
         WHERE ticker = ?
           AND createdAt >= ?
           AND source IN (${placeholders})
         ORDER BY createdAt DESC`,
        [ticker, cutoffStr, ...allowedSources]
      );
    } else {
      [newsRows] = await connection.query<any[]>(
        `SELECT id, ticker, title, summary, article, articleURL, source, createdAt, importance, category
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
