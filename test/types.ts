import { Env } from '../src/types';

declare module 'cloudflare:test' {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface ProvidedEnv extends Env {}
}

declare global {
	interface ListResponse {
		objects: { key: string }[];
	}
	interface UploadResponse {
		success?: boolean;
		image?: string;
		deleteUrl?: string;
	}
}
