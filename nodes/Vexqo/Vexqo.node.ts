import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { resourceProperties } from './resources';

export class Vexqo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Vexqo',
		name: 'vexqo',
		icon: { light: 'file:vexqo.svg', dark: 'file:vexqo.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read public ads, social posts and ecommerce data through Vexqo',
		defaults: { name: 'Vexqo' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'vexqoApi', required: true }],
		requestDefaults: {
			baseURL: 'https://api.vexqo.dev',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'meta',
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'eBay', value: 'ebay' },
					{ name: 'Instagram', value: 'instagram' },
					{ name: 'Meta Ad', value: 'meta' },
					{ name: 'Product Research', value: 'research' },
					{ name: 'Shopify Product', value: 'shopify' },
					{ name: 'TikTok', value: 'tiktok' },
				],
			},
			...resourceProperties,
		],
	};
}
