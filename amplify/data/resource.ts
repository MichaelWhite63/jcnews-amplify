import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { newsQuery } from '../functions/news-query/resource';

const schema = a.schema({
  NewsArticle: a.customType({
    id: a.integer(),
    ticker: a.string(),
    headline: a.string(),
    summary: a.string(),
    publishedDate: a.datetime(),
    source: a.string(),
    url: a.string(),
    importance: a.string(),
    category: a.string(),
  }),

  Security: a.customType({
    ticker: a.string(),
    companyName: a.string(),
    sector: a.string(),
    industry: a.string(),
    exchange: a.string(),
    earningsDate: a.string(),
    exDivDate: a.string(),
    exDivAmount: a.string(),
    shortInterest: a.string(),
    shortRatio: a.string(),
    primaryExchange: a.string(),
    avgDailyVolume: a.string(),
    cusip: a.string(),
    isin: a.string(),
    indexes: a.string(),
  }),

  TickerNewsData: a.customType({
    security: a.ref('Security'),
    newsArticles: a.ref('NewsArticle').array(),
  }),

  RelatedCompany: a.customType({
    ticker: a.string(),
    companyName: a.string(),
  }),


  getTickerNews: a
    .query()
    .arguments({
      ticker: a.string().required(),
      limit: a.integer(),
    })
    .returns(a.ref('TickerNewsData'))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(
      a.handler.function(newsQuery)
    ),

  getCompaniesByIndustry: a
    .query()
    .arguments({
      industry: a.string().required(),
    })
    .returns(a.ref('RelatedCompany').array())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(
      a.handler.function(newsQuery)
    ),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
