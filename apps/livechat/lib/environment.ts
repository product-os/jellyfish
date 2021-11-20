/* global env */
declare const env: any;

const windowEnv =
	// The _env_ object is generated by `env.sh` at runtime.
	typeof window !== 'undefined' && (window as any)._env_
		? (window as any)._env_
		: {};

export const isTest = () => {
	return env.NODE_ENV === 'test';
};

export const isProduction = () => {
	return env.NODE_ENV === 'production';
};

export const api = {
	prefix: env.API_PREFIX || 'api/v2',
	url:
		typeof window === 'undefined'
			? ''
			: `${windowEnv.SERVER_HOST}:${windowEnv.SERVER_PORT}` ||
			  window.location.origin,
};

export const analytics = {
	mixpanel: {
		token: env.MIXPANEL_TOKEN_CHAT_WIDGET,
	},
};

export const sentry = {
	dsn: windowEnv.SENTRY_DSN_UI || '0',
};

export const version = env.VERSION || 'v1.0.0';
