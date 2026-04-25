import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { newsQuery } from './functions/news-query/resource';

defineBackend({
  data,
  newsQuery
});
