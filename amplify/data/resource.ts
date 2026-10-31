import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { newsQuery } from '../functions/news-query/resource';
import { valkeyQuery } from '../functions/valkey-query/resource';
import { accessExchange } from '../functions/access-exchange/resource';
import { accessAuthorizer } from '../functions/access-authorizer/resource';
import { parseDuration } from '../functions/access-shared/config';

/**
 * Phase 1 (browser UI access): reader operations accept BOTH the legacy guest IAM mode
 * and the new Lambda-authorizer session ('custom'). The UI now only uses 'custom'.
 * Phase 2 removes allow.guest() from reader ops (see docs/access/ARCHITECTURE.md).
 */

const schema = a.schema({
  // ── Browser access (phase 1) ───────────────────────────────────────────────
  AccessSession: a.customType({
    status:             a.string().required(),   // 'ok' | 'invalid'
    session:            a.string(),               // HS256 JWT, send as authToken (authMode 'lambda')
    sessionExpiresAt:   a.integer(),              // epoch seconds
    email:              a.string(),
    allowedSources:     a.string().array(),
    department:         a.string(),
    linkToken:          a.string(),               // set only when the link token was rotated
    linkTokenExpiresAt: a.integer(),              // epoch seconds
    rotated:            a.boolean(),
  }),

  // Pre-login: callable with guest IAM credentials; rate limited by WAF (backend.ts).
  exchangeToken: a
    .mutation()
    .arguments({ token: a.string().required() })
    .returns(a.ref('AccessSession'))
    .authorization((allow) => [allow.guest()])
    .handler(a.handler.function(accessExchange)),

  TickerInterest: a.customType({
    email:  a.string(),
    ticker: a.string(),
  }),

  notifyTickerOfInterest: a
    .mutation()
    .arguments({
      email:  a.string().required(),
      ticker: a.string().required(),
    })
    .returns(a.ref('TickerInterest'))
    .authorization((allow) => [allow.guest(), allow.custom()])
    .handler(a.handler.function(newsQuery)),

  onTickerOfInterest: a
    .subscription()
    .for(a.ref('notifyTickerOfInterest'))
    .authorization((allow) => [allow.guest(), allow.custom()])
    .handler(a.handler.function(newsQuery)),

  NewsArticle: a.customType({
    id: a.integer(),
    ticker: a.string(),
    headline: a.string(),
    summary: a.string(),
    article: a.string(),
    publishedDate: a.datetime(),
    source: a.string(),
    url: a.string(),
    importance: a.string(),
    category: a.string(),
    screen: a.string(),
    // Dow Jones story chaining (null/absent on non-DJ rows)
    djAccessionNumber: a.string(),
    djSeq:             a.integer(),
    djTakeId:          a.string(),
    djHot:             a.boolean(),
    djCorrected:       a.boolean(),
    djTemp:            a.boolean(),
    djDisplayTime:     a.datetime(),
    djCodes:           a.string(),
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

  MacroNewsArticle: a.customType({
    id: a.integer(),
    screen: a.string(),
    headline: a.string(),
    summary: a.string(),
    report: a.string(),
    source: a.string(),
    url: a.string(),
    publishedAt: a.datetime(),
    importance: a.integer(),
    category: a.string(),
  }),

  CompanyTheme: a.customType({
    display_name: a.string(),
    description: a.string(),
    expectation: a.string(),
    sensitivity_weight: a.float(),
    theme_type: a.string(),
    status: a.string(),
  }),


  UserProfile: a.customType({
    allowedSources: a.string().array(),
    department:     a.string(),
  }),

  getUserProfile: a
    .query()
    .arguments({ email: a.string().required() })
    .returns(a.ref('UserProfile'))
    .authorization((allow) => [allow.guest(), allow.custom()])
    .handler(a.handler.function(newsQuery)),

  getTickerNews: a
    .query()
    .arguments({
      ticker:         a.string().required(),
      limit:          a.integer(),
      allowedSources: a.string().array(),
    })
    .returns(a.ref('TickerNewsData'))
    .authorization((allow) => [allow.guest(), allow.custom()])
    .handler(
      a.handler.function(newsQuery)
    ),

  // All takes of one Dow Jones story (one row per take, deduped across tickers), oldest first.
  getStoryTakes: a
    .query()
    .arguments({
      accessionNumber: a.string().required(),
      // Any take id of the story ("docdate:product:seq"). Accession numbers are only unique within a
      // Dow Jones product (an SN and a DN story can share one), so the chain is limited to its product.
      takeId:          a.string(),
      allowedSources:  a.string().array(),
    })
    .returns(a.ref('NewsArticle').array())
    .authorization((allow) => [allow.guest(), allow.custom()])
    .handler(a.handler.function(newsQuery)),

  getCompaniesByIndustry: a
    .query()
    .arguments({
      industry: a.string().required(),
    })
    .returns(a.ref('RelatedCompany').array())
    .authorization((allow) => [allow.guest(), allow.custom()])
    .handler(
      a.handler.function(newsQuery)
    ),

  getMacroNews: a
    .query()
    .arguments({
      screen:         a.string().required(),
      limit:          a.integer(),
      allowedSources: a.string().array(),
    })
    .returns(a.ref('MacroNewsArticle').array())
    .authorization((allow) => [allow.guest(), allow.custom()])
    .handler(a.handler.function(newsQuery)),

  getCompanyProfile: a
    .query()
    .arguments({ ticker: a.string().required() })
    .returns(a.ref('CompanyTheme').array())
    .authorization((allow) => [allow.guest(), allow.custom()])
    .handler(a.handler.function(newsQuery)),

  publishNewArticle: a
    .mutation()
    .arguments({
      id:            a.integer(),
      ticker:        a.string().required(),
      headline:      a.string(),
      summary:       a.string(),
      article:       a.string(),
      source:        a.string(),
      url:           a.string(),
      importance:    a.string(),
      category:      a.string(),
      publishedDate: a.datetime(),
      screen:        a.string(),
      djAccessionNumber: a.string(),
      djSeq:             a.integer(),
      djTakeId:          a.string(),
      djHot:             a.boolean(),
      djCorrected:       a.boolean(),
      djTemp:            a.boolean(),
      djDisplayTime:     a.datetime(),
      djCodes:           a.string(),
    })
    .returns(a.ref('NewsArticle'))
    .authorization((allow) => [allow.guest()])
    .handler(a.handler.function(newsQuery)),

  onNewArticle: a
    .subscription()
    .for(a.ref('publishNewArticle'))
    .authorization((allow) => [allow.guest(), allow.custom()])
    .handler(a.handler.function(newsQuery)),

  getTickersOfInterest: a
    .query()
    .arguments({ email: a.string().required() })
    .returns(a.string().array())
    .authorization((allow) => [allow.guest(), allow.custom()])
    .handler(a.handler.function(valkeyQuery)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'iam',
    lambdaAuthorizationMode: {
      function: accessAuthorizer,
      timeToLiveInSeconds: parseDuration(process.env.ACCESS_AUTHORIZER_CACHE_TTL, 300),
    },
  },
});
