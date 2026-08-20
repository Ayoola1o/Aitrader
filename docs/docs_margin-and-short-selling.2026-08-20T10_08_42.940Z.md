For AI agents: visit https://docs.alpaca.markets/us/llms.txt for an index of all pages formatted in Markdown and endpoints in OpenAPI.

> In order to trade on margin or sell short, you must have $2,000 or more account equity. Accounts with less than $2,000 will not have access to these features and will be restricted to 1x buying power.
>
> This is only for Equities Trading. Margin Trading for Crypto is not applicable.

# How Margin Works   [Skip link to How Margin Works](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#how-margin-works)

Trading on margin allows you to trade and hold securities with a value that exceeds your account equity. This is made possible by funds loaned to you by your broker, who uses your account’s cash and securities as collateral. For example, a Reg T Margin Account holding $10,000 cash may purchase and hold up to $20,000 in marginable securities overnight (Note: some securities may have a higher maintenance margin requirement making the full 2x overnight buying power effectively unavailable). In addition to the 2x buying power afforded to margin accounts, a Reg T Margin Account with $2,000 or greater equity can further be allowed to use up to 4x intraday buying power. As an example, an account holding $50,000 cash may purchase and hold up to $200,000 in securities intraday; however, to avoid receiving a margin call the next morning, the securities held would need to be reduced to $100,000 or less depending on the maintenance margin requirement by the end of the day.

## Initial Margin   [Skip link to Initial Margin](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#initial-margin)

Initial margin denotes the percentage of the trade price of a security or basket of securities that an account holder must pay for with available cash in the margin account, additions to cash in the margin account or other marginable securities.

Alpaca applies a minimum initial margin requirement of 50% for marginable securities and 100% for non-marginable securities per Regulation T of the Federal Reserve Board.

## Maintenance Margin   [Skip link to Maintenance Margin](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#maintenance-margin)

Maintenance margin is the amount of cash or marginable securities required to continue holding an open position. FINRA has set the minimum maintenance requirement to at least 25% of the total market value of the securities, but brokers are free to set higher requirements as part of their risk management.

Alpaca uses the following table to calculate the overnight maintenance margin applied to each security held in an account:

| Position Side | Condition | Margin Requirement |
| --- | --- | --- |
| LONG | share price < $2.50 | 100% of EOD market value |
| LONG | share price between $2.50 & $6.00 | 50% of EOD market value |
| LONG | share price > $6.00 | 30% of EOD market value |
| LONG | 2x Leveraged ETF | 50% of EOD market value |
| LONG | 3x Leveraged ETF | 75% of EOD market value |
| SHORT | share price < $5.00 | Greater of $2.50/share or 100% |
| SHORT | share price >= $5.00 | Greater of $5.00/share or 30% |

## Margin Calls   [Skip link to Margin Calls](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#margin-calls)

If your account does not satisfy its initial and maintenance margin requirements at the end of the day, you will receive a margin call the following morning. We will contact you and advise you of the call amount that you will need to satisfy either by depositing new funds or liquidating some or all of your positions to reduce your margin requirement sufficiently.

We may contact you prior to the end of the day and ask you to liquidate your positions immediately in the event that your account equity is materially below your maintenance requirement. Furthermore, although we will make every effort to contact you so that you can determine how to best resolve your margin call, we reserve the right to liquidate your holdings in the event we cannot get ahold of you and your account equity is in danger of turning negative.

Calculating and tracking your margin requirement at all times is helpful to avoid receiving a margin call. We strongly recommend doing so if you plan to aggressively use overnight leverage. Please use a 50% initial requirement and refer to the maintenance margin table above. In the future, we will provide real-time estimated initial and maintenance margin values as part of the Account API to help users better manage their risk.

# Margin Interest Rate   [Skip link to Margin Interest Rate](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#margin-interest-rate)

We are pleased to offer a competitive and low annual margin interest rate of 4.75% for elite users and 6.25% for non-elite users (check “Alpaca Securities Brokerage Fee Schedule” on **Important Disclosures** for the latest rate).

The rate is charged only on your account’s end of day (overnight) debit balance using the following calculation:

`daily_margin_interest_charge = (settlement_date_debit_balance * rate[non-elite: 0.0625 | elite: 0.0475])) / 360`

Interest will accrue daily and post to your account at the end of each month. Note that if you have a settlement date debit balance as of the end of day Friday, you will incur interest charges for 3 days (Fri, Sat, Sun).

As an example, if you are a regular trader and deposited $10,000 into your account and bought $15,000 worth of securities that you held at the end of the day, you would be borrowing $5,000 overnight and would incur a daily interest expense of ($5000 \* 0.0625) / 360 = $0.87.

