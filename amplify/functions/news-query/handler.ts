import type { Schema } from '../../data/resource';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

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

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DATABASE,
  connectTimeout: 10000,
};

export const handler = async (event: any) => {
  // Route to appropriate handler based on arguments
  if ('industry' in event.arguments) {
    return handleGetCompaniesByIndustry(event);
  } else {
    return handleGetTickerNews(event);
  }
};

const handleGetTickerNews = async (event: any) => {
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

    // Query for news articles with importance and category
    // Note: MySQL doesn't support placeholders for LIMIT in prepared statements with execute()
    // So we validate the limit and use string interpolation safely
    const safeLimit = Math.min(Math.max(parseInt(String(limit || 10)), 1), 100);
    const [newsRows] = await connection.query<any[]>(
      `SELECT id, ticker, title, summary, articleURL, source, createdAt, importance, category
       FROM news
       WHERE ticker = ?
       ORDER BY createdAt DESC
       LIMIT ${safeLimit}`,
      [ticker]
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

const handleGetCompaniesByIndustry = async (event: any) => {
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
