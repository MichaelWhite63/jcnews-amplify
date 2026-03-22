# News Dashboard - AWS Amplify with RDS MySQL

A full-stack application that displays news articles and security information for stock tickers using AWS Amplify Gen 2, GraphQL, Lambda, and RDS MySQL.

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: AWS Amplify Gen 2 (AppSync GraphQL API)
- **Database**: AWS RDS MySQL (existing database)
- **Serverless Functions**: AWS Lambda with MySQL connector
- **Authentication**: API Key (configurable to Cognito)

## Prerequisites

- Node.js 18+ and npm
- AWS Account with appropriate permissions
- AWS CLI configured (`aws configure`)
- Amplify CLI installed globally: `npm install -g @aws-amplify/cli`
- Access to the existing RDS MySQL database

## Database Schema Requirements

Your MySQL database should have these tables:

### `news` table
```sql
CREATE TABLE news (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticker VARCHAR(20),
    headline TEXT,
    summary TEXT,
    published_date DATETIME,
    source VARCHAR(255),
    url TEXT,
    INDEX idx_ticker (ticker),
    INDEX idx_published_date (published_date)
);
```

### `securities` table
```sql
CREATE TABLE securities (
    ticker VARCHAR(20) PRIMARY KEY,
    company_name VARCHAR(255),
    sector VARCHAR(100),
    industry VARCHAR(100),
    exchange VARCHAR(50)
);
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd amplify
npm install
cd ..
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your actual database credentials:
```env
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=3306
SQL_DATABASE=your-database-name
SQL_USER=your-db-username
SQL_PASSWORD=your-db-password
```

**IMPORTANT**: Never commit the `.env` file to version control!

### 3. Configure AWS Amplify

Initialize and deploy your Amplify backend:

```bash
# Create a new Amplify app (first time only)
npx ampx sandbox

# This will:
# - Create cloud resources
# - Deploy your GraphQL API
# - Deploy Lambda functions
# - Generate amplify_outputs.json for your frontend
```

### 4. Configure Database Access

Your Lambda function needs network access to your RDS database:

**Option A: Public RDS (easier for testing)**
- Ensure your RDS instance allows public access
- Add Lambda's IP range to security group inbound rules
- Port 3306 (MySQL) should be open to Lambda

**Option B: VPC Configuration (production recommended)**
1. Go to AWS Lambda Console
2. Find your `newsQuery` function
3. Edit VPC settings:
   - Select the same VPC as your RDS
   - Select private subnets
   - Add security group that can access RDS
4. Ensure RDS security group allows inbound from Lambda security group

### 5. Run the Application

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm run preview
```

## Project Structure

```
amplify-news-app/
├── amplify/                      # Backend configuration
│   ├── backend.ts               # Amplify backend definition
│   ├── data/
│   │   └── resource.ts         # GraphQL schema definition
│   └── functions/
│       └── news-query/
│           ├── resource.ts     # Lambda function config
│           └── handler.ts      # Lambda business logic
├── src/
│   ├── App.tsx                 # Main React component
│   ├── App.css                 # Styling
│   ├── main.tsx                # App entry point
│   └── index.css               # Global styles
├── package.json
└── README.md
```

## GraphQL API

### Query

```graphql
query GetTickerNews {
  getTickerNews(ticker: "AAPL US", limit: 10) {
    security {
      ticker
      companyName
      sector
      industry
      exchange
    }
    newsArticles {
      id
      ticker
      headline
      summary
      publishedDate
      source
      url
    }
  }
}
```

## Customization

### Change the Ticker

Edit [src/App.tsx:30](src/App.tsx#L30) to change the default ticker:
```typescript
const [ticker, setTicker] = useState('AAPL US')
```

### Adjust News Article Limit

Edit [src/App.tsx:41](src/App.tsx#L41):
```typescript
const { data: result } = await client.queries.getTickerNews({
  ticker,
  limit: 20  // Change from 10 to any number
})
```

### Update Database Column Mappings

If your database has different column names, update the SQL queries in [amplify/functions/news-query/handler.ts](amplify/functions/news-query/handler.ts).

## Security Best Practices

### 1. Use AWS Secrets Manager (Recommended for Production)

Instead of environment variables, store credentials in Secrets Manager:

```typescript
// In handler.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-2" });
const response = await client.send(
  new GetSecretValueCommand({ SecretId: "prod/rds/credentials" })
);
const secrets = JSON.parse(response.SecretString);
```

### 2. Enable VPC for Lambda

Always use VPC in production to keep database access private.

### 3. Use IAM Authentication

Configure RDS to use IAM database authentication instead of passwords.

### 4. Enable SSL/TLS

Update connection config:
```typescript
const dbConfig = {
  ...
  ssl: {
    rejectUnauthorized: true
  }
};
```

### 5. Switch to Cognito Authentication

In [amplify/data/resource.ts:31](amplify/data/resource.ts#L31), change:
```typescript
.authorization((allow) => [allow.authenticated()])
```

## Deployment to Production

### Deploy to Amplify Hosting

```bash
# Connect to git repository
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main

# Deploy via Amplify Console
npx ampx pipeline-deploy --branch main
```

Or use the AWS Amplify Console UI to connect your repository.

## Troubleshooting

### Lambda timeout errors
- Increase timeout in [amplify/functions/news-query/resource.ts:6](amplify/functions/news-query/resource.ts#L6)
- Check database connection and query performance

### "Cannot connect to database"
- Verify security group rules
- Check VPC configuration
- Ensure RDS is accessible from Lambda

### "Module not found: mysql2"
- Run `npm install` in the `amplify/` directory
- Redeploy: `npx ampx sandbox`

### No data returned
- Verify ticker exists in database: `SELECT * FROM securities WHERE ticker = 'AAPL US'`
- Check Lambda logs in CloudWatch

## Database Connection Testing

Test your database connection locally:

```bash
cd amplify/functions/news-query
node -e "
const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({
    host: 'your-host',
    user: 'your-user',
    password: 'your-password',
    database: 'database'
  });
  const [rows] = await conn.execute('SELECT COUNT(*) as count FROM news');
  console.log('News count:', rows[0].count);
  await conn.end();
})();
"
```

## Cost Considerations

- **AppSync**: $4 per million queries + data transfer
- **Lambda**: Free tier: 1M requests/month, then $0.20 per 1M
- **API Gateway**: Not used (AppSync is used instead)
- **RDS**: Existing cost (no change)

## Support

For issues:
1. Check CloudWatch Logs for Lambda errors
2. Test GraphQL queries in AppSync Console
3. Verify database connectivity
4. Review security group rules

## License

MIT
