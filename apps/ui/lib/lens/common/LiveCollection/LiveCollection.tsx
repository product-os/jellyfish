import type { Contract, UserContract } from 'autumndb';
import clone from 'deep-copy';
import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import * as React from 'react';
import jsf from 'json-schema-faker';
import type { LensContract } from '../../../types';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import type { JellyfishCursor } from '@balena/jellyfish-client-sdk/build/cursor';
import { Setup, withSetup } from '../../../components/SetupProvider';

interface Props extends Setup {
	user: UserContract;
	query: Parameters<JellyfishSDK['getCursor']>[0];
	options: Parameters<JellyfishSDK['getCursor']>[1];
	onResultsChange?: (collection: Contract[] | null) => any;
	lens: LensContract | null;
}

interface State {
	results: Contract[] | null;
	lenses: LensContract[];
}

export default withSetup(
	class LiveCollection extends React.Component<Props, State> {
		cursor: JellyfishCursor | null = null;

		constructor(props: Props) {
			super(props);

			// As there isn't data loaded, mock the expected output based on the query
			// schema and use the mock to select appropriate lenses
			const mockCollection = [jsf.generate(props.query as any)];

			const { getLenses } = require('../../');

			const lenses = getLenses(
				'list',
				mockCollection,
				this.props.user,
				'data.icon',
			);

			this.state = {
				lenses,
				results: null,
			};
		}

		componentDidMount() {
			this.setupStream().catch(console.error);
		}

		componentWillUnmount() {
			if (this.cursor) {
				this.cursor.close();
			}
		}

		componentDidUpdate(prevProps: Props, prevState: State) {
			if (
				!circularDeepEqual(prevProps.query, this.props.query) ||
				!circularDeepEqual(prevProps.options, this.props.options) ||
				!circularDeepEqual(prevProps.lens, this.props.lens)
			) {
				if (this.cursor) {
					this.cursor.close();
					this.setState({ results: null });
					this.cursor = null;
				}
				this.setupStream().catch(console.error);
			}
			if (
				this.props.onResultsChange &&
				!circularDeepEqual(prevState.results, this.state.results)
			) {
				this.props.onResultsChange(this.state.results);
			}
		}

		async setupStream() {
			const { query, user, lens } = this.props;
			let lenses = this.state.lenses;

			if (query === true) {
				console.error('Query schema cannot be a boolean value');
				return;
			}

			// If there is no active lens set, or if the active lens isn't in
			// the list of available lenses, pick the first of the lens
			// options, as that is what will be used to render the results.
			const activeLens =
				(lens && _.find(lenses, { slug: lens.slug })) || _.first(lenses);

			const options = {
				...this.props.options,
				..._.get(activeLens, ['data', 'queryOptions'], {}),
			};

			const maskedQuery =
				options.mask && typeof options.mask === 'function'
					? options.mask(clone(query))
					: query;

			const cursor = this.props.sdk.getCursor(
				maskedQuery,
				_.omit(options, 'mask'),
			);
			this.cursor = cursor;

			const results = await cursor.query();

			// With the full result set we can now get a more accurate set of lenses
			// but only if there wee items returned (otherwise we stick to the ones found with the mock data set)
			if (results.length > 0) {
				const { getLenses } = require('../../');
				lenses = getLenses('list', results, user, 'data.icon');
			}

			this.setState({ results, lenses });

			// TS-TODO: Fix typings for event listeners on cursor
			cursor.onUpdate(((response: {
				data: { type: any; id: any; after: any };
			}) => {
				const { id, after } = response.data;

				// If card is null then it has been set to inactive or deleted
				if (after === null) {
					this.setState((prevState) => {
						return {
							results: prevState.results
								? prevState.results.filter((contract) => contract.id !== id)
								: null,
						};
					});
					return;
				}

				// Otherwise perform an upsert
				this.setState((prevState) => {
					const index = _.findIndex(prevState.results, { id });
					// If an item is found then replace it
					if (index > -1 && prevState.results) {
						prevState.results.splice(index, 1, after);
						return {
							results: prevState.results,
						};
					}
					// Otherwise add it to the results
					if (prevState.results) {
						prevState.results.push(after);
						return {
							results: prevState.results,
						};
					} else {
						return { results: [after] };
					}
				});
			}) as any);
		}

		nextPage = async () => {
			if (this.cursor && this.cursor.hasNextPage()) {
				const results = await this.cursor.nextPage();
				this.setState((prevState) => {
					return {
						results: prevState.results
							? _.uniqBy(prevState.results.concat(results), 'id')
							: null,
					};
				});
			}
		};

		render() {
			const { results, lenses } = this.state;
			const { children } = this.props;

			const hasNextPage = !!this.cursor?.hasNextPage();

			if (children && typeof children === 'function') {
				return children({
					results,
					nextPage: this.nextPage,
					hasNextPage,
					lenses,
				});
			}

			return null;
		}
	},
);
