export interface DowJonesArticle {
  id: number
  headline: string
  publishedDate: string
  body: string
  industry: string
  source: 'oil_news' | 'rates_news' | 'fx_news' | 'inflation_news' | 'employment_news' | 'trade_news'
}

export const oilNewsArticles: DowJonesArticle[] = [
  {
    id: 1,
    headline: 'Iran Hands Trump a Peace Offer. Why Oil Prices Are Surging Above $100. -- Barrons.com',
    publishedDate: '2026-04-28T12:15:11.091Z',
    industry: 'I/FSL, I/OIL',
    source: 'oil_news',
    body: `By Adam Clark
Oil prices were rising Tuesday despite confirmation that Iran has presented a new peace proposal to the U.S., with markets skeptical of American approval for any immediate deal.
Brent crude futures, the international benchmark, were rising 3.7% to $105.50 a barrel, while West Texas Intermediate futures jumped 5% to $101.27 -- on track to settle above $100 a barrel for the first time since Apr.7.
Iran has offered to stop its attacks in the Strait of Hormuz in exchange for a full end to the war and the U.S. blockade of Iranian ports being lifted, The Wall Street Journal reported, citing officials familiar with the matter.
President Donald Trump discussed the proposal with his national-security team on Monday, according to White House press secretary Karoline Leavitt. However, the lack of action on Iran's nuclear program could be an obstacle.
"Iran's proposed interim cease-fire deal...has been met with little enthusiasm in Washington, according to the latest reports. That is pushing markets back into a higher-uncertainty regime, with oil prices staying well-supported," wrote ING analyst Francesco Pesole in a research note.
Meanwhile, some insurers are requiring ships to use an Iran-approved route through the Strait of Hormuz as a condition of getting war-risk coverage, according to insurance broker Marsh.
Goldman Sachs analysts on Monday raised their forecast for fourth-quarter Brent prices to $90 a barrel from $80, and WTI prices to $83 a barrel from $75, citing more extended disruption to oil supplies.
Write to Adam Clark at adam.clark@barrons.com
This content was created by Barron's, which is operated by Dow Jones & Co. Barron's is published independently from Dow Jones Newswires and The Wall Street Journal.`,
  },
  {
    id: 2,
    headline: 'GM Earnings Survived the Oil Shock. Why the Stock Is Rising Now. -- Barrons.com',
    publishedDate: '2026-04-28T12:25:39.591Z',
    industry: 'I/AUT, I/FSL, I/OIL',
    source: 'oil_news',
    body: `Al Root
General Motors stock was rising in premarket trading after the auto maker turned in better-than-expected first-quarter earnings and raised its full-year outlook. So far, car demand -- and GM's profits -- have survived tariffs, and now they look like they will survive the Iran oil shock, too.
GM reported a first-quarter operating profit of $4.3 billion from sales of $43.6 billion. Wall Street was looking for an operating profit of $3 billion from sales of $43.5 billion. A year ago, GM reported an operating profit of $3.5 billion from sales of $44 billion.
Sales fell due to lower deliveries. GM sold 626,429 vehicles in the U.S., down 9.7% year over year. Part of the problem was a tough comparison. March 2025 was very strong, possibly because of tariff-related news. Sales in early 2026 were also impacted by severe winter weather.
For 2026, GM expects an operating profit of between $13.5 billion and $15.5 billion, up from a prior range of $13 billion and $15 billion. Wall Street currently projects $13.9 billion.
The new $14.5 billion midpoint implies about $10.2 billion for the rest of the year. Wall Street currently projects about $10.5 billion.
In 2025, GM reported an operating profit of $12.7 billion, down from $14.9 billion in 2024. Import tariff weighed on results, cutting operating profit by roughly $1.9 billion.
Shares were up 0.7% in premarket trading at $80, while S&P 500 futures were down 0.7% and Dow Jones Industrial Average futures had risen 0.2%.
Wall Street expected a solid quarter. "We think GM [was] positioned for strong 1Q results as management commentary, including at our Auto Summit, suggests the most stable start to a year that [they've] seen in the last five years," wrote BofA Securities analyst Alexander Perry in a preview report.
Results "cleared the bar," wrote Barclays analyst Dan Levy in a Tuesday report. With numbers reported, investors will want to hear what higher oil prices can do to demand trends. International benchmark crude oil prices are north of $100 per barrel, up 67% year over year.
Write to Al Root at allen.root@dowjones.com
This content was created by Barron's, which is operated by Dow Jones & Co. Barron's is published independently from Dow Jones Newswires and The Wall Street Journal.`,
  },
  {
    id: 3,
    headline: "Exxon, Chevron Stocks Jump. BP Doubles Profit on 'Exceptional' Oil Trading. -- Barrons.com",
    publishedDate: '2026-04-28T12:37:40.863Z',
    industry: 'I/FSL, I/OIL',
    source: 'oil_news',
    body: `By George Glover
BP stock was rising on Tuesday after the rally in crude prices helped the British oil major to double its first-quarter profit. It should be a good omen for its American peers.
BP's American depositary receipts climbed 2.4% to $47.09 ahead of the opening bell. Futures tracking the S&P 500 were 0.8% lower.
BP reported an underlying replacement cost profit of $3.20 billion for the quarter, up 132% from a year ago. Analysts were looking for $2.65 billion, according to a FactSet poll.
The results cover a period where the war in the Middle East disrupted shipping through the Strait of Hormuz, sparking a surge in oil prices. BP said in Tuesday's release that oil trading had made an "exceptional" contribution to its earnings.
That bodes well for Friday, when U.S. oil majors Chevron and Exxon Mobil are set to report their own first-quarter financials. Chevron stock climbed 1.5% and Exxon added 1.6% ahead of Tuesday's opening bell.
Write to George Glover at george.glover@dowjones.com
This content was created by Barron's, which is operated by Dow Jones & Co. Barron's is published independently from Dow Jones Newswires and The Wall Street Journal.`,
  },
  {
    id: 4,
    headline: 'Stocks to Watch Tuesday: Oracle, Spotify, Hilton -- WSJ',
    publishedDate: '2026-04-28T12:18:41.189Z',
    industry: 'I/BAN, I/FSL, I/OIL',
    source: 'oil_news',
    body: `By Alexander Osipovich
Oracle (ORCL): The software company's stock slid 7% in premarket trading after The Wall Street Journal reported that OpenAI-which has a data-center deal with Oracle worth $300 billion-missed revenue and user targets. CoreWeave (CRWV), another OpenAI infrastructure provider, and SoftBank Group (JP:9984), a major OpenAI investor, also tumbled.
Spotify (SPOT): Shares of the music streamer dropped about 12% premarket after its projection for premium-subscriber growth fell short of analysts' expectations, raising worries that customers may be put off by a recent price increase.
General Motors (GM): Shares in the automaker rose ahead of the opening bell after its beat Wall Street's forecasts for first-quarter profit and raised its earnings outlook for 2026.
Hilton Worldwide Holdings (HLT): The hotel operator's stock slipped premarket after it reported revenue that fell just short of the average forecast of analysts polled by FactSet.
Coca-Cola (KO): The beverage company's stock climbed ahead of the opening bell after it beat analysts' expectations for earnings and revenue.
United Parcel Service (UPS): Shares of the delivery giant fell more than 4% premarket after it logged lower profit and revenue in the first quarter.
BP (UK:BP): The energy giant's earnings more than doubled in the first quarter, buoyed by its oil-trading unit. BP's London-traded shares rose nearly 3%.
Barclays (UK:BARC): Shares of the British bank fell after its earnings report included one-off charges tied to the collapse of mortgage lender Market Financial Solutions and a planned regulatory redress program for car loans that were allegedly improperly sold.
Contemporary Amperex Technology (HK:3750): The Chinese battery giant, whose shares have rallied in recent weeks as surging oil prices have stoked interest in electric vehicles, said it would raise $5 billion in a share placement. CATL's stock slid nearly 7%.
Visa (V), Starbucks (SBUX) and Robinhood Markets (HOOD): The companies are set to report after markets close today.
This item is part of a Wall Street Journal live coverage event. The full stream can be found by searching P/WSJL (WSJ Live Coverage).`,
  },
  {
    id: 5,
    headline: 'HK Bourse: Announcement From Sinopec On Change In Directors',
    publishedDate: '2026-04-28T12:12:03.365Z',
    industry: 'I/FSL, I/OIL',
    source: 'oil_news',
    body: `For full details, please click on the following link:
https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0428/2026042803709.pdf

Hong Kong Exchanges and Clearing Limited and The Stock Exchange of Hong Kong Limited take no responsibility for the contents of this announcement, make no representation as to its accuracy or completeness and expressly disclaim any liability whatsoever for any loss howsoever arising from or in reliance upon the whole or any part of the contents of this announcement.

(a joint stock limited company incorporated in the People's Republic of China with limited liability)
Appointment of Senior Vice President, Change of Secretary to the Board and Appointment of Representative on Securities Matters and Proposed Election of Director

The board of directors of China Petroleum & Chemical Corporation (the "Company") hereby announces that:
(1) Mr. Chen Yanbin has been appointed as Senior Vice President of the Company;
(2) Due to change of working arrangement, Mr. Huang Wensheng resigned as Secretary to the Board of the Company. Mr. Zhang Zheng has been appointed as Secretary to the Board of the Company;
(3) Mr. Chen Yang has been appointed as Representative on Securities Matters of the Company for the Shanghai Stock Exchange.

Source: Hong Kong Exchanges & Clearing`,
  },
  {
    id: 6,
    headline: 'HK Bourse: Announcement From Sinopec',
    publishedDate: '2026-04-28T12:03:29.225Z',
    industry: 'I/FSL, I/OIL',
    source: 'oil_news',
    body: `For full details, please click on the following link:
https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0428/2026042803646.htm

Listed Company Information
An announcement has just been published by the issuer in the Chinese section of this website, a corresponding version of which may or may not be published in this section.

Source: Hong Kong Exchanges & Clearing`,
  },
  {
    id: 7,
    headline: 'HK Bourse: Announcement From Sinopec',
    publishedDate: '2026-04-28T12:16:40.742Z',
    industry: 'I/FSL, I/OIL',
    source: 'oil_news',
    body: `For full details, please click on the following link:
https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0428/2026042803752.htm

Listed Company Information
An announcement has just been published by the issuer in the Chinese section of this website, a corresponding version of which may or may not be published in this section.

Source: Hong Kong Exchanges & Clearing`,
  },
  {
    id: 8,
    headline: 'HK Bourse: Overseas Regulatory Announcement From Sinopec',
    publishedDate: '2026-04-28T12:32:58.060Z',
    industry: 'I/FSL, I/OIL',
    source: 'oil_news',
    body: `For full details, please click on the following link:
https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0428/2026042803845.pdf

Hong Kong Exchanges and Clearing Limited and The Stock Exchange of Hong Kong Limited take no responsibilities for the contents of this announcement, make no representation as to its accuracy or completeness and expressly disclaim any liability whatsoever for any loss howsoever arising from or in reliance upon the whole or any part of the contents of this announcement.

(a joint stock limited company incorporated in the People's Republic of China with limited liability)
Overseas Regulatory Announcement — China Petroleum & Chemical Corporation
The First Quarterly Report for 2026

This announcement is made pursuant to Rule 13.09 and Rule 13.10B of the Rules Governing the Listing of Securities on The Stock Exchange of Hong Kong Limited and the Inside Information Provisions under Part XIVA of the Securities and Futures Ordinance (Chapter 571, Laws of Hong Kong).

Source: Hong Kong Exchanges & Clearing`,
  },
  {
    id: 9,
    headline: 'HK Bourse: Announcement From Sinopec',
    publishedDate: '2026-04-28T12:25:23.275Z',
    industry: 'I/FSL, I/OIL',
    source: 'oil_news',
    body: `For full details, please click on the following link:
https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0428/2026042803806.htm

Listed Company Information
An announcement has just been published by the issuer in the Chinese section of this website, a corresponding version of which may or may not be published in this section.

Source: Hong Kong Exchanges & Clearing`,
  },
  {
    id: 10,
    headline: 'HK Bourse: Announcement From Sinopec',
    publishedDate: '2026-04-28T12:37:54.988Z',
    industry: 'I/FSL, I/OIL',
    source: 'oil_news',
    body: `For full details, please click on the following link:
https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0428/2026042803880.htm

Listed Company Information
An announcement has just been published by the issuer in the Chinese section of this website, a corresponding version of which may or may not be published in this section.

Source: Hong Kong Exchanges & Clearing`,
  },
]

