import { Router, cors, error, type ResponseHandler, json, type IRequestStrict } from 'itty-router';

import { router as routes } from './routes';

const { preflight, corsify } = cors({
	allowMethods: ['GET', 'PATCH', 'POST', 'DELETE'],
	origin: ['https://egosmells.me', 'https://egomaw.net'],
});

const headers: ResponseHandler<IRequestStrict> = (response: IRequestStrict) => {
	const resp = new Response(response.body, response);
	resp.headers.set('Cache-Control', 'no-store');
	resp.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
	resp.headers.set('X-Content-Type-Options', 'nosniff');
	resp.headers.set('X-Frame-Options', 'DENY');
	return resp;
};

const router = Router({
	before: [preflight],
	catch: err => {
		console.error(err);
		return error(err.status, err.message);
	},
	after: [headers, corsify],
	finally: [json],
});

router.get('/', () => Response.redirect('https://egomaw.net')).all('*', routes.fetch);

export default { ...router };
