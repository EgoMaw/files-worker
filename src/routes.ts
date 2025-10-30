import { type IRequestStrict, IttyRouter, StatusError } from 'itty-router';
import render2 from 'render2';

type CF = [env: Env, ctx: ExecutionContext];
const router = IttyRouter<IRequestStrict, CF>();

// handle authentication
const authMiddleware = (request: IRequestStrict, env: Env) => {
	// Check header first as it's more common and faster
	if (request.headers?.get('x-Api-Key') === env.AUTH_KEY) {
		return;
	}
	// Only parse URL if header check fails
	const url = new URL(request.url);
	if (url.searchParams.get('authkey') !== env.AUTH_KEY) {
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
	// More efficient: remove prefixes using string operations instead of chained replace calls
	let id = url.pathname.slice(1); // Remove leading slash
	if (id.startsWith('file/')) {
		id = id.slice(5);
	} else if (id.startsWith('upload/')) {
		id = id.slice(7);
	}

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
		// Reuse the URL object instead of creating a new one
		url.searchParams.delete('filename');
		url.searchParams.delete('category');
		url.searchParams.delete('noFolders');

		// Create deleteUrl before modifying host (it needs original host)
		const deleteUrl = new URL(url);
		deleteUrl.pathname = '/delete';
		deleteUrl.searchParams.set('filename', filename);
		deleteUrl.searchParams.set('authkey', env.AUTH_KEY);

		url.pathname = !env.NO_FOLDERS && !noFolders ? `/file/${filename}` : `/${filename}`;

		if (env.CUSTOM_PUBLIC_BUCKET_DOMAIN) {
			url.host = env.CUSTOM_PUBLIC_BUCKET_DOMAIN;
			url.pathname = filename;
		}

		return {
			success: true,
			image: url.href,
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
