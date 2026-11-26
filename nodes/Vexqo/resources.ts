import type { INodeProperties, INodePropertyOptions, IHttpRequestOptions } from 'n8n-workflow';

type Resource = 'account' | 'ebay' | 'instagram' | 'meta' | 'research' | 'shopify' | 'tiktok';
type Operation = {
	name: string;
	value: string;
	action: string;
	description: string;
	method?: IHttpRequestOptions['method'];
	url: string;
	fields?: INodeProperties[];
};

function query(
	displayName: string,
	name: string,
	type: INodeProperties['type'],
	defaultValue: INodeProperties['default'],
	description: string,
	extra: Partial<INodeProperties> = {},
): INodeProperties {
	return {
		displayName,
		name: name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
		type,
		default: defaultValue,
		description,
		routing: { send: { type: 'query', property: name } },
		...extra,
	};
}
function text(
	displayName: string,
	name: string,
	description: string,
	placeholder: string,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: '',
		required: true,
		description,
		placeholder,
	};
}
function choices(
	displayName: string,
	name: string,
	values: Array<[string, string]>,
	defaultValue: string,
	description: string,
): INodeProperties {
	return query(displayName, name, 'options', defaultValue, description, {
		options: values.map(([label, value]) => ({ name: label, value })),
	});
}
function options(fields: INodeProperties[]): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: fields.sort((a, b) => a.displayName.localeCompare(b.displayName)),
	};
}
const limit = (value: number, max: number) =>
	query('Limit', 'limit', 'number', value, 'Max number of results to return', {
		typeOptions: { minValue: 1, maxValue: max, numberPrecision: 0 },
	});
const view = () =>
	choices(
		'Response Format',
		'view',
		[
			['Compact', 'compact'],
			['Raw', 'raw'],
		],
		'compact',
		'Compact creative groups or original source fields; same collection and credit cost',
	);
const proxyCountry = () =>
	query(
		'Proxy Country',
		'country',
		'string',
		'',
		'Two-letter proxy exit country; does not filter audiences or select an eBay marketplace',
		{ placeholder: 'US' },
	);
const socialOptions = () =>
	options([
		query(
			'Maximum Cached Age',
			'max_age',
			'number',
			0,
			'Maximum acceptable cache age in seconds; 0 collects fresh and cached results have the same credit cost',
			{ typeOptions: { minValue: 0, maxValue: 300, numberPrecision: 0 } },
		),
		proxyCountry(),
	]);
const username = () =>
	text('Username', 'username', 'Public profile username without the @ prefix', 'example');
const postTarget = () =>
	query(
		'Post URL or ID',
		'target',
		'string',
		'',
		'Full public HTTPS post URL or post ID; short links are unsupported',
		{ required: true, placeholder: 'https://www.tiktok.com/@example/video/1234567890' },
	);
const productUrl = (): INodeProperties => ({
	...text(
		'Product URL',
		'productUrl',
		'Public Shopify product URL; include ?variant=ID to select a variant',
		'https://store.example/products/item',
	),
	routing: { send: { type: 'body', property: 'url' } },
});