export const ratesNewsArticles: DowJonesArticle[] = [
  {
    id: 1,
    headline: 'BOE Rates Held Ahead of ECB Decision. Why Europe Is Following the Fed. -- Barrons.com',
    publishedDate: '2026-04-30T11:00:52.481Z',
    industry: '',
    source: 'rates_news',
    body: `By George Glover
The Bank of England held interest rates steady on Thursday, and the European Central Bank is likely to follow suit as policymakers try to figure out how the crisis in the Middle East will affect inflation.
The BOE maintained rates of 3.75% on Thursday as expected. The ECB is also widely expected to hold borrowing costs at 2% for a seventh meeting in a row.
ECB President Christine Lagarde warned in March that the Iran war had "made the outlook significantly more uncertain," suggesting that rates could rise if the conflict sparked a significant flare-up in inflation.
Six weeks later, Iran and the U.S. have agreed a cease-fire. But it's still unclear how long energy prices will remain elevated because of the disruption of shipping through the Strait of Hormuz. That means central bankers are in wait-and-see mode.
Policymakers "are certainly becoming more mindful of the implications of the war for reaching their inflation mandates...Still, this will not sway the majority of panelists to change policy settings this week," Macquarie foreign exchange and rates strategist Thierry Wizman said.
He added that central banks' reliance on backward-looking economic data meant they were likely "to dawdle, rather than hike."
Inflation for the euro area jumped to 2.6% in March, up from 1.9% in February. The European Commission on Wednesday published a survey showing that selling price and household inflation expectations rose in April.
"In one line: Inflation expectations soar, sentiment slumps," Pantheon Macroeconomics' chief euro zone economist Claus Vistesen said.
Write to George Glover at george.glover@dowjones.com
This content was created by Barron's, which is operated by Dow Jones & Co. Barron's is published independently from Dow Jones Newswires and The Wall Street Journal.`,
  },
  {
    id: 2,
    headline: 'BOE Signals It May Raise Rates as Energy Prices Stay High -- WSJ',
    publishedDate: '2026-04-30T11:01:23.920Z',
    industry: '',
    source: 'rates_news',
    body: `By Paul Hannon
The Bank of England Thursday echoed the Federal Reserve in leaving its key interest rate unchanged, and signaled that it may soon raise borrowing costs to contain a surge in inflation triggered by the conflict in the Middle East.
Updates to follow as news develops.`,
  },
  {
    id: 3,
    headline: 'Global Bond Yields Reverse from Highs as Oil Price Declines -- Market Talk',
    publishedDate: '2026-04-30T11:01:52.861Z',
    industry: '',
    source: 'rates_news',
    body: `1101 GMT - Yields on 10-year U.S. Treasurys, U.K. gilts and German Bunds turn negative on the day, retreating from previous highs as oil prices also fall. The 10-year Treasury yield falls 1.2 basis points to last trade at 4.403%, off a one-month high of 4.436%, while the 10-year gilt yield falls 2.1 basis points to 5.032% minutes ahead of the Bank of England's rate decision, off from a one-month high of 5.082%, according to Tradeweb. The 10-year Bund yield is down 1 basis point at 3.084%, having hit 3.146%, the highest since 2011, earlier in the day. (emese.bartha@wsj.com)`,
  },
  {
    id: 4,
    headline: '2-Yr Benchmark Govt Yields - Germany vs Other Nations',
    publishedDate: '2026-04-30T11:10:12.245Z',
    industry: '',
    source: 'rates_news',
    body: `Current Yield and Spread in Basis Points vs Germany:

 Germany         2.702%
 Australia       4.790%      +208.7 bps
 Belgium         2.789%        +8.6 bps
 Canada          3.016%       +31.4 bps
 Denmark         2.459%       -24.4 bps
 France          2.838%       +13.6 bps
 Italy           2.899%       +19.7 bps
 Japan           1.386%      -131.6 bps
 Netherlands     2.684%        -1.8 bps
 Spain           2.791%        +8.9 bps
 Sweden          2.421%       -28.2 bps
 U.K.            4.478%      +177.5 bps
 U.S.            3.900%      +119.8 bps

Source: Tullett Prebon via FactSet`,
  },
]

