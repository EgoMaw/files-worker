import { type IRequestStrict, IttyRouter, StatusError } from 'itty-router';
import * as crypto from 'node:crypto';
import render2 from 'render2';
import type { Env } from './types';

type CF = [env: Env, ctx: ExecutionContext];
const router = IttyRouter<IRequestStrict, CF>();

// handle authentication
const authMiddleware = (request: IRequestStrict, env: Env) => {
	const url = new URL(request.url);
	if (
		request.headers?.get('x-Api-Key') !== env.AUTH_KEY &&
		url.searchParams.get('authkey') !== env.AUTH_KEY
	) {
		throw new StatusError(401, 'Missing auth');
	}
};

const notFound = (err?: string) => new StatusError(404, err ?? 'Not Found');

// handle file retrieval
const getFile = async (request: IRequestStrict, env: Env, ctx: ExecutionContext) => {
	if (env.ONLY_ALLOW_ACCESS_TO_PUBLIC_BUCKET) {
		throw notFound();
	}
	const url = new URL(request.url);
	const id = url.pathname.replace('file/', '').replace('upload/', '').slice(1);

	if (!id) {
		throw notFound('File Not Found');
	}
	return render2.fetch(
		new Request(`https://r2host/${id}`, request),
		{
			...env,
			CACHE_CONTROL: 'public, max-age=604800',
		},
		ctx
	);
};

// handle upload
router
	.post('/upload', authMiddleware, async (request, env) => {
		const url = new URL(request.url);
		let filename = url.searchParams.get('filename') ?? crypto.randomUUID();
		const category = url.searchParams.get('category');
		const noFolders = url.searchParams.has('noFolders');

		if (category) {
			filename = `${category}/${filename}`;
		}

		if (!env.NO_FOLDERS && !noFolders) {
			const date = new Date();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const folder = `${date.getFullYear()}/${month}`;
			filename = `${folder}/${filename}`;
		}

		// ensure content-length and content-type headers are present
		const contentType = request.headers.get('content-type');
		const contentLength = request.headers.get('content-length');
		if (!contentLength || !contentType) {
			throw new StatusError(400, 'content-length and content-type are required');
		}

		try {
			await env.R2_BUCKET.put(filename, request.body, {
				httpMetadata: {
					contentType: contentType,
					cacheControl: 'public, max-age=604800',
				},
			});
		} catch (err: unknown) {
			throw new StatusError(500, {
				message: 'Error occurred writing to R2',
				error: err,
			} as object);
		}

		// return the image url to ShareX
		const returnUrl = new URL(request.url);
		returnUrl.searchParams.delete('filename');
		returnUrl.searchParams.delete('category');
		returnUrl.searchParams.delete('noFolders');

		returnUrl.pathname = !env.NO_FOLDERS && !noFolders ? `/file/${filename}` : `/${filename}`;

		if (env.CUSTOM_PUBLIC_BUCKET_DOMAIN) {
			returnUrl.host = env.CUSTOM_PUBLIC_BUCKET_DOMAIN;
			returnUrl.pathname = filename;
		}

		const deleteUrl = new URL(request.url);
		deleteUrl.searchParams.delete('category');
		deleteUrl.searchParams.delete('noFolders');

		deleteUrl.pathname = '/delete';
		deleteUrl.searchParams.set('authkey', env.AUTH_KEY);
		deleteUrl.searchParams.set('filename', filename);

		return {
			success: true,
			image: returnUrl.href,
			deleteUrl: deleteUrl.href,
		};
	})

	// handle file deletion
	.get('/delete', authMiddleware, async (request, env) => {
		const url = new URL(request.url);
		const filename = url.searchParams.get('filename');

		if (!filename) {
			throw notFound('Missing filename');
		}

		// delete from R2
		try {
			const cache = caches.default;
			await cache.delete(new Request(`https://r2host/${filename}`, request));

			await env.R2_BUCKET.delete(filename);
			return {
				success: true,
			};
		} catch (err: unknown) {
			throw new StatusError(500, {
				message: 'Error occurred deleting from R2',
				error: err,
			} as object);
		}
	})

	.get('/upload/:id', getFile)
	.get('/file/*', getFile)
	.get('/files/list', authMiddleware, async (_request, env) => {
		return await env.R2_BUCKET.list({ limit: 1000 });
	})
	.get('*', getFile);

// 404 everything else
router.all('*', () => {
	throw notFound();
});

export { router };
