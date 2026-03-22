# Quick Start - How to Run the Program

## Current Status

✅ All dependencies installed
✅ Environment variables configured
✅ AWS credentials detected
⚠️ AWS region needs bootstrapping (one-time setup)

## The Issue

The error you're seeing:
```
The region us-east-2 has not been bootstrapped
```

This means your IAM user needs specific permissions to set up Amplify in this region for the first time.

## Solution: Bootstrap the Region

You have two options:

### Option A: Use AWS Console (Easiest)

1. Go to https://console.aws.amazon.com/amplify/
2. Sign in as an Admin or Root user
3. Click "Create new app" → "Build from scratch"
4. This will automatically bootstrap the region
5. You can delete this test app after

### Option B: Add IAM Permissions

Your IAM user `programmatic-access-account` needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "iam:CreateRole",
        "iam:PutRolePolicy",
        "iam:AttachRolePolicy",
        "iam:PassRole",
        "lambda:*",
        "appsync:*",
        "dynamodb:*",
        "cognito-idp:*",
        "ssm:*"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach this policy in IAM Console, then rerun the command.

### Option C: Use a Different AWS Profile

If you have another AWS profile with admin permissions:

```bash
# List your profiles
cat ~/.aws/credentials

# Use a different profile
npm run sandbox -- --profile YOUR_ADMIN_PROFILE
```

## Once Bootstrapped

After the region is bootstrapped, run these commands:

### Terminal 1 - Start the Backend (Amplify Sandbox)
```bash
npm run sandbox
```

This will:
- Deploy GraphQL API to AWS AppSync
- Create Lambda function for database queries
- Generate `amplify_outputs.json`
- Watch for file changes

Keep this terminal running!

### Terminal 2 - Start the Frontend (React Dev Server)
```bash
npm run dev
```

Then open: http://localhost:5173

## Important Notes

1. **Database Access**: After the Lambda function is deployed, you'll need to configure its VPC/security group settings to access your RDS database. See instructions below.

2. **First Deploy Takes ~5-10 minutes**: The first `npm run sandbox` takes a while as it creates all AWS resources.

3. **Environment Variables**: The Lambda function will have access to your database credentials from the `.env` file.

## After Sandbox is Running

### Configure Lambda to Access RDS

Once the sandbox deploys successfully, you need to allow the Lambda function to access your RDS database:

1. Go to AWS Lambda Console
2. Find the function named like `amplify-newsquery-<hash>`
3. Go to Configuration → VPC
4. Click "Edit" and configure:
   - VPC: Same as your RDS database
   - Subnets: Private subnets with NAT gateway
   - Security Group: One that can access RDS

5. Update RDS Security Group:
   - Go to RDS Console → Your database → Security groups
   - Add inbound rule: MySQL/Aurora (port 3306) from Lambda's security group

## Testing the App

Once both terminals are running:

1. Open http://localhost:5173
2. You should see "AAPL US" loaded by default
3. If it shows data, everything is working!
4. If you see errors, check:
   - CloudWatch Logs for the Lambda function
   - AWS AppSync Console → Queries tab to test directly

## Troubleshooting

### "Cannot connect to database"
- Check Lambda VPC configuration
- Verify RDS security group allows Lambda
- Check CloudWatch Logs: `/aws/lambda/<your-function-name>`

### "No data returned"
- Verify ticker exists: `SELECT * FROM securities WHERE ticker = 'AAPL US'`
- Check news table has data for that ticker

### Sandbox fails to deploy
- Check IAM permissions
- Look for error messages in terminal
- Try with `--debug` flag: `npx ampx sandbox --debug`

## Need More Help?

See the full [README.md](README.md) or [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.
