import type { LogContext } from '@balena/jellyfish-logger';
import type { AutumnDBSession } from 'autumndb';

// Augment the Express typings with the session and context variable
declare global {
	namespace Express {
		interface Request {
			session: AutumnDBSession;
			context: LogContext;
		}
	}
}
