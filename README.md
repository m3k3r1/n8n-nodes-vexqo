# n8n-nodes-vexqo

Use [Vexqo](https://vexqo.dev) in n8n to search Meta ads and eBay listings, read public social posts, extract Shopify products, and find ads associated with a product.

One Vexqo API key covers every operation. Requests use your Vexqo credits.

## Installation

The first npm release is being prepared. This node is not yet verified for n8n Cloud.

Once published, install `n8n-nodes-vexqo` in self-hosted n8n from **Settings → Community nodes → Install**. See the [n8n installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Credentials

1. Get an API key at [vexqo.dev](https://vexqo.dev).
2. Add a **Vexqo API** credential in n8n and paste the key into **API Key**.
3. Test the credential. The test reads `/account` to check access.

The key is sent in the `X-API-Key` header to `https://api.vexqo.dev`. Keep it in n8n credentials, not workflow fields or exported JSON.

## Operations

| Resource | Operations |
| --- | --- |
| Meta Ad | Search by keyword or advertiser page ID; get an ad by archive ID |
| eBay | Search active listings; get a listing by item ID |
| TikTok | Get a public post by URL or ID; get a public profile |
| Instagram | Get a public post; get a public profile; get its available post preview |
| Shopify Product | Extract a product from its public URL, including a selected variant |
| Product Research | Find Meta ads for a Shopify product, with store ads, other sellers and possible matches in separate groups |
| Account | Read credits, limits and account-specific prices |

## Usage

### Save ads to a spreadsheet

Connect a trigger to **Vexqo → Meta Ad → Search**. Enter a keyword, select a country, and choose **One Item per Result** under **Output**. Connect Google Sheets to append the returned ads.

### Check a product

Choose **Shopify Product → Get Product** and enter its full public product URL. Include `?variant=ID` to select a variant. Exact inventory quantities are not always public.

Choose **Product Research → Research Product** to find related ads and linked sellers. Research normally costs **100 credits per completed request**, including empty or partial results. Check your account for its rates. Possible matches are candidates, not confirmed sellers of the same product.

### Responses and pagination

**Full Response** is the default. It preserves pagination, collection status and other metadata returned by Vexqo. Meta search, eBay search and Instagram profile posts also support **One Item per Result**, which outputs only individual results.

Search operations request one page at a time. For eBay, set **Page**. For Meta, pass the returned cursor in **Options → Cursor**. This node does not automatically fetch more pages or retry research.

## Limits and costs

- TikTok and Instagram support known-post and profile lookups, not keyword search.
- Instagram profile posts may be a partial preview. Read the collection fields in Full Response.
- eBay search returns active listings, not sold-price history. Schedule repeated lookups and save observations to track changes.
- Meta EU reach and audience fields depend on what Meta publishes. Missing values do not mean zero.
- **Proxy Country** selects a collection exit country. It does not filter social audiences or select an eBay marketplace.
- Optional Meta enrichment and eBay modes can change credit costs. Check **Account → Get** and the [API docs](https://docs.vexqo.dev) for current prices and limits.
- API errors remain failed node executions. Handle rate limits in your workflow; avoid repeatedly retrying paid research.

## Compatibility

Requires n8n **2.46.1 or later**. Tested with n8n **2.49.7** and Node.js 22. Uses n8n's declarative HTTP routing with no external runtime dependencies.

## Development

```sh
npm ci --ignore-scripts
npm run build
npm run lint
N8N_BINARY=/absolute/path/to/n8n npm test
```

The suite loads the compiled node in real n8n with a temporary database. A test-only loader directs requests to a local fixture server. It checks all operations, query/body encoding, credentials, output modes, HTTP failures and path validation. It uses a synthetic key and does not call Vexqo or external destinations.

See [RELEASING.md](RELEASING.md) for publishing setup.

## Links

- [API docs](https://docs.vexqo.dev)
- [Example workflows](https://vexqo.dev/n8n-workflows/)
- [Issues](https://github.com/m3k3r1/n8n-nodes-vexqo/issues)
- [Changelog](CHANGELOG.md)

MIT licensed. [n8n](https://n8n.io) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.
