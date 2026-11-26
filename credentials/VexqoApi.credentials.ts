import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VexqoApi implements ICredentialType {
	name = 'vexqoApi';
	displayName = 'Vexqo API';
	documentationUrl = 'https://docs.vexqo.dev/quickstart';
	icon = 'file:../nodes/Vexqo/vexqo.svg' as const;
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: { headers: { 'X-API-Key': '={{$credentials.apiKey}}' } },
	};
	test: ICredentialTestRequest = {
		request: { baseURL: 'https://api.vexqo.dev', url: '/account', method: 'GET' },
	};
}
