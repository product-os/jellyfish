import { getLogger, LogContext } from '@balena/jellyfish-logger';
import bodyParser from 'body-parser';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import compression from 'compression';
import { Application } from 'express';

// Avoid including package.json in the build output!
// tslint:disable-next-line: no-var-requires
const packageJSON = require('../../../../package.json');

const logger = getLogger(__filename);

export const attachMiddlewares = (
	rootContext: LogContext,
	application: Application,
) => {
	application.use(compression());

	application.use(
		bodyParser.text({
			type: ['application/jose'],
		}),
	);

	application.use(
		bodyParser.json({
			// Handle big payloads without a `PayloadTooLarge` error.
			// This is particularly important when receiving web hooks,
			// as sometimes they end up being huge.
			limit: '5mb',

			// Some services send a content
			// type "application/vnd.api+json"
			type: ['application/*+json', 'application/json'],

			// A small trick to preserve the unparsed JSON
			verify: (request, _response, buffer, _encoding) => {
				(request as any).rawBody = buffer.toString('utf8');
			},
		}),
	);

	application.use((_request, response, next) => {
		response.header('Access-Control-Allow-Origin', '*');
		response.header('Access-Control-Max-Age', '86400');
		response.header(
			'Access-Control-Allow-Headers',
			[
				'Accept',
				'Authorization',
				'Content-Type',
				'Origin',
				'X-Requested-With',
				'x-balena-client',
			].join(', '),
		);
		response.header(
			'Access-Control-Allow-Methods',
			['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'].join(', '),
		);

		next();
	});

	application.use(async (request, response, next) => {
		try {
			const contextId = request.headers['request-id'] || uuidv4();

			const context = {
				id: `REQUEST-V-${packageJSON.version}-ENV-${
					process.env.NODE_ENV ? process.env.NODE_ENV.substring(0, 4) : '?'
				}-${contextId}`,
				api: rootContext.id,
			};

			logger.info(context, 'HTTP request start', {
				ip: request.ip,
				uri: request.originalUrl,
			});

			response.header('X-Request-Id', context.id);
			response.header('X-Api-Id', context.api);

			request.context = context;
			return next();
		} catch (error: any) {
			logger.exception(request.context, 'Context set error', error);
			return next();
		}
	});
};