export const resourceOperations: Record<Resource, Operation[]> = {
	account: [
		{
			name: 'Get',
			value: 'get',
			action: 'Get account details',
			description: 'Read credits, rate limits and account-specific prices',
			url: '/account',
		},
	],
	ebay: [
		{
			name: 'Get Listing',
			value: 'getListing',
			action: 'Get an eBay listing',
			description: 'Read a listing by its numeric item ID',
			url: '=/ebay/listings/{{ toPathSegment($parameter.listingId) }}',
			fields: [
				text('Listing ID', 'listingId', 'Numeric eBay item ID; keep it as text', '123456789012'),
				options([
					choices(
						'Collection Mode',
						'mode',
						[
							['Automatic', 'auto'],
							['Browser', 'browser'],
							['HTTP', 'http'],
						],
						'auto',
						'Automatic mode costs 4 credits; explicit browser mode can cost more',
					),
					proxyCountry(),
					query(
						'Include HTML',
						'include_html',
						'boolean',
						false,
						'Whether to include source HTML in the response',
					),
				]),
			],
		},
		{
			name: 'Search',
			value: 'search',
			action: 'Search eBay listings',
			description: 'Search one page of active listings',
			url: '/ebay/search',
			fields: [
				query('Search Query', 'q', 'string', '', 'Words to search for in active eBay listings', {
					required: true,
					placeholder: 'vintage camera',
				}),
				query('Page', 'page', 'number', 1, 'Page number to request', {
					typeOptions: { minValue: 1, maxValue: 100, numberPrecision: 0 },
				}),
				query(
					'Results per Page',
					'per_page',
					'options',
					60,
					'Number of results requested per page',
					{
						options: [
							{ name: '60', value: 60 },
							{ name: '120', value: 120 },
							{ name: '240', value: 240 },
						],
					},
				),
				options([
					choices(
						'Sort',
						'sort',
						[
							['Best Match', 'best_match'],
							['Ending Soonest', 'ending_soonest'],
							['Newly Listed', 'newly_listed'],
							['Price: Highest', 'price_highest'],
							['Price: Lowest', 'price_lowest'],
						],
						'best_match',
						'Order of search results',
					),
					choices(
						'Buying Format',
						'buying_format',
						[
							['All', 'all'],
							['Auction', 'auction'],
							['Buy It Now', 'buy_it_now'],
						],
						'all',
						'Buying format to include',
					),
					choices(
						'Condition',
						'condition',
						[
							['Any', 'any'],
							['New', 'new'],
							['Used', 'used'],
						],
						'any',
						'Item condition to include',
					),
					query(
						'Minimum Price (USD)',
						'min_price',
						'number',
						0,
						'Minimum price filter in USD; excludes shipping',
						{ typeOptions: { minValue: 0 } },
					),
					query(
						'Maximum Price (USD)',
						'max_price',
						'number',
						100,
						'Maximum price filter in USD; excludes shipping',
						{ typeOptions: { minValue: 0 } },
					),
					query('Category ID', 'category_id', 'string', '', 'Numeric eBay category ID', {
						placeholder: '625',
					}),
					proxyCountry(),
				]),
			],
		},
	],
	instagram: [
		{
			name: 'Get Post',
			value: 'getPost',
			action: 'Get an Instagram post',
			description: 'Read a public Instagram post or reel',
			url: '/instagram/posts',
			fields: [
				{ ...postTarget(), placeholder: 'https://www.instagram.com/p/EXAMPLE/' },
				socialOptions(),
			],
		},
		{
			name: 'Get Profile',
			value: 'getProfile',
			action: 'Get an Instagram profile',
			description: 'Read a public Instagram profile',
			url: '=/instagram/profiles/{{ toPathSegment($parameter.username) }}',
			fields: [username(), socialOptions()],
		},
		{
			name: 'Get Profile Posts',
			value: 'getProfilePosts',
			action: 'Get Instagram profile posts',
			description: 'Read up to 12 posts from the public profile preview',
			url: '=/instagram/profiles/{{ toPathSegment($parameter.username) }}/posts',
			fields: [
				username(),
				limit(12, 12),
				socialOptions(),
				{
					displayName:
						'This is a partial public preview, not complete history. Pagination is not supported.',
					name: 'previewNotice',
					type: 'notice',
					default: '',
				},
			],
		},
	],
	meta: [
		{
			name: 'Get Ad',
			value: 'getAd',
			action: 'Get a Meta ad',
			description: 'Read one ad with its available detail panel',
			url: '=/facebook/ads/{{ toPathSegment($parameter.adId) }}',
			fields: [
				text('Ad ID', 'adId', 'Numeric Meta Ad Library archive ID', '123456789012345'),
				view(),
				options([
					query(
						'Include Creative Assets',
						'include_creative_assets',
						'boolean',
						false,
						'Whether to add the creative asset index; no extra credits',
					),
				]),
			],
		},
		{
			name: 'Search',
			value: 'search',
			action: 'Search Meta ads',
			description: 'Search a page of ads by keyword or advertiser',
			url: '/facebook/ads',
			fields: [
				{
					displayName: 'Search By',
					name: 'searchBy',
					type: 'options',
					noDataExpression: true,
					options: [
						{ name: 'Keyword', value: 'keyword' },
						{ name: 'Advertiser Page ID', value: 'advertiser' },
					],
					default: 'keyword',
				},
				query('Keyword', 'q', 'string', '', 'Keyword or phrase to search for', {
					required: true,
					placeholder: 'running shoes',
					displayOptions: { show: { searchBy: ['keyword'] } },
				}),
				query('Advertiser Page ID', 'page_id', 'string', '', 'Numeric advertiser page ID', {
					required: true,
					placeholder: '123456789012345',
					displayOptions: { show: { searchBy: ['advertiser'] } },
				}),
				query(
					'Country',
					'country',
					'string',
					'ALL',
					'Ad Library country filter: two-letter country code or ALL',
					{ placeholder: 'DE' },
				),
				limit(30, 100),
				view(),
				options([
					choices(
						'Active Status',
						'active_status',
						[
							['Active', 'active'],
							['All', 'all'],
							['Inactive', 'inactive'],
						],
						'active',
						'Status filter; omit to use the API date-aware default',
					),
					choices(
						'Search Type',
						'search_type',
						[
							['Exact Phrase', 'keyword_exact_phrase'],
							['Unordered Keywords', 'keyword_unordered'],
						],
						'keyword_unordered',
						'How the keyword query is matched',
					),
					choices(
						'Ad Type',
						'ad_type',
						[
							['All', 'all'],
							['Credit', 'credit_ads'],
							['Employment', 'employment_ads'],
							['Housing', 'housing_ads'],
							['Political and Issue', 'political_and_issue_ads'],
						],
						'all',
						'Ad category filter',
					),
					choices(
						'Media Type',
						'media_type',
						[
							['All', 'all'],
							['Image', 'image'],
							['Image and Meme', 'image_and_meme'],
							['Meme', 'meme'],
							['None', 'none'],
							['Video', 'video'],
						],
						'all',
						'Creative media filter',
					),
					query(
						'Start Date',
						'start_date',
						'string',
						'',
						'First day ads ran in the period, YYYY-MM-DD; not ad creation date',
						{ placeholder: '2026-11-01' },
					),
					query(
						'End Date',
						'end_date',
						'string',
						'',
						'Last day of the period, YYYY-MM-DD, inclusive',
						{ placeholder: '2026-11-26' },
					),
					query(
						'Include Ad Details',
						'include_ad_details',
						'boolean',
						false,
						'Whether to fetch available detail panels, including published EU reach; normally 2 extra credits per panel',
					),
					query(
						'Include Creative Assets',
						'include_creative_assets',
						'boolean',
						false,
						'Whether to include the creative asset index; no extra credits',
					),
					query(
						'Include Page Information',
						'include_page_info',
						'boolean',
						false,
						'Whether to include advertiser page details; no extra credits',
					),
					query(
						'Include Products',
						'include_products',
						'boolean',
						false,
						'Whether to extract destination products; normally 1 extra credit per link that answers',
					),
					query('Platforms', 'platforms', 'string', '', 'Comma-separated publisher platforms', {
						placeholder: 'facebook,instagram',
					}),
					query('Languages', 'languages', 'string', '', 'Comma-separated language codes', {
						placeholder: 'en,de',
					}),
					choices(
						'Sort By',
						'sort_by',
						[
							['Relevancy', 'relevancy_monthly_grouped'],
							['Total Impressions', 'total_impressions'],
						],
						'total_impressions',
						'Meta search ordering',
					),
					query(
						'Cursor',
						'cursor',
						'string',
						'',
						'Opaque cursor from the previous response; reuse the same search filters',
					),
				]),
			],
		},
	],
	research: [
		{
			name: 'Research Product',
			value: 'research',
			action: 'Research a product',
			description: 'Connect a Shopify product to Meta ads and other sellers',
			method: 'POST',
			url: '/research',
			fields: [
				productUrl(),
				{
					displayName:
						'Normally 100 credits per completed request, including empty or partial results. Read account-specific rates before running batches.',
					name: 'researchCost',
					type: 'notice',
					default: '',
				},
				{
					...query(
						'Country',
						'country',
						'string',
						'ALL',
						'Meta Ad Library country filter: two-letter code or ALL',
					),
					routing: { send: { type: 'body', property: 'country' } },
				},
				{ ...limit(10, 30), routing: { send: { type: 'body', property: 'limit' } } },
			],
		},
	],
	shopify: [
		{
			name: 'Get Product',
			value: 'getProduct',
			action: 'Get a Shopify product',
			description: 'Extract public product prices, variants and availability',
			method: 'POST',
			url: '/shopify',
			fields: [productUrl()],
		},
	],
	tiktok: [
		{
			name: 'Get Post',
			value: 'getPost',
			action: 'Get a TikTok post',
			description: 'Read a public TikTok video or photo post',
			url: '/tiktok/posts',
			fields: [postTarget(), socialOptions()],
		},
		{
			name: 'Get Profile',
			value: 'getProfile',
			action: 'Get a TikTok profile',
			description: 'Read a public TikTok profile',
			url: '=/tiktok/profiles/{{ toPathSegment($parameter.username) }}',
			fields: [username(), socialOptions()],
		},
	],
};

