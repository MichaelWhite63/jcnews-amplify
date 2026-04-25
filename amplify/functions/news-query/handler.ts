import type { Schema } from '../../data/resource';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

type TickerNewsHandler = Schema['getTickerNews']['functionHandler'];
type IndustryHandler = Schema['getCompaniesByIndustry']['functionHandler'];

// Define interfaces for database rows
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

const PLACEHOLDER = '<value will be resolved during runtime>';
const ssmClient = new SSMClient({});

async function resolveAmplifySecrets(): Promise<void> {
  if (process.env.DB_HOST !== PLACEHOLDER) return;
  const configStr = process.env.AMPLIFY_SSM_ENV_CONFIG;
  if (!configStr) return;

  const config: Record<string, { path: string; sharedPath: string }> = JSON.parse(configStr);
  await Promise.all(
    Object.entries(config).map(async ([envKey, paths]) => {
      for (const name of [paths.path, paths.sharedPath]) {
        try {
          const result = await ssmClient.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
          if (result.Parameter?.Value) {
            process.env[envKey] = result.Parameter.Value;
            return;
          }
        } catch { /* try next path */ }
      }
      console.warn(`Could not resolve secret for ${envKey}`);
    })
  );
}

export const handler = async (event: any) => {
  await resolveAmplifySecrets();

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
  if ('industry' in event.arguments) {
    return handleGetCompaniesByIndustry(event, dbConfig);
  } else {
    return handleGetTickerNews(event, dbConfig);
  }
};

const handleGetTickerNews = async (event: any, dbConfig: object) => {
  const { ticker, limit = 10 } = event.arguments;
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

    const [newsRows] = await connection.query<any[]>(
      `SELECT id, ticker, title, summary, article, articleURL, source, createdAt, importance, category
       FROM news
       WHERE ticker = ?
         AND createdAt >= ?
       ORDER BY createdAt DESC`,
      [ticker, cutoffStr]
    );

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