export const fxNewsArticles: DowJonesArticle[] = [
  {
    id: 1,
    headline: 'Interbank Foreign Exchange Rates At 07:50 EST / 1150 GMT',
    publishedDate: '2026-04-30T11:50:17.261Z',
    industry: '',
    source: 'fx_news',
    body: `Dollar Rates (Latest vs Previous Close):

 USD/JPY  Japan           155.89    prev 160.44    -2.83%
 EUR/USD  Euro            1.1715    prev 1.1675    +0.34%
 GBP/USD  U.K.            1.3526    prev 1.3476    +0.37%
 USD/CHF  Switzerland     0.7844    prev 0.7914    -0.88%
 USD/CAD  Canada          1.3656    prev 1.3684    -0.20%
 AUD/USD  Australia       0.7155    prev 0.7115    +0.56%
 NZD/USD  New Zealand     0.5868    prev 0.5827    +0.70%
 USD/CNY  China           6.8264    prev 6.8373    -0.16%
 USD/HKD  Hong Kong       7.8321    prev 7.8373    -0.07%
 USD/BRL  Brazil          4.9947    prev 5.0187    -0.48%
 USD/MXN  Mexico         17.4894    prev 17.5261   -0.21%
 USD/ZAR  S. Africa      16.7325    prev 16.8190   -0.51%

Source: Tullett Prebon`,
  },
  {
    id: 2,
    headline: "U.A.E. Exit From OPEC Expected to Fuel Global Oil Competition -- Market Talk",
    publishedDate: '2026-04-30T11:54:05.167Z',
    industry: '',
    source: 'fx_news',
    body: `1153 GMT - The United Arab Emirates could increase production independently and compete more aggressively for global market share after leaving OPEC and OPEC+. "Any production cuts by OPEC to support prices would create opportunities for producers outside the cartel to ramp up their own output and gain market share," says Thu Lan Nguyen from Commerzbank.
The U.A.E.'s departure is set to reduce OPEC+'s market share from roughly 48% toward about 44%, weakening the group's overall influence. With significant spare capacity estimated between 700,000 and over 1 million barrels per day, the U.A.E. is well positioned to expand output quickly. (giulia.petroni@wsj.com)`,
  },
  {
    id: 3,
    headline: "Euro Falls to $1.1689 After ECB Decision",
    publishedDate: '2026-04-30T12:18:27.656Z',
    industry: '',
    source: 'fx_news',
    body: `The euro weakened against the dollar following the European Central Bank's interest rate decision, declining from its pre-decision level of $1.1701 to $1.1689. The move reflects market reaction to the ECB's monetary policy signals amid uncertainty over the path of energy prices following the Middle East conflict. The ECB held its key rate at 2.00% for a seventh consecutive meeting.`,
  },
  {
    id: 4,
    headline: "Mexico's Economic Output Shrinks in First Quarter",
    publishedDate: '2026-04-30T12:20:57.810Z',
    industry: '',
    source: 'fx_news',
    body: `By Anthony Harrup
MEXICO CITY -- Mexico's economy contracted 0.8% in Q1 2026 from the previous quarter in seasonally adjusted terms, the first decline in more than a year. Industrial production fell 1.1%, services were down 0.6% and agricultural production was 1.4% lower.
Economic activity is expected to pick up later this year as investors obtain clarity about the July review of the USMCA. The soccer World Cup that Mexico is co-hosting in June and July is expected to contribute to higher consumption.
Write to Anthony Harrup at anthony.harrup@wsj.com`,
  },
  {
    id: 5,
    headline: "Canada GDP Rises 0.2% in February",
    publishedDate: '2026-04-30T12:30:24.262Z',
    industry: '',
    source: 'fx_news',
    body: `By Robb M. Stewart
OTTAWA -- The Canadian economy picked up modestly in February, buoyed for a second month running by goods-producing industries and a rise in manufacturing activity.
GDP rose 0.2% from the month before to 2.348 trillion Canadian dollars (US$1.716 trillion). Compared with a year earlier, GDP increased 1% in February. Early data indicates GDP was essentially unchanged in March. Industry-level GDP expanded 1.7% annualized in Q1 after contracting 0.3% the prior quarter.
Write to Robb M. Stewart at robb.stewart@wsj.com`,
  },
  {
    id: 6,
    headline: "LatAm Political, Economic Calendar - Week Ahead",
    publishedDate: '2026-04-30T13:30:00.004Z',
    industry: '',
    source: 'fx_news',
    body: `Thursday, April 30:
 Colombia: Unemployment Rate — 9.2%
 Colombia: Banco de la Republica rate decision — Benchmark Rate: 11.25%

Friday, May 1 — Labour Day (markets closed: MEX, COL, CHI, BRA, ARG, PER, ECU, VEN)
 Peru April CPI M/M: +2.38%

Monday, May 4:
 Chile IMACEC economic activity Y/Y: -0.3%
 Brazil Manufacturing PMI: 49.0

Tuesday, May 5:
 Brazil Fipe Monthly CPI M/M: +0.59%
 Colombia External Trade Exports Y/Y: +11.4% / Value: $4.21B`,
  },
  {
    id: 7,
    headline: "Eurozone Economic Data Releases Next Week",
    publishedDate: '2026-04-30T14:41:20.652Z',
    industry: '',
    source: 'fx_news',
    body: `By Dow Jones Newswires Staff

Date      GMT   Indicator                  Period   Forecast   Previous
May 4     0745  ITA PMI manufacturing      April      51.9       51.3
May 4     0755  GER PMI manufacturing      April        —        51.2p
May 4     0800  EMU PMI manufacturing      April        —        52.2p
May 6     0755  GER PMI services           April        —        46.9p
May 6     0800  EMU PMI services           April        —        47.4p
May 6     0900  EMU PPI M/M                March        —        -0.7%
May 6     0900  EMU PPI Y/Y                March      +1.6%      -3.0%
May 7     0600  GER Industrial orders M/M  March      +1.0%      +0.9%
May 7     0900  EMU Retail sales M/M       March      +0.1%      -0.2%
May 8     0600  GER Industrial prod M/M    March      +0.5%      -0.3%
May 8     0600  GER Trade balance sa       March        —       +EUR 19.8B`,
  },
]

