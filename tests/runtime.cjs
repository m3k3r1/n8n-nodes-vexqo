// Runs the built node in real n8n with an isolated database and loopback API fixture.
// N8N_BINARY must point to an installed n8n 2.49.7 executable.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const binary = process.env.N8N_BINARY;
assert.ok(binary, 'Set N8N_BINARY to an installed n8n 2.49.7 executable');
const cases = [
	['Account', { resource: 'account', operation: 'get' }, 'GET', '/account', {}],
	[
		'Ebay search',
		{
			resource: 'ebay',
			operation: 'search',
			q: 'cámara & lens',
			page: 2,
			perPage: 60,
			options: { sort: 'newly_listed', maxPrice: 150, buyingFormat: 'buy_it_now', country: 'DE' },
		},
		'GET',
		'/ebay/search',
		{
			q: 'cámara & lens',
			page: '2',
			per_page: '60',
			sort: 'newly_listed',
			max_price: '150',
			buying_format: 'buy_it_now',
			country: 'DE',
		},
	],
	[
		'Ebay listing',
		{
			resource: 'ebay',
			operation: 'getListing',
			listingId: '123456789012',
			options: { mode: 'auto', includeHtml: false },
		},
		'GET',
		'/ebay/listings/123456789012',
		{ mode: 'auto', include_html: 'false' },
	],
	[
		'Meta keyword',
		{
			resource: 'meta',
			operation: 'search',
			searchBy: 'keyword',
			q: 'trail shoes',
			country: 'DE',
			limit: 10,
			view: 'compact',
			options: { includeAdDetails: true, cursor: 'opaque+/=cursor', startDate: '2026-11-01' },
		},
		'GET',
		'/facebook/ads',
		{
			q: 'trail shoes',
			country: 'DE',
			limit: '10',
			view: 'compact',
			include_ad_details: 'true',
			cursor: 'opaque+/=cursor',
			start_date: '2026-11-01',
		},
	],
	[
		'Meta advertiser',
		{
			resource: 'meta',
			operation: 'search',
			searchBy: 'advertiser',
			pageId: '123456789012',
			q: 'MUST_NOT_SEND',
			country: 'ALL',
			limit: 30,
			view: 'compact',
			options: {},
		},
		'GET',
		'/facebook/ads',
		{ page_id: '123456789012', country: 'ALL', limit: '30', view: 'compact' },
	],
	[
		'Meta ad',
		{
			resource: 'meta',
			operation: 'getAd',
			adId: '987654321012',
			view: 'raw',
			options: { includeCreativeAssets: true },
		},
		'GET',
		'/facebook/ads/987654321012',
		{ view: 'raw', include_creative_assets: 'true' },
	],
	[
		'TikTok post',
		{
			resource: 'tiktok',
			operation: 'getPost',
			target: 'https://www.tiktok.com/@example/video/1234567890',
			options: { maxAge: 120 },
		},
		'GET',
		'/tiktok/posts',
		{ target: 'https://www.tiktok.com/@example/video/1234567890', max_age: '120' },
	],
	[
		'TikTok profile',
		{ resource: 'tiktok', operation: 'getProfile', username: 'example', options: {} },
		'GET',
		'/tiktok/profiles/example',
		{},
	],
	[
		'Instagram post',
		{
			resource: 'instagram',
			operation: 'getPost',
			target: 'https://www.instagram.com/p/EXAMPLE/',
			options: {},
		},
		'GET',
		'/instagram/posts',
		{ target: 'https://www.instagram.com/p/EXAMPLE/' },
	],
	[
		'Instagram profile',
		{
			resource: 'instagram',
			operation: 'getProfile',
			username: 'example.name',
			options: { country: 'US' },
		},
		'GET',
		'/instagram/profiles/example.name',
		{ country: 'US' },
	],
	[
		'Instagram posts',
		{
			resource: 'instagram',
			operation: 'getProfilePosts',
			username: 'example',
			limit: 5,
			options: {},
		},
		'GET',
		'/instagram/profiles/example/posts',
		{ limit: '5' },
	],
	[
		'Shopify',
		{
			resource: 'shopify',
			operation: 'getProduct',
			productUrl: 'https://store.example/en/products/shirt?variant=123',
		},
		'POST',
		'/shopify',
		{},
		{ url: 'https://store.example/en/products/shirt?variant=123' },
	],
	[
		'Research',
		{
			resource: 'research',
			operation: 'research',
			productUrl: 'https://store.example/products/shirt',
			country: 'FR',
			limit: 5,
		},
		'POST',
		'/research',
		{},
		{ url: 'https://store.example/products/shirt', country: 'FR', limit: 5 },
	],
];

