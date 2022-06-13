import * as Sentry from '@sentry/browser';

export default class ErrorReporter {
	initialized: boolean;

	constructor(
		public config: {
			version: string;
			dsn: string;
			isProduction: boolean;
		},
	) {
		this.initialized = false;
		this.reportException = this.reportException.bind(this);
		this.handleAsyncError = this.handleAsyncError.bind(this);
		if (this.config.isProduction && this.config.dsn !== '0') {
			Sentry.init({
				dsn: this.config.dsn,
				release: this.config.version,
				environment: 'ui',
			});
			this.initialized = true;
		}
	}

	handleAsyncError<T>(awaitable: Promise<T>) {
		awaitable.catch(this.reportException);
	}

	setUser(user: Sentry.User | null) {
		if (this.initialized) {
			Sentry.configureScope((scope) => {
				scope.setUser(user);
			});
		}
	}

	reportException(error: Error, errorInfo?: any) {
		if (this.initialized) {
			Sentry.withScope((scope) => {
				// TS-TODO: `scope.setExtra` accepts 2 arguments
				(scope.setExtra as any)(errorInfo);
				Sentry.captureException(error);
			});
		}
	}

	reportInfo(message: string, data: { [key: string]: any }) {
		if (this.initialized) {
			Sentry.withScope((scope) => {
				if (data) {
					Object.keys(data).forEach((key) => {
						scope.setExtra(key, JSON.stringify(data[key]));
					});
				}

				scope.setLevel(Sentry.Severity.Info);
				Sentry.captureMessage(message);
			});
		}
	}
}
