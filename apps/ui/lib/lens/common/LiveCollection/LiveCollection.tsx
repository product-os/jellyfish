import { Contract, UserContract } from '@balena/jellyfish-types/build/core';
import clone from 'deep-copy';
import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import * as React from 'react';
import jsf from 'json-schema-faker';
import { sdk } from '../../../core';
import { LensContract } from '../../../types';
import { getLenses } from '../..';

interface Props {
	user: UserContract;
	query: Parameters<typeof sdk.getCursor>[0];
	options: Parameters<typeof sdk.getCursor>[1];
	onResultsChange?: (collection: Contract[] | null) => any;
}

interface State {
	results: Contract[] | null;
	lenses: LensContract[];
}

export default class LiveCollection extends React.Component<Props, State> {
	cursor: ReturnType<typeof sdk.getCursor> | null = null;

	constructor(props: Props) {
		super(props);

		// As there isn't data loaded, mock the expected output based on the query
		// schema and use the mock to select appropriate lenses
		const mockCollection = [jsf.generate(props.query as any)];

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
		this.setupStream();
	}

	componentWillUnmount() {
		if (this.cursor) {
			this.cursor.close();
		}
	}

	componentDidUpdate(prevProps: Props, prevState: State) {
		if (
			!circularDeepEqual(prevProps.query, this.props.query) ||
			!circularDeepEqual(prevProps.options, this.props.options)
		) {
			if (this.cursor) {
				this.cursor.close();
				this.setState({ results: null });
				this.cursor = null;
			}
			this.setupStream();
		}
		if (
			this.props.onResultsChange &&
			!circularDeepEqual(prevState.results, this.state.results)
		) {
			this.props.onResultsChange(this.state.results);
		}
	}

	async setupStream() {
		const { query, options, user } = this.props;
		const maskedQuery = options.mask ? options.mask(clone(query)) : query;
		const cursor = sdk.getCursor(maskedQuery, options);
		this.cursor = cursor;

		const results = await cursor.query();

		// With the full result set we can now get a more accurate set of lenses
		const lenses = getLenses('list', results, user, 'data.icon');

		this.setState({ results, lenses });

		// TS-TODO: Fix typings for event listeners on cursor
		cursor.onUpdate(((response: {
			data: { type: any; id: any; after: any };
		}) => {
			const { type, id, after } = response.data;

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

			// If the type is insert, it is a new item
			if (type === 'insert') {
				this.setState((prevState) => {
					return {
						results: prevState.results ? prevState.results.concat(after) : null,
					};
				});
				return;
			}

			// All other updates are an upsert
			this.setState((prevState) => {
				const index = _.findIndex(prevState.results, { id });
				if (prevState.results) {
					prevState.results.splice(index, 1, after);
					return {
						results: prevState.results,
					};
				}

				return {
					results: null,
				};
			});
		}) as any);
	}

	nextPage = async () => {
		if (this.cursor) {
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

		const hasNextPage = false;

		if (children) {
			const childrenWithProps = React.Children.map(children, (child) => {
				if (React.isValidElement(child)) {
					return React.cloneElement(child, {
						results,
						nextPage: this.nextPage,
						hasNextPage,
						lenses,
					});
				}
				return child;
			});

			return <>{childrenWithProps}</>;
		}

		return null;
	}
}