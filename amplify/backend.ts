import { defineBackend } from '@aws-amplify/backend';
import { secret } from '@aws-amplify/backend';
import { data } from './data/resource';
import { newsQuery } from './functions/news-query/resource';

const backend = defineBackend({
  data,
  newsQuery
});

backend.newsQuery.addEnvironment('DB_HOST',      secret('DB_HOST'));
backend.newsQuery.addEnvironment('DB_PORT',      secret('DB_PORT'));
backend.newsQuery.addEnvironment('SQL_DATABASE', secret('SQL_DATABASE'));
backend.newsQuery.addEnvironment('SQL_USER',     secret('SQL_USER'));
backend.newsQuery.addEnvironment('SQL_PASSWORD', secret('SQL_PASSWORD'));