export const inflationNewsArticles: DowJonesArticle[] = [
  {
    id: 1,
    headline: 'Eurozone Economic Data Releases Next Week',
    publishedDate: '2026-04-30T14:41:20.652Z',
    industry: '',
    source: 'inflation_news',
    body: `By Dow Jones Newswires Staff

Key inflation-related releases for the week of May 4–8, 2026:

May 6 — EMU PPI M/M (March): Forecast N/A, Previous -0.7%
May 6 — EMU PPI Y/Y (March): Forecast +1.6%, Previous -3.0%
May 7 — EMU Retail sales M/M (March): Forecast +0.1%, Previous -0.2%
May 8 — GER Industrial production M/M (March): Forecast +0.5%, Previous -0.3%
May 8 — GER Trade balance sa (March): Previous +EUR 19.8B

Note: ECB held rates at 2.00% on April 30 amid uncertainty over energy price inflation from the Middle East conflict. Eurozone CPI rose to 2.6% in March from 1.9% in February.`,
  },
  {
    id: 2,
    headline: 'LatAm Economic Calendar — CPI & PMI Data Week Ahead',
    publishedDate: '2026-04-30T13:30:00.004Z',
    industry: '',
    source: 'inflation_news',
    body: `Key inflation data releases for Latin America — Week of April 30, 2026:

Thursday, April 30:
 Colombia: Banco de la Republica rate decision — Benchmark Rate: 11.25%

Friday, May 1 (Labour Day — markets closed across region):
 Peru April CPI M/M: +2.38%

Monday, May 4:
 Brazil Manufacturing PMI: 49.0 (contraction territory)
 Chile IMACEC economic activity Y/Y: -0.3%

Tuesday, May 5:
 Brazil Fipe Monthly CPI M/M: +0.59%
 Colombia External Trade Exports Y/Y: +11.4%`,
  },
]