(async () => {
	const runDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vexqo-node-runtime-'));
	const captured = [];
	const server = http.createServer(async (req, res) => {
		let data = '';
		for await (const chunk of req) data += chunk;
		const url = new URL(req.url, 'http://fixture');
		const call = {
			method: req.method,
			path: url.pathname,
			query: Object.fromEntries(url.searchParams),
			body: data ? JSON.parse(data) : {},
			auth: req.headers['x-api-key'],
		};
		captured.push(call);
		if (url.searchParams.get('q') === 'http401' || url.searchParams.get('q') === 'http429') {
			res.writeHead(url.searchParams.get('q') === 'http401' ? 401 : 429, {
				'content-type': 'application/json',
				'retry-after': '10',
			});
			return res.end(JSON.stringify({ error: 'fixture HTTP failure' }));
		}
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end(
			JSON.stringify({
				fixture: true,
				source: { name: 'fixture' },
				collection: { partial: true },
				metering: { credits_used: 1 },
				ads: [{ id: 'one' }, { id: 'two' }],
				results: [{ id: 'one' }, { id: 'two' }],
				posts: [{ id: 'one' }, { id: 'two' }],
			}),
		);
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const portServer = net.createServer();
	await new Promise((resolve) => portServer.listen(0, '127.0.0.1', resolve));
	const brokerPort = portServer.address().port;
	await new Promise((resolve) => portServer.close(resolve));
	const modulePath = path.join(root, 'dist/nodes/Vexqo/Vexqo.node.js');
	const preload = path.join(runDir, 'fixture.cjs');
	// Only the test loader changes the base URL. The distributed node stays fixed to api.vexqo.dev.
	await fs.writeFile(
		preload,
		`const m=require(${JSON.stringify(modulePath)}); const Real=m.Vexqo; m.Vexqo=class Vexqo extends Real {constructor(){super();this.description.requestDefaults.baseURL=${JSON.stringify('http://127.0.0.1:' + server.address().port)};}};`,
	);
	const env = Object.fromEntries(
		['PATH', 'HOME', 'TMPDIR', 'LANG']
			.filter((k) => process.env[k])
			.map((k) => [k, process.env[k]]),
	);
	Object.assign(env, {
		N8N_USER_FOLDER: runDir,
		DB_TYPE: 'sqlite',
		N8N_CUSTOM_EXTENSIONS: path.join(root, 'dist'),
		NODE_OPTIONS: `--require=${preload}`,
		N8N_DIAGNOSTICS_ENABLED: 'false',
		N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
		N8N_TEMPLATES_ENABLED: 'false',
		N8N_PERSONALIZATION_ENABLED: 'false',
		N8N_LICENSE_AUTO_RENEW_ENABLED: 'false',
		N8N_RUNNERS_MODE: 'internal',
		N8N_RUNNERS_BROKER_PORT: String(brokerPort),
	});
	async function cli(label, args, allowFailure = false) {
		const result = await new Promise((resolve, reject) => {
			const child = spawn(binary, args, { env, cwd: runDir, stdio: ['ignore', 'pipe', 'pipe'] });
			let out = '',
				err = '';
			const timer = setTimeout(() => child.kill('SIGTERM'), 120000);
			child.stdout.on('data', (c) => (out += c));
			child.stderr.on('data', (c) => (err += c));
			child.on('error', reject);
			child.on('close', (code) => {
				clearTimeout(timer);
				resolve({ code, out, err });
			});
		});
		await fs.writeFile(path.join(runDir, label + '.log'), result.out + '\n' + result.err);
		if (!allowFailure) assert.equal(result.code, 0, `${label} failed; see ${runDir}`);
		return result;
	}
	function workflow(id, entries) {
		const trigger = {
			id: 'manual',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			parameters: {},
			position: [0, 0],
		};
		const nodes = entries.map(([name, parameters], i) => ({
			id: 'node-' + i,
			name,
			type: 'CUSTOM.vexqo',
			typeVersion: 1,
			parameters,
			position: [300, i * 180],
			credentials: { vexqoApi: { id: 'vexqo-fixture', name: 'Fixture only' } },
		}));
		return {
			id,
			name: id,
			active: false,
			nodes: [trigger, ...nodes],
			connections: {
				'Manual Trigger': { main: [nodes.map((n) => ({ node: n.name, type: 'main', index: 0 }))] },
			},
			settings: { executionOrder: 'v1' },
		};
	}
	async function run(id, entries, allowFailure = false) {
		const file = path.join(runDir, id + '.json');
		await fs.writeFile(file, JSON.stringify(workflow(id, entries)));
		await cli('import-' + id, ['import:workflow', '--input=' + file]);
		return cli('execute-' + id, ['execute', '--id=' + id, '--rawOutput'], allowFailure);
	}
	try {
		const credentialFile = path.join(runDir, 'credentials.json');
		await fs.writeFile(
			credentialFile,
			JSON.stringify([
				{
					id: 'vexqo-fixture',
					name: 'Fixture only',
					type: 'vexqoApi',
					data: { apiKey: 'TEST_ONLY_NOT_A_REAL_KEY' },
				},
			]),
		);
		await cli('credentials', ['import:credentials', '--input=' + credentialFile]);
		const result = await run('vexqo-contract', cases);
		const start = result.out.indexOf('{\n');
		assert.notEqual(start, -1);
		const execution = JSON.parse(result.out.slice(start).trim());
		assert.equal(execution.status, 'success');
		assert.equal(captured.length, cases.length);
		for (const [name, , method, pathname, query, body = {}] of cases) {
			const index = captured.findIndex(
				(c) =>
					c.method === method &&
					c.path === pathname &&
					JSON.stringify(Object.entries(c.query).sort()) ===
						JSON.stringify(Object.entries(query).sort()),
			);
			assert.notEqual(
				index,
				-1,
				'Missing/mismatched request: ' + name + ' ' + JSON.stringify(captured),
			);
			const [call] = captured.splice(index, 1);
			assert.deepEqual(call.body, body);
			assert.equal(call.auth, 'TEST_ONLY_NOT_A_REAL_KEY');
			const output = execution.data.resultData.runData[name][0].data.main[0];
			assert.equal(output.length, 1);
			assert.equal(output[0].json.fixture, true);
			assert.deepEqual(output[0].json.metering, { credits_used: 1 });
		}
		console.log(
			'PASS 12 operations, keyword/advertiser branching, encoded queries, JSON bodies, credentials and full responses',
		);
		const split = await run('vexqo-split', [
			[
				'Meta items',
				{
					resource: 'meta',
					operation: 'search',
					searchBy: 'keyword',
					q: 'split',
					country: 'ALL',
					limit: 30,
					view: 'compact',
					options: {},
					output: 'items',
				},
			],
			[
				'Ebay items',
				{
					resource: 'ebay',
					operation: 'search',
					q: 'split',
					page: 1,
					perPage: 60,
					options: {},
					output: 'items',
				},
			],
			[
				'Instagram items',
				{
					resource: 'instagram',
					operation: 'getProfilePosts',
					username: 'example',
					limit: 12,
					options: {},
					output: 'items',
				},
			],
		]);
		const splitData = JSON.parse(split.out.slice(split.out.indexOf('{\n')).trim());
		for (const name of ['Meta items', 'Ebay items', 'Instagram items'])
			assert.deepEqual(
				splitData.data.resultData.runData[name][0].data.main[0].map((i) => i.json),
				[{ id: 'one' }, { id: 'two' }],
			);
		console.log('PASS per-result output for all three search/preview operations');
		for (const status of [401, 429]) {
			const failure = await run(
				'vexqo-http-' + status,
				[
					[
						'Expected error',
						{
							resource: 'ebay',
							operation: 'search',
							q: 'http' + status,
							page: 1,
							perPage: 60,
							options: {},
						},
					],
				],
				true,
			);
			assert.match(failure.out + failure.err, new RegExp(String(status)));
			assert.ok(failure.code !== 0 || /"status": "error"/.test(failure.out));
		}
		console.log('PASS authentication and rate-limit HTTP failures remain errors');
		const before = captured.length;
		const invalid = await run(
			'vexqo-invalid-path',
			[
				[
					'Invalid identifier',
					{ resource: 'tiktok', operation: 'getProfile', username: '../account', options: {} },
				],
			],
			true,
		);
		assert.match(invalid.out + invalid.err, /Invalid identifier/);
		assert.equal(captured.length, before);
		console.log('PASS path traversal rejected before any HTTP request');
		await fs.writeFile(
			path.join(runDir, 'result.json'),
			JSON.stringify(
				{
					passed: true,
					n8n: '2.49.7',
					cases: cases.length,
					splitCases: 3,
					httpErrors: [401, 429],
					pathValidation: true,
				},
				null,
				2,
			),
		);
		console.log('Evidence: ' + runDir);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
