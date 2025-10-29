import { env, SELF } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import '../src/index';

describe('worker - upload', () => {
	beforeAll(async () => {
		env.AUTH_KEY = 'test';
		await env.R2_BUCKET.put('test.txt', new Uint8Array([1, 2, 3]));
		await env.R2_BUCKET.put('test2.txt', new Uint8Array([1, 2, 3]));
		await env.R2_BUCKET.put('test3.txt', new Uint8Array([1, 2, 3]));
	});

	it('upload: responds with 400 for missing content-length/type', async () => {
		const file = new File(['test'], 'test-upload.txt');
		const response = await SELF.fetch('https://i.egomaw.net/upload', {
			method: 'POST',
			body: file,
			headers: {
				'x-Api-Key': 'test',
			},
		});
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchInlineSnapshot(`
			{
			  "error": "content-length and content-type are required",
			  "status": 400,
			}
		`);
	});

	it('upload: responds correctly for valid auth', async () => {
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
		const results: UploadResponse = await response.json();

		const date = new Date();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const folder = `${date.getFullYear()}/${month}`;

		expect(results.success).toBe(true);
		expect(results.image).toBe(
			`https://i.egomaw.net/${env.NO_FOLDERS ? '' : `file/${folder}/`}test-upload`
		);

		const urlParams = new URLSearchParams();
		urlParams.set('filename', `${env.NO_FOLDERS ? '' : folder + '/'}test-upload`);
		urlParams.set('authkey', 'test');
		expect(results.deleteUrl).toBe(`https://i.egomaw.net/delete?${urlParams.toString()}`);
	});

	it('upload: correctly ignores folders if specified', async () => {
		const file = new File(['test'], 'test-upload.txt');

		const response = await SELF.fetch(
			'https://i.egomaw.net/upload?filename=test-upload&category=cats&noFolders',
			{
				method: 'POST',
				body: file,
				headers: {
					'x-Api-Key': 'test',
					'content-length': '4',
					'content-type': 'text/plain',
				},
			}
		);
		expect(response.status).toBe(200);
		const results: UploadResponse = await response.json();

		expect(results.success).toBe(true);
		expect(results.image).toBe(`https://i.egomaw.net/cats/test-upload`);

		const urlParams = new URLSearchParams();
		urlParams.set('filename', `cats/test-upload`);
		urlParams.set('authkey', 'test');
		expect(results.deleteUrl).toBe(`https://i.egomaw.net/delete?${urlParams.toString()}`);
	});
});