export const employmentNewsArticles: DowJonesArticle[] = [
  {
    id: 1,
    headline: 'Tentative Agreement Reached at Grand River Transit',
    publishedDate: '2026-05-01T00:00:00.506Z',
    industry: '',
    source: 'employment_news',
    body: `WATERLOO, ON, April 30, 2026 /CNW/ - Unifor Local 4304 and the Region of Waterloo have reached a tentative agreement covering approximately 850 Grand River Transit workers, averting a strike that would have begun at 12:01 a.m. on May 1, 2026.
The tentative agreement was reached in the final stage of negotiations, following an overwhelming 93% strike mandate delivered by members earlier this month. Bargaining focused on wages, scheduling, and benefits — priorities identified by members at the outset of this round.
Members will vote on the deal at a ratification meeting on Sunday, May 3, 2026. Details of the tentative agreement will not be released publicly until members have had the opportunity to review and vote on the contract.
Unifor Local 4304 represents approximately 850 workers at Grand River Transit, including operators, maintenance technicians, service attendants, and reservationists. Unifor is Canada's largest private-sector union, representing 320,000 workers across all major areas of the economy.`,
  },
]

export const tradeNewsArticles: DowJonesArticle[] = [
  {
    id: 1,
    headline: 'U.S. Export Sales: Weekly Sales Totals — Apr 30',
    publishedDate: '2026-04-30T12:33:10.939Z',
    industry: '',
    source: 'trade_news',
    body: `For the week ended Apr 23, in thousand metric tons (cotton in thousand running bales). Source: USDA

                    Wk Net Chg         Total Commits    Undelivered Sales
                   This Yr  Next Yr  This Yr  Last Yr  This Yr   Next Yr
wheat               226.1    156.7   24,682   21,340   3,260     1,491
corn               1,598       0.0   75,701   58,749   21,617    1,930
soybeans            258.1      3.0   38,776   47,221   6,063       251
soymeal             294.9      0.3   14,354   12,351   4,065       219
upland cotton       162.9    105.7   10,692   10,859   3,303     1,338
sorghum              12.7      0.0    4,667    1,377   1,036         0
rice                 39.0      0.0    2,339    2,725     603         7`,
  },
  {
    id: 2,
    headline: 'U.S. Export Sales: Net Sales for All Wheat — Apr 30',
    publishedDate: '2026-04-30T12:40:20.799Z',
    industry: '',
    source: 'trade_news',
    body: `For Week Ending Apr 23, thousand metric tons. Jun–May marketing year. Source: USDA

New Sales — Current Marketing Year Total: 234.5k MT

Top Destinations (Net Sales / Exports This Week):
 Japan             1.4 /  69.1
 Korea Republic    6.2 /  55.0
 Mexico           10.5 /  89.4
 Philippines       3.6 /  84.9
 Algeria          19.7 /  19.7
 Indonesia        70.0 /   0.0
 Taiwan           40.1 /   0.0
 Nigeria          33.4 /   0.0
 Honduras         13.8 /  11.0

GRAND TOTAL      226.1 / 410.4  (net sales / exports this week)
Next Year Sales: 156.7k MT`,
  },
  {
    id: 3,
    headline: 'U.S. Export Sales: Net Sales for Soybeans — Apr 30',
    publishedDate: '2026-04-30T12:34:07.838Z',
    industry: '',
    source: 'trade_news',
    body: `For Week Ending Apr 23, thousand metric tons. Sep–Aug marketing year. Source: USDA

New Sales — Current Marketing Year Total: 322.2k MT

Top Destinations (Net Sales / Exports This Week):
 China           199.2 / 315.2
 Egypt           112.1 /  48.1
 Indonesia        70.8 /  79.8
 Colombia         49.4 /  23.4
 Canada           27.6 /   4.4
 Taiwan           20.1 /   7.7
 Vietnam           5.7 /   9.8
 Mexico            1.3 /  81.8

GRAND TOTAL      258.1 / 610.6  (net sales / exports this week)
Next Year Sales: 3.0k MT`,
  },
  {
    id: 4,
    headline: 'U.S. Export Sales and Shipments: Soymeal — Apr 30',
    publishedDate: '2026-04-30T12:39:10.582Z',
    industry: '',
    source: 'trade_news',
    body: `For the week ended Apr 23, thousand metric tons. Oct 1 marketing year. Source: USDA

Top Destinations (Wk Net Chg / Wk Shipments / Season Shipments / Season Total):
 Mexico           54.6 /  73.8 / 1,646 / 2,309
 Philippines     103.8 / 103.5 / 2,134 / 2,882
 Colombia         31.1 /  51.1 / 1,290 / 1,615
 Canada           11.1 /  19.2 /   516 /   899
 Dominican Rep    52.4 /  33.0 /   411 /   565
 Ecuador           2.0 /   0.0 /   498 /   619
 Vietnam           1.2 /   5.0 /   550 /   593
 Venezuela        25.3 /   5.3 /   336 /   426

GRAND TOTAL      294.9 / 387.2 / 10,289 / 14,354`,
  },
  {
    id: 5,
    headline: 'USDA Exp Sales: Corn 25-26 Net 1.6M Tons',
    publishedDate: '2026-04-30T12:30:09.593Z',
    industry: '',
    source: 'trade_news',
    body: `USDA weekly export sales — Corn
Current marketing year (25-26): Net 1,597,800 metric tons
Season total: 75,701,300 MT vs 58,748,500 last year (+28.8%)
Undelivered sales: 21,617,300 metric tons
Source: USDA, week ending April 23, 2026`,
  },
  {
    id: 6,
    headline: 'USDA Exp Sales: Cotton 25-26 Net 162,900 Bales; 26-27 105,700',
    publishedDate: '2026-04-30T12:30:09.647Z',
    industry: '',
    source: 'trade_news',
    body: `USDA weekly export sales — Upland Cotton
Current marketing year (25-26): Net 162,900 running bales
Next marketing year (26-27): Net 105,700 running bales
Season total: 10,691,500 bales vs 10,859,100 last year (-1.5%)
Source: USDA, week ending April 23, 2026`,
  },
  {
    id: 7,
    headline: 'USDA Exp Sales: Rice 25-26 Net 39,000 Tons',
    publishedDate: '2026-04-30T12:30:09.637Z',
    industry: '',
    source: 'trade_news',
    body: `USDA weekly export sales — Rice
Current marketing year (25-26): Net 39,000 metric tons
Season total: 2,338,900 MT vs 2,725,000 last year (-14.2%)
Undelivered sales: 602,900 metric tons
Source: USDA, week ending April 23, 2026`,
  },
]
