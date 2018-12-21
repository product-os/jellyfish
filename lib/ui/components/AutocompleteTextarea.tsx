import ReactTextareaAutocomplete = require('@webscopeio/react-textarea-autocomplete/dist/react-textarea-autocomplete.cjs.js');
import * as _ from 'lodash';
import * as React from 'react';
import { Box, BoxProps, Card, Link, Theme, Txt } from 'rendition';
import styled from 'styled-components';
import { sdk, store } from '../core';
import { actionCreators, selectors } from '../core/store';
import {
	createChannel,
	createFullTextSearchFilter,
} from '../services/helpers';

import { DragSource } from 'react-dnd';

// ReactTextareaAutocomplete autocompletion doesn't work with JSDom, so disable
// it during testing
const ACTIVE = process.env.NODE_ENV !== 'test';

const Container = styled(Box)`
	.rta {
		position: relative;
		font-size: 1em;
		width: 100%;
		height: 100%;
	}
	.rta__loader.rta__loader--empty-suggestion-data {
		border-radius: 3px;
		box-shadow: 0 0 5px rgba(27, 31, 35, 0.1);
		padding: 5px;
	}
	.rta--loading .rta__loader.rta__loader--suggestion-data {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(255, 255, 255, 0.8);
	}
	.rta--loading .rta__loader.rta__loader--suggestion-data > * {
		position: relative;
		top: 50%;
	}
	.rta__textarea {
		width: 100%;
		height: 100%;
		font-size: 1em;
		border-radius: ${Theme.radius}px;
		border: 1px solid ${Theme.colors.gray.main};
		padding: 8px 16px;
		resize: vertical;
		display: block;
		&:hover {
			box-shadow: 0 0 4px 1px rgba(0, 0, 0, 0.1);
		}
		&::placeholder {
			color: ${Theme.colors.gray.main};
		}
	}
	.rta__autocomplete {
		position: absolute;
		display: block;
		transform: translateY(-100%);
	}
	.rta__list {
		margin: 0;
		padding: 0;
		background: #fff;
		border: 1px solid #dfe2e5;
		border-radius: 3px;
		box-shadow: 0 0 5px rgba(27, 31, 35, 0.1);
		list-style: none;
	}
	.rta__entity {
		background: white;
		width: 100%;
		text-align: left;
		outline: none;
	}
	.rta__entity:hover {
		cursor: pointer;
	}
	.rta__item:not(:last-child) {
		border-bottom: 1px solid #dfe2e5;
	}
	.rta__entity > * {
		padding-left: 4px;
		padding-right: 4px;
	}
	.rta__entity--selected {
		color: #fff;
		text-decoration: none;
		background: #0366d6;
	}
`;

interface AutocompleteItemProps {
	selected: boolean;
	entity: {
		char: string;
		name: string;
	};
}

const AutocompleteItem = ({ entity: { char, name }}: AutocompleteItemProps) => {
	return <div>{`${name}: ${char}`}</div>;
};

const baseData: Array<{ name: string, char: string }> = [
	{ name: 'smile', char: '🙂' },
	{ name: 'heart', char: '❤️' },
	{ name: '+1', char: '👍' },
];

const getTrigger = _.memoize(() => ({
	':': {
		dataProvider: (token: string) => {
			if (!token) {
				return baseData;
			}
			return baseData.filter(({ name }) => _.startsWith(name, token));
		},
		component: AutocompleteItem,
		output: (item: any) => item.char,
	},
	'@': {
		dataProvider: (token: string) => {
			const usernames = selectors.getAllUsers(store.getState())
				.map(({ slug }) => '@' + _.trimStart(slug, 'user-'));

			if (!token) {
				return usernames;
			}
			const matcher = '@' + token.toLowerCase();
			return usernames.filter((name) => _.startsWith(name, matcher));
		},
		component: ({ entity }: { entity: string }) => <div>{entity}</div>,
		output: (item: any) => item,
	},
	'!': {
		dataProvider: (token: string) => {
			const usernames = selectors.getAllUsers(store.getState())
				.map(({ slug }) => '!' + _.trimStart(slug, 'user-'));

			if (!token) {
				return usernames;
			}
			const matcher = '!' + token.toLowerCase();
			return usernames.filter((name) => _.startsWith(name, matcher));
		},
		component: ({ entity }: { entity: string }) => <div>{entity}</div>,
		output: (item: any) => item,
	},
	'?': {
		dataProvider: (token: string) => {
			const types = selectors.getTypes(store.getState())
				.map(({ slug }) => `?${slug}`);

			if (!token) {
				return types;
			}
			const matcher = '?' + token.toLowerCase();
			return types.filter((slug) => _.startsWith(slug, matcher));
		},
		component: ({ entity }: { entity: string }) => <div>{entity}</div>,
		output: (item: any) => item,
	},
	'#': {
		dataProvider: (token: string) => {
			const types = [
				'#provisioning',
				'#sales',
				'#billing',
				'#users',
				'#device-management',
				'#analytics',
			];

			if (!token) {
				return types;
			}

			const matcher = '#' + token.toLowerCase();
			return types.filter((slug) => _.startsWith(slug, matcher));
		},
		component: ({ entity }: { entity: string }) => <div>{entity}</div>,
		output: (item: any) => item,
	},
}));

