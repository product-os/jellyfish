import type { JellyfishCursor } from '@balena/jellyfish-client-sdk/build/cursor';
import type { SdkQueryOptions } from '@balena/jellyfish-client-sdk/build/types';
import type { Contract, JsonSchema } from 'autumndb';
import _ from 'lodash';
import * as React from 'react';
import { useSetup } from '../components';

export const useCursorEffect = (
	query: JsonSchema,
	queryOptions: SdkQueryOptions,
): [Contract[], () => Promise<Contract[]>, () => boolean, boolean] => {
	const { sdk } = useSetup()!;
	const [results, setResults] = React.useState<Contract[]>([]);
	const [loading, setLoading] = React.useState(false);
	const cursorRef = React.useRef<JellyfishCursor | null>(null);

	React.useEffect(() => {
		(async () => {
			cursorRef.current = sdk.getCursor(query, queryOptions);

			setLoading(true);
			setResults(await cursorRef.current.query());
			setLoading(false);

			cursorRef.current.onUpdate(((response: {
				data: { type: any; id: any; after: any };
			}) => {
				const { id, after } = response.data;

				// If card is null then it has been set to inactive or deleted
				if (after === null) {
					setResults((prevState) => {
						return prevState.filter((contract) => contract.id !== id);
					});
					return;
				}

				// Otherwise perform an upsert
				setResults((prevState) => {
					const exists = _.some(prevState, { id });

					// If an item is found we don't need to do anything, because count is the same
					if (exists) {
						return prevState;
					}
					// Otherwise add it to the results
					let newState = prevState ? prevState.concat(after) : [after];
					if (queryOptions.sortBy) {
						newState = _.sortBy(newState, queryOptions.sortBy);
					}
					if (queryOptions.sortDir === 'desc') {
						newState = newState.reverse();
					}
					return newState;
				});
			}) as any);
		})();

		return () => {
			cursorRef.current!.close();
			setResults([]);
		};
	}, [query]);

	const nextPage = React.useCallback(async () => {
		if (cursorRef.current && cursorRef.current.hasNextPage()) {
			setLoading(true);
			const nextPageResults = await cursorRef.current.nextPage();
			setResults((prevState) => {
				let newState = _.uniqBy(prevState.concat(nextPageResults), 'id');
				if (queryOptions.sortBy) {
					newState = _.sortBy(newState, queryOptions.sortBy);
				}
				if (queryOptions.sortDir === 'desc') {
					newState = newState.reverse();
				}
				return newState;
			});
			setLoading(false);
			return nextPageResults;
		}
		return [];
	}, []);

	const hasNextPage = React.useCallback(() => {
		if (!cursorRef.current) {
			return true;
		}

		return cursorRef.current.hasNextPage();
	}, []);

	return [results, nextPage, hasNextPage, loading];
};
