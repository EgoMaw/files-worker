import { env, SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import '../src/index';

describe('worker - list delete', () => {
	beforeAll(async () => {
		env.AUTH_KEY = 'test';
		await env.R2_BUCKET.put('test.txt', new Uint8Array([1, 2, 3]));
		await env.R2_BUCKET.put('test2.txt', new Uint8Array([1, 2, 3]));
		await env.R2_BUCKET.put('test3.txt', new Uint8Array([1, 2, 3]));
	});

	it('list: responds correctly after delete', async () => {
		// delete test2.txt
		const deleteResponse = await SELF.fetch('https://i.egomaw.net/delete?filename=test2.txt', {
			headers: {
				'x-Api-Key': 'test',
			},
		});
		expect(deleteResponse.status).toBe(200);
		expect(await deleteResponse.json()).toMatchInlineSnapshot(`
			{
			  "success": true,
			}
		`);

		// so now only test.txt and test3.txt should be left
		const response = await SELF.fetch('https://i.egomaw.net/files/list', {
			headers: {
				'x-Api-Key': 'test',
			},
		});
		expect(response.status).toBe(200);
		const results: ListResponse = await response.json();
		expect(results.objects).toHaveLength(2);
		expect(results.objects[0]!.key).toBe('test.txt');
		expect(results.objects[1]!.key).toBe('test3.txt');
	});
});