interface AutoProps extends BoxProps {
	className?: string;
	placeholder?: string;
	value?: string;
}

const Loader = () => <span>Loading</span>;

const QUICK_SEARCH_RE = /^\s*\?[\w_-]+/;

const SubAuto = ({
	value,
	className,
	onChange,
	onKeyPress,
	placeholder,
	...props
}: AutoProps) => {
	const rows = Math.min(
		(value || '').split('\n').length,
		10,
	);

	return (
		<Container {...props}>
			<ReactTextareaAutocomplete
				className={className}
				rows={rows || 1}
				value={value}
				onChange={onChange}
				onKeyPress={onKeyPress}
				loadingComponent={Loader}
				trigger={ACTIVE ? getTrigger() : {}}
				placeholder={placeholder}
			/>
		</Container>
	);
};

const cardSource = {
	beginDrag(props: any): any {
		return props.card;
	},
};

function collect(connect: any, monitor: any): any {
	return {
		connectDragSource: connect.dragSource(),
		isDragging: monitor.isDragging(),
	};
}

class QuickSearchItem extends React.Component<any, any> {
	public render(): React.ReactNode {
		const { card, connectDragSource, onClick } = this.props;
		return connectDragSource(
			<span>
				<Link
					onClick={onClick}
				>
					{card.name || card.slug || card.id}
				</Link>
			</span>,
		);
	}
}

const ConnectedQuickSearchItem = DragSource('channel', cardSource, collect)(QuickSearchItem);

interface AutoState {
	showQuickSearchPanel: boolean;
	value: string;
	results: null | Card[];
}

interface AutoCompleteAreaProps extends AutoProps {
	onTextSubmit: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

class AutoCompleteArea extends React.Component<AutoCompleteAreaProps, AutoState> {
	constructor(props: AutoCompleteAreaProps) {
		super(props);

		this.state = {
			showQuickSearchPanel: false,
			value: props.value || '',
			results: null,
		};
	}

	public componentWillUpdate(nextProps: AutoCompleteAreaProps): void {
		if (nextProps.value !== this.props.value) {
			this.setState({ value: nextProps.value || '' });
		}
	}

	public loadResults = _.debounce((typeCard: any, value: string) => {
		const filter = createFullTextSearchFilter(typeCard.data.schema, value);

		_.set(filter, [ 'properties', 'type' ], {
			type: 'string',
			const: typeCard.slug,
		});

		sdk.query(filter as any)
			.then((results) => {
				this.setState({ results: results as any });
			});
	}, 750, { leading: true });

	public handleOnChange = (e: any) => {
		const value = e.target.value;

		this.setState({
			value,
		});

		if (value.match(QUICK_SEARCH_RE)) {
			const [ typeSlug, ...rest ] = value.trim().split(/\s+/);

			const slug = typeSlug.replace('?', '');

			const types = selectors.getTypes(store.getState());
			const typeCard = _.find(types, { slug });

			if (!rest.length || !typeCard) {
				return;
			}

			this.setState({
				showQuickSearchPanel: true,
				results: null,
			});

			return this.loadResults(typeCard as any, rest.join(' '));
		}

		this.setState({
			showQuickSearchPanel: false,
			results: null,
		});

		if (this.props.onChange) {
			this.props.onChange(e);
		}
	}

	public handleOnKeyPress = (e: any) => {
		// If the Enter key is pressed without the shift modifier, run the submit
		// callback
		if (e.key === 'Enter' && !e.shiftKey && this.props.onTextSubmit) {
			this.props.onTextSubmit(e);
		}
	}

	public render(): React.ReactNode {
		const {
			value,
			className,
			onChange,
			onTextSubmit,
			placeholder,
			...props
		} = this.props;

		return (
			<>
				<SubAuto
					className={className}
					value={this.state.value}
					onChange={this.handleOnChange}
					onKeyPress={this.handleOnKeyPress}
					placeholder={placeholder}
					{...props}
				/>

				{this.state.showQuickSearchPanel && (
					<Card
						p={3}
						style={{
							position: 'fixed',
							background: 'white',
							bottom: 80,
							right: 10,
							width: 400,
							maxHeight: '75%',
							overflow: 'auto',
						}}
					>
						<Txt mb={2}><strong>Quick search results</strong></Txt>
						{!this.state.results && (
							<i className="fas fa-cog fa-spin" />
						)}
						{this.state.results && this.state.results.length === 0 && (
							<Txt>No results found</Txt>
						)}
						{_.map(this.state.results, (card: any) => {
							return (
								<div key={card.id}>
									<ConnectedQuickSearchItem
										card={card}
										onClick={() => {
											store.dispatch(actionCreators.addChannel(createChannel({
												target: card.id,
												cardType: card.type,
												head: card,
											})));

											this.setState({
												showQuickSearchPanel: false,
												results: null,
											});
										}}
									/>
								</div>
							);
						})}
					</Card>
				)}
			</>
		);
	}
}

export default AutoCompleteArea;
