import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('worker - get ONLY_ALLOW_ACCESS_TO_PUBLIC_BUCKET', () => {
	beforeAll(async () => {
		env.AUTH_KEY = 'test';
		env.ONLY_ALLOW_ACCESS_TO_PUBLIC_BUCKET = true;
		await env.R2_BUCKET.put('test.txt', new Uint8Array([1, 2, 3]));
	});

	it('always responds with 404 for files', async () => {
		const request = new IncomingRequest('https://i.egomaw.net/file/test.txt');
		const ctx = createExecutionContext();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const response: Response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(404);
		expect(await response.json()).toMatchInlineSnapshot(`
			{
			  "error": "Not Found",
			  "status": 404,
			}
		`);

		// but if we unset this env var, it should work
		env.ONLY_ALLOW_ACCESS_TO_PUBLIC_BUCKET = false;
		const request2 = new IncomingRequest('https://i.egomaw.net/file/test.txt');
		const ctx2 = createExecutionContext();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const response2: Response = await worker.fetch(request2, env, ctx2);
		await waitOnExecutionContext(ctx2);

		expect(response2.status).toBe(200);
		expect(await response2.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer);
	});
});