On the other hand, if you deposited $10,000 and bought $15,000 worth of stock that you liquidated the same day, you would not incur any interest expense. In other words, this allows you to make use of the additional buying power for intraday trading without any cost.

# Concentrated Margin Requirements   [Skip link to Concentrated Margin Requirements](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#concentrated-margin-requirements)

Accounts concentrated into a single position will see an increased maintenance margin rate on the symbol in which the account is concentrated.

1. Concentration is defined as a single security accounting for 70% of the market value of equities and the account is carrying a margin balance of $100,000 or more.
2. The Maintenance Margin Rate on the concentrated position will increase to 50%.

# Short Selling & Locates API Guide   [Skip link to Short Selling & Locates API Guide](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#short-selling--locates-api-guide)

## 1\. Overview & Regulatory Context   [Skip link to 1. Overview & Regulatory Context](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#1-overview--regulatory-context)

Short selling involves selling a security the seller does not own, which requires borrowing stock. In a typical short sale, a trader borrows shares, sells them in the market, and later buys shares back to close the position.

Because short sales depend on the ability to deliver borrowed shares, US market structure includes strict rules designed to address delivery and locate requirements:

- **Regulation SHO:** Under Regulation SHO, before accepting or effecting a short sale order in an equity security, a broker-dealer generally must have borrowed the security, entered into a bona fide arrangement to borrow it, or have reasonable grounds to believe the security can be borrowed and delivered when delivery is due.
- **The "Locate" Requirement:** That "reasonable grounds" concept is where locate workflows become important. A locate helps establish whether shares are available to borrow before a short sale is opened.

## 2\. Core Short Selling Rules & Fees   [Skip link to 2. Core Short Selling Rules & Fees](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#2-core-short-selling-rules--fees)

### Easy-to-Borrow (ETB) Securities   [Skip link to Easy-to-Borrow (ETB) Securities](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#easy-to-borrow-etb-securities)

- **Fees:** $0 locate and borrow fees on all ETB shares for Trading API users.
- **Workflow:** Workflow: Alpaca offers 5,000+ ETB (Easy-to-Borrow) securities that are approved for locates with zero fees. If a security is ETB, you can proceed with short sale given that locates have been established by Alpaca.

### Hard-to-Borrow (HTB) Securities   [Skip link to Hard-to-Borrow (HTB) Securities](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#hard-to-borrow-htb-securities)

- **Requirements:** Restricted to eligible margin accounts and requires an approved locate before a short-sale order can be submitted.
- **Round Lots Only:** Locate requests must be submitted in round lots of 100 shares.
- **Single-Use:** Currently, locates cannot be reused. If you enter a short position and cover it, the original locate quantity is not replenished. To short the same security again later, you must request a new locate.
- **Non-Refundable:** Locate fees are separate from daily stock borrow fees and are not credited back if you choose not to use the locate.

### Daily Stock Borrow Fee Calculation   [Skip link to Daily Stock Borrow Fee Calculation](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#daily-stock-borrow-fee-calculation)

If you hold an HTB short at any time during the day, you will incur a daily stock borrow fee:

`Daily stock borrow fee = Daily HTB stock borrow fee`

Where,

`Daily HTB stock borrow fee = Σ((each stock’s HTB short $ market value _ that stock’s HTB rate) / 360)`

> \*\*Please note that if you hold HTB short positions as of a Friday settlement date, you will incur stock borrow fees for 3 days (Fri, Sat, Sun). HTB stock borrow fees are charged in the nearest round lot (100 shares), regardless of the actual number of shares shorted. This is because stocks are borrowed in round lots.

## 3\. How Alpaca’s Locates Workflow Works   [Skip link to 3. How Alpaca’s Locates Workflow Works](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#3-how-alpacas-locates-workflow-works)

Alpaca’s API supports the core HTB workflow from checking borrow status to reserving inventory and tracking locate records.

### Step 1: Check Borrow Status   [Skip link to Step 1: Check Borrow Status](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#step-1-check-borrow-status)

Before entering the locate workflow, check whether a symbol is ETB or HTB using the Assets endpoint.

HTTP

```http
GET /v2/assets/{symbol}
```

#### Example Request   [Skip link to Example Request](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#example-request)

HTTP

```http
GET /v2/assets/TSLA
```

#### Sample Response   [Skip link to Sample Response](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#sample-response)

JSON

