import { env, SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import '../src/index';

describe('worker - list upload', () => {
	beforeAll(async () => {
		env.AUTH_KEY = 'test';
		await env.R2_BUCKET.put('test.txt', new Uint8Array([1, 2, 3]));
		await env.R2_BUCKET.put('test2.txt', new Uint8Array([1, 2, 3]));
		await env.R2_BUCKET.put('test3.txt', new Uint8Array([1, 2, 3]));
	});

	it('list: responds correctly after upload', async () => {
		const file = new File(['test'], 'test-upload.txt');
		const response = await SELF.fetch('https://i.egomaw.net/upload?filename=test-upload', {
			method: 'POST',
			body: file,
			headers: {
				'x-Api-Key': 'test',
				'content-length': '4',
				'content-type': 'text/plain',
			},
		});
		expect(response.status).toBe(200);

		const urlParams = new URLSearchParams();
		urlParams.set('filename', 'test-upload');
		urlParams.set('authkey', 'test');
		const listResponse = await SELF.fetch('https://i.egomaw.net/files/list', {
			headers: {
				'x-Api-Key': 'test',
			},
		});
		expect(listResponse.status).toBe(200);
		const results: ListResponse = await listResponse.json();

		const date = new Date();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const folder = `${date.getFullYear()}/${month}`;

		expect(results.objects).toHaveLength(4);
		const sortedBuKey = results.objects.sort((itemA, itemN) => itemA.key.localeCompare(itemN.key));
		expect(sortedBuKey).toEqual([
			expect.objectContaining({ key: `${env.NO_FOLDERS ? '' : folder + '/'}test-upload` }),
			expect.objectContaining({ key: 'test.txt' }),
			expect.objectContaining({ key: 'test2.txt' }),
			expect.objectContaining({ key: 'test3.txt' }),
		]);
	});
});
