import { env, SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import '../src/index';

describe('worker - get', () => {
	beforeAll(async () => {
		env.AUTH_KEY = 'test';
		await env.R2_BUCKET.put('test.txt', new Uint8Array([1, 2, 3]));
		await env.R2_BUCKET.put('test2.txt', new Uint8Array([1, 2, 3]));
		await env.R2_BUCKET.put('test3.txt', new Uint8Array([1, 2, 3]));
	});

	it('list: responds with 401 for invalid auth', async () => {
		const response = await SELF.fetch('https://i.egomaw.net/files/list', {
			headers: {
				'x-Api-Key': 'invalid',
			},
		});
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchInlineSnapshot(`
			{
			  "error": "Missing auth",
			  "status": 401,
			}
		`);
	});

	it('list: responds with 200 for valid auth', async () => {
		const response = await SELF.fetch('https://i.egomaw.net/files/list', {
			headers: {
				'x-Api-Key': 'test',
			},
		});
		expect(response.status).toBe(200);
		const results: ListResponse = await response.json();

		expect(results.objects).toHaveLength(3);
		expect(results.objects[0]!.key).toBe('test.txt');
		expect(results.objects[1]!.key).toBe('test2.txt');
		expect(results.objects[2]!.key).toBe('test3.txt');
	});

	it('file: responds correctly for valid auth', async () => {
		const response = await SELF.fetch('https://i.egomaw.net/file/test.txt');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('application/octet-stream');
		expect(response.headers.get('content-length')).toBe('3');
		expect(await response.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer);
	});
});
