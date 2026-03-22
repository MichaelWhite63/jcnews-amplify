# Quick Setup Guide

Follow these steps in order to get your application running:

## Step 1: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd amplify
npm install
cd ..
```

## Step 2: Create Environment File

```bash
cp .env.example .env
```

Then edit `.env` with your actual credentials:
```env
DB_HOST=production-in4m-database.cnwkqkqik0k9.us-east-2.rds.amazonaws.com
DB_PORT=3306
SQL_DATABASE=in4mdatabase
SQL_USER=admin
SQL_PASSWORD=LetsGoIn4m
DEV_OR_PROD=Production
```

## Step 3: Verify AWS Configuration

Make sure AWS CLI is configured:
```bash
aws configure list
```

You should see your AWS credentials and region (us-east-2 recommended).

## Step 4: Deploy Amplify Backend

This will create your GraphQL API and Lambda function:

```bash
npx ampx sandbox
```

This command will:
- Create an AppSync GraphQL API
- Deploy a Lambda function to query your MySQL database
- Generate `amplify_outputs.json` for your React app
- Set up API authentication

**Note**: Keep this terminal running during development. It watches for backend changes.

## Step 5: Configure Database Access

### Option A: If RDS is publicly accessible
1. Go to AWS Lambda Console
2. Find the function named like `amplify-newsquery-<hash>`
3. Note the function's execution role
4. Go to RDS Console → Your database → Security groups
5. Add inbound rule: Type=MySQL/Aurora, Port=3306, Source=0.0.0.0/0 (or Lambda IP range)

### Option B: If RDS is in VPC (recommended)
1. Go to AWS Lambda Console
2. Find your `newsQuery` function
3. Configuration → VPC → Edit
4. Select the same VPC as your RDS
5. Select private subnets with NAT gateway
6. Add a security group that can access RDS
7. Update RDS security group to allow inbound from Lambda's security group

## Step 6: Run the Application

In a new terminal (keep sandbox running):

```bash
npm run dev
```

Open http://localhost:5173

## Step 7: Test the Application

The app should:
1. Load "AAPL US" by default
2. Display security information (company name, sector, etc.)
3. Show top 10 news articles

Try searching for different tickers in the input box.

## Troubleshooting

### "Cannot connect to database"
- Check RDS security group allows connections from Lambda
- Verify environment variables are loaded in Lambda
- Check CloudWatch Logs for detailed error messages

### "No data returned"
- Verify the ticker exists: `SELECT * FROM securities WHERE ticker = 'AAPL US'`
- Check that news table has data: `SELECT COUNT(*) FROM news WHERE ticker = 'AAPL US'`

### Lambda times out
- Check VPC/subnet configuration has internet access (NAT gateway)
- Verify RDS is responding (test with MySQL client)
- Increase Lambda timeout in `amplify/functions/news-query/resource.ts`

### Module errors
- Make sure you ran `npm install` in both root and `amplify/` directories
- Redeploy sandbox: `npx ampx sandbox`

## Checking Lambda Logs

```bash
# Get the function name
aws lambda list-functions --query 'Functions[?contains(FunctionName, `newsQuery`)].FunctionName'

# View logs
aws logs tail /aws/lambda/<function-name> --follow
```

## Testing GraphQL Query Directly

Go to AWS AppSync Console:
1. Select your API (named like `amplify-api-...`)
2. Click "Queries" in the left sidebar
3. Run this query:

```graphql
query TestQuery {
  getTickerNews(ticker: "AAPL US", limit: 5) {
    security {
      ticker
      companyName
    }
    newsArticles {
      headline
      publishedDate
    }
  }
}
```

## Next Steps

1. **Add more tickers**: Edit the UI to support a dropdown of common tickers
2. **Improve styling**: Customize `src/App.css` to match your brand
3. **Add filters**: Filter news by date range, source, or keywords
4. **Deploy to production**: Use `npx ampx pipeline-deploy --branch main`
5. **Add authentication**: Switch from API Key to Cognito user pools

## Production Deployment

When ready to deploy:

```bash
# Initialize git if not already
git init
git add .
git commit -m "Initial commit"

# Push to GitHub/GitLab
git remote add origin <your-repo-url>
git push -u origin main

# Deploy via Amplify Console
npx ampx pipeline-deploy --branch main --app-id <your-amplify-app-id>
```

Or use the AWS Amplify Console UI to connect your git repository.

## Security Checklist Before Production

- [ ] Move database credentials to AWS Secrets Manager
- [ ] Enable SSL/TLS for database connections
- [ ] Configure Lambda in VPC (not public)
- [ ] Switch from API Key to Cognito authentication
- [ ] Enable CloudWatch alarms for errors
- [ ] Set up proper IAM roles with least privilege
- [ ] Enable AWS WAF on AppSync API
- [ ] Review and restrict CORS settings

## Need Help?

Check these resources:
- [AWS Amplify Gen 2 Documentation](https://docs.amplify.aws/)
- [AppSync Developer Guide](https://docs.aws.amazon.com/appsync/)
- CloudWatch Logs at `/aws/lambda/<your-function-name>`