```json
{
  "id": "b6d1aa75-5c9c-4353-a305-9e2caa1925ab",
  "class": "us_equity",
  "exchange": "NASDAQ",
  "symbol": "TSLA",
  "name": "Tesla, Inc.",
  "status": "active",
  "tradable": true,
  "shortable": true,
  "borrow_status": "hard_to_borrow"
}
```

- `easy_to_borrow`: Follow the standard shorting path.
- `hard_to_borrow`: A locate is strictly required before opening a short position.

### Step 2: Preview Locate Quotes   [Skip link to Step 2: Preview Locate Quotes](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#step-2-preview-locate-quotes)

For HTB symbols, preview real-time, account-specific availability and pricing. Quotes are advisory and do not reserve shares.

HTTP

```http
GET /v1/locates/quotes?symbols={symbols}
```

#### Example Request   [Skip link to Example Request](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#example-request-1)

HTTP

```http
GET /v1/locates/quotes?symbols=TSLA,AAPL
```

#### Sample Response   [Skip link to Sample Response](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#sample-response-1)

JSON

```json
{
  "quotes": [\
    {\
      "symbol": "TSLA",\
      "available_qty": 1000,\
      "price": "0.0123",\
      "quoted_at": "2026-01-02T15:04:05Z"\
    }\
  ],
  "errors": [\
    {\
      "symbol": "AAPL",\
      "code": "easy_to_borrow",\
      "message": "symbol is easy to borrow"\
    }\
  ]
}
```

> **Note:** Quote responses can include both quote objects and per-symbol errors, making it easy to process mixed ETB/HTB symbol lists in a single request.

### Step 3: Request a Locate   [Skip link to Step 3: Request a Locate](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#step-3-request-a-locate)

When a quote satisfies your availability and cost criteria, submit a locate request to reserve the inventory.

HTTP

```http
POST /v1/locates
```

#### Sample Request Body   [Skip link to Sample Request Body](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#sample-request-body)

JSON

```json
{
  "symbol": "TSLA",
  "qty": 100,
  "limit_price": "0.05",
  "all_or_none": true
}
```

- `limit_price` _(Optional)_: Sets a maximum acceptable fee per share.
- `all_or_none` _(Optional)_: Enforces that the total requested quantity must be filled or the request will be rejected.

#### Sample Active Response   [Skip link to Sample Active Response](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#sample-active-response)

JSON

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "TSLA",
  "requested_qty": 100,
  "limit_price": "0.05",
  "all_or_none": true,
  "status": "active",
  "created_at": "2026-01-02T15:04:05Z",
  "located_qty": 100,
  "located_price": "0.05",
  "total_fee": "5.00",
  "expires_at": "2026-01-03T01:00:00Z"
}
```

_A request may be rejected if inventory is depleted, the available price exceeds your `limit_price`, or other compliance conditions are not met._

### Step 4: Track Locate Status and History   [Skip link to Step 4: Track Locate Status and History](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#step-4-track-locate-status-and-history)

Retrieve locate records for monitoring, reconciliation, and audit purposes.

HTTP

```http
GET /v1/locates?status=active&symbol=TSLA&limit=100
```

#### Sample Response   [Skip link to Sample Response](https://docs.alpaca.markets/us/docs/margin-and-short-selling\#sample-response-2)

JSON

```json
{
  "locates": [\
    {\
      "id": "550e8400-e29b-41d4-a716-446655440000",\
      "symbol": "TSLA",\
      "requested_qty": 100,\
      "limit_price": "0.05",\
      "all_or_none": true,\
      "status": "active",\
      "created_at": "2026-01-02T15:04:05Z",\
      "located_qty": 100,\
      "located_price": "0.05",\
      "total_fee": "5.00",\
      "expires_at": "2026-01-03T01:00:00Z"\
    }\
  ],
  "next_page_token": null
}
```

You can also retrieve a single locate record directly by its unique ID:

HTTP

```http
GET /v1/locates/{locate_id}
```

* * *

**Margin trading involves significant risk and is not suitable for all investors.** Before considering a margin loan, it is crucial that you carefully consider how borrowing fits with your investment objectives and risk tolerance. When trading on margin, you assume higher market risk, and potential losses can exceed the collateral value in your account. Alpaca may sell any securities in your account, without prior notice, to satisfy a margin call. Alpaca may also change its “house” maintenance margin requirements at any time without advance written notice. You are not entitled to an extension of time on a margin call. Please review the Firm’s [Margin Disclosure Statement](https://files.alpaca.markets/disclosures/library/MarginDiscStmt.pdf) before investing.

Updatedabout 2 months ago

* * *

Did this page help you?

Yes

No

Copy Page