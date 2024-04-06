import { env, SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import '../src/index';

describe('worker - delete', () => {
	beforeAll(async () => {
		env.AUTH_KEY = 'test';
		await env.R2_BUCKET.put('test.txt', new Uint8Array([1, 2, 3]));
		await env.R2_BUCKET.put('test2.txt', new Uint8Array([1, 2, 3]));
		await env.R2_BUCKET.put('test3.txt', new Uint8Array([1, 2, 3]));
	});
	it('delete: responds correctly for valid auth', async () => {
		const response = await SELF.fetch('https://i.egomaw.net/delete?filename=test.txt', {
			headers: {
				'x-Api-Key': 'test',
			},
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchInlineSnapshot(`
			{
			  "success": true,
			}
		`);
	});
});
