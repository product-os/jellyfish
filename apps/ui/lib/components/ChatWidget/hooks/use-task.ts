import React from 'react';

const throwOnRetry = () => {
	throw new Error('Retrying the action that did not fail');
};

export const useTask = <R, A extends any[] = any[], E extends any[] = any[]>(
	fn: (...args: A & E) => Promise<R>,
	args: any[] = [],
) => {
	const [state, setState] = React.useState<any>({
		started: false,
		finished: false,
		error: null,
		retry: throwOnRetry,
		result: null,
	});

	return React.useMemo(() => {
		const exec = async (...execArgs: E) => {
			setState({
				started: true,
				finished: false,
				error: null,
				retry: throwOnRetry,
				result: null,
			});

			let result: any = null;
			try {
				const data = await fn(...(args.concat(execArgs) as any));

				setState(
					(result = {
						started: false,
						finished: true,
						error: null,
						retry: throwOnRetry,
						result: data,
					}),
				);
			} catch (err) {
				console.error(err);

				setState(
					(result = {
						started: false,
						finished: true,
						error: err,
						retry: () => {
							return exec(...execArgs);
						},
						result: null,
					}),
				);
			}

			return result;
		};

		return {
			...state,
			exec,
			setState,
		};
	}, [state, ...args]);
};

interface Task {
	started: boolean;
	finished: boolean;
	error: null | any;
	retry: (...args: any[]) => any;
	result: any;
}

export const useCombineTasks = (...tasks: Task[]) => {
	return React.useMemo(
		() => {
			let started = false;
			let finished = true;
			let error = null;
			const retries: any[] = [];

			for (const task of tasks) {
				started = started || task.started;
				finished = finished && task.finished;
				error = error || task.error;

				if (task.error) {
					retries.push(task.retry);
				}
			}

			return {
				started,
				finished,
				error,
				retry: retries.length
					? () => {
							return retries.forEach((retry) => {
								return retry();
							});
					  }
					: throwOnRetry,
			};
		},
		tasks.reduce((deps, task) => {
			return deps.concat(task.started, task.finished, task.error, task.result);
		}, [] as any[]),
	);
};
