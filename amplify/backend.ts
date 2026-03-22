import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { newsQuery } from './functions/news-query/resource';

const backend = defineBackend({
  data,
  newsQuery
});

// Add environment variables to the Lambda function
// These values come from the .env file at the project root
backend.newsQuery.addEnvironment('DB_HOST', 'production-in4m-database.cnwkqkqik0k9.us-east-2.rds.amazonaws.com');
backend.newsQuery.addEnvironment('DB_PORT', '3306');
backend.newsQuery.addEnvironment('SQL_DATABASE', 'in4mdatabase');
backend.newsQuery.addEnvironment('SQL_USER', 'admin');
backend.newsQuery.addEnvironment('SQL_PASSWORD', 'LetsGoIn4m');