function operationOption({
	name,
	value,
	action,
	description,
	method,
	url,
}: Operation): INodePropertyOptions {
	return {
		name,
		value,
		action,
		description,
		routing: { request: { method: method ?? 'GET', url } },
	};
}

function outputChoice(resource: string, operation: string, root: string): INodeProperties {
	return {
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'response',
		description:
			'Full response keeps pagination, warnings and metering; items returns one n8n item per result',
		displayOptions: { show: { resource: [resource], operation: [operation] } },
		options: [
			{ name: 'Full Response', value: 'response' },
			{
				name: 'One Item per Result',
				value: 'items',
				routing: {
					output: { postReceive: [{ type: 'rootProperty', properties: { property: root } }] },
				},
			},
		],
	};
}

export const resourceProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		default: 'get',
		options: resourceOperations.account.map(operationOption),
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['ebay'] } },
		default: 'search',
		options: resourceOperations.ebay.map(operationOption),
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['instagram'] } },
		default: 'getPost',
		options: resourceOperations.instagram.map(operationOption),
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['meta'] } },
		default: 'search',
		options: resourceOperations.meta.map(operationOption),
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['research'] } },
		default: 'research',
		options: resourceOperations.research.map(operationOption),
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['shopify'] } },
		default: 'getProduct',
		options: resourceOperations.shopify.map(operationOption),
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['tiktok'] } },
		default: 'getPost',
		options: resourceOperations.tiktok.map(operationOption),
	},
	...Object.entries(resourceOperations).flatMap(([resource, operations]) =>
		operations.flatMap((operation) =>
			(operation.fields ?? []).map((field) => ({
				...field,
				displayOptions: {
					show: {
						resource: [resource],
						operation: [operation.value],
						...field.displayOptions?.show,
					},
				},
			})),
		),
	),
	outputChoice('meta', 'search', 'ads'),
	outputChoice('ebay', 'search', 'results'),
	outputChoice('instagram', 'getProfilePosts', 'posts'),
];
