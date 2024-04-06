import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import '../src/index';

describe('worker - unauthenticated', () => {
	it('file: responds with 404 for missing file', async () => {
		const response = await SELF.fetch('https://i.egomaw.net/file/missing');
		expect(response.status).toBe(404);
		expect(await response.text()).toMatchInlineSnapshot('"File Not Found"');
	});

	it('file: responds with 404 for no filename', async () => {
		const response = await SELF.fetch('https://i.egomaw.net/file/');
		expect(response.status).toBe(404);
		expect(await response.json()).toMatchInlineSnapshot(`
			{
			  "error": "File Not Found",
			  "status": 404,
			}
		`);
	});

	it('list: responds with 401 for missing auth', async () => {
		const response = await SELF.fetch('https://i.egomaw.net/files/list');
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchInlineSnapshot(`
			{
			  "error": "Missing auth",
			  "status": 401,
			}
		`);
	});

	it('delete: responds with 401 for missing auth', async () => {
		const response = await SELF.fetch('https://i.egomaw.net/delete?filename=test');
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchInlineSnapshot(`
			{
			  "error": "Missing auth",
			  "status": 401,
			}
		`);
	});

	it('upload: responds with 401 for missing auth', async () => {
		const file = new File(['test'], 'test.txt');
		const response = await SELF.fetch('https://i.egomaw.net/upload', {
			method: 'POST',
			body: file,
		});
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchInlineSnapshot(`
			{
			  "error": "Missing auth",
			  "status": 401,
			}
		`);
	});
});
