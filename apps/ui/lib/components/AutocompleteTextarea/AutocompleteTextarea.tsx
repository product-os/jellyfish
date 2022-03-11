import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete';
import * as _ from 'lodash';
import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import * as reactDnD from 'react-dnd';
import { BoxProps, Card, Txt } from 'rendition';
import styled from 'styled-components';
import type {
	Contract,
	TypeContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import { Link } from '../Link';
import * as helpers from '../../services/helpers';
import Icon from '../Icon';
import Container from './Container';
import useOnClickOutside from '../../hooks/use-on-click-outside';
import { getTrigger } from './triggers';

const QUICK_SEARCH_RE = /^\s*\?[\w_-]+\s+[\w_-]+/;

const QuickSearchPanel = styled(Card)`
	position: fixed;
	background: white;
	color: ${(props) => {
		return props.theme.colors.text.main;
	}};
	bottom: 80px;
	right: 10px;
	width: 400px;
	max-height: 75%;
	overflow: auto;
`;

const LoaderSpan = styled.span`
	color: ${(props) => {
		return props.theme.colors.text.main;
	}};
	background-color: ${(props) => {
		return props.theme.colors.background.light;
	}};
`;

const Loader = () => {
	return <LoaderSpan>Loading</LoaderSpan>;
};

interface SubAutoProps extends Omit<BoxProps, 'onChange' | 'onKeyPress'> {
	onClickOutside?: (event: Event) => unknown;
	innerRef?: (ref: HTMLTextAreaElement) => unknown;
	enableAutocomplete?: boolean;
	autoFocus?: boolean;
	types: TypeContract[];
	sdk: JellyfishSDK;
	user: UserContract;
	value?: string | number | string[];
	onChange: React.ChangeEventHandler<HTMLTextAreaElement> | undefined;
	onKeyPress: React.KeyboardEventHandler<HTMLTextAreaElement> | undefined;
}

const SubAuto: React.FunctionComponent<SubAutoProps> = (props) => {
	const {
		innerRef,
		onClickOutside,
		enableAutocomplete,
		autoFocus,
		types,
		sdk,
		user,
		value,
		className,
		onChange,
		onKeyPress,
		placeholder,
	} = props;
	const rest = _.omit(props, [
		'value',
		'className',
		'innerRef',
		'onClickOutside',
		'onChange',
		'onKeyPress',
		'placeholder',
	]);
	const [textareaRef, setTextareaRef] =
		React.useState<HTMLTextAreaElement | null>(null);

	if (autoFocus) {
		React.useEffect(() => {
			if (textareaRef) {
				textareaRef.focus();
				// eslint-disable-next-line no-multi-assign
				textareaRef.selectionStart = textareaRef.selectionEnd = 10000;
			}
		}, [textareaRef]);
	}

	const innerRefCallback = (ref: HTMLTextAreaElement) => {
		setTextareaRef(ref);
		if (innerRef) {
			innerRef(ref);
		}
	};

	// TODO: Don't user hooks inside condition https://reactjs.org/docs/hooks-rules.html#only-call-hooks-at-the-top-level
	if (onClickOutside) {
		useOnClickOutside(
			textareaRef!,
			React.useCallback(onClickOutside, [onClickOutside]),
		);
	}

	// ReactTextareaAutocomplete autocompletion doesn't work with JSDom, so disable
	// it during testing

	return (
		<Container {...rest}>
			<ReactTextareaAutocomplete
				innerRef={innerRefCallback}
				// @ts-ignore
				textAreaComponent={{
					component: TextareaAutosize,
					ref: 'ref',
				}}
				className={className}
				value={value}
				onChange={onChange}
				onKeyPress={onKeyPress}
				loadingComponent={Loader}
				trigger={enableAutocomplete ? getTrigger(types, sdk, user) : {}}
				placeholder={placeholder}
				maxRows={12}
				listStyle={{
					color: 'black',
				}}
			/>
		</Container>
	);
};

const cardSource: reactDnD.DragSourceSpec<any, any> = {
	beginDrag(props) {
		return props.card;
	},
};

const collect: reactDnD.DragSourceCollector<
	{ connectDragSource: reactDnD.ConnectDragSource; isDragging: boolean },
	any
> = (connect, monitor) => {
	return {
		connectDragSource: connect.dragSource(),
		isDragging: monitor.isDragging(),
	};
};

interface QuickSearchItemProps {
	card: Contract;
	onClick: (card: Contract) => unknown;
	connectDragSource: reactDnD.ConnectDragSource;
}

class QuickSearchItem extends React.Component<QuickSearchItemProps> {
	constructor(props: QuickSearchItemProps) {
		super(props);

		this.onClick = this.onClick.bind(this);
	}

	onClick() {
		this.props.onClick(this.props.card);
	}

	render() {
		const { card, connectDragSource } = this.props;
		return connectDragSource(
			<span>
				<Link append={card.slug || card.id} data-test="quick-search__result">
					{card.name || card.slug || card.id}
				</Link>
			</span>,
		);
	}
}

const ConnectedQuickSearchItem = reactDnD.DragSource(
	'channel',
	cardSource,
	collect,
)(QuickSearchItem);

interface AutoCompleteAreaProps
	extends Omit<
		SubAutoProps,
		'onSubmit' | 'types' | 'sdk' | 'value' | 'onChange' | 'onKeyPress' | 'place'
	> {
	value?: string;
	sdk: JellyfishSDK;
	onChange: (event: any) => unknown;
	onSubmit: (event: React.KeyboardEvent) => unknown;
	types: TypeContract[];
	sendCommand: string;
}

interface AutoCompleteAreaState {
	value: string;
	showQuickSearchPanel: boolean;
	results: Contract[] | null;
}

class AutoCompleteArea extends React.Component<
	AutoCompleteAreaProps,
	AutoCompleteAreaState
> {
	constructor(props: AutoCompleteAreaProps) {
		super(props);

		this.state = {
			showQuickSearchPanel: false,
			value: props.value || '',
			results: null,
		};

		this.handleOnKeyPress = this.handleOnKeyPress.bind(this);
		this.handleOnChange = this.handleOnChange.bind(this);
		this.loadResults = _.debounce(this.loadResults.bind(this), 750, {
			leading: true,
		});
		this.openQuickSearchItem = this.openQuickSearchItem.bind(this);
	}

	loadResults(typeCard: TypeContract, value: string) {
		let filter = helpers.createFullTextSearchFilter(
			typeCard.data.schema,
			value,
			{
				fullTextSearchFieldsOnly: true,
			},
		);
		if (!filter) {
			this.setState({
				results: [],
			});
			return;
		}
		if (filter === true) {
			filter = {};
		}
		_.set(filter, ['properties', 'type'], {
			type: 'string',
			const: `${typeCard.slug}@${typeCard.version}`,
		});
		this.props.sdk
			.query(filter, {
				limit: 20,
				sortBy: 'name',
			})
			.then((results) => {
				this.setState({
					results,
				});
			});
	}

	componentDidUpdate(prevProps: AutoCompleteAreaProps) {
		if (this.props.value !== prevProps.value) {
			this.processInput(this.props.value!);
		}
	}

	handleOnChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
		this.processInput(event.target.value);

		if (this.props.onChange) {
			this.props.onChange(event);
		}
	}

	processInput(value: string) {
		const { types } = this.props;

		this.setState({
			value,
		});

		if (value.match(QUICK_SEARCH_RE)) {
			const [typeSlug, ...rest] = value.trim().split(/\s+/);
			const slug = typeSlug.replace('?', '');
			const typeCard = _.find(types, {
				slug,
			});
			if (!rest.length || !typeCard) {
				return;
			}
			this.setState({
				showQuickSearchPanel: true,
				results: null,
			});
			this.loadResults(typeCard, rest.join(' '));
			return;
		}

		this.setState({
			showQuickSearchPanel: false,
			results: null,
		});
	}

	handleOnKeyPress(event: React.KeyboardEvent) {
		const sendCommand = this.props.sendCommand;

		let shouldSend = false;

		// If the send command is shift+enter, only submit the text if the shift
		// key is pressed
		if (sendCommand === 'shift+enter') {
			shouldSend = Boolean(event.shiftKey);
		}

		// If the send command is ctrl+enter, only submit the text if the shift
		// key is pressed
		if (sendCommand === 'ctrl+enter') {
			shouldSend = Boolean(event.ctrlKey);
		}

		// If the send command is enter, only submit the text if the shift
		// key is NOT pressed
		if (sendCommand === 'enter') {
			shouldSend = !event.shiftKey && !event.ctrlKey;
		}

		if (
			(event.which === 13 || event.keyCode === 13) &&
			shouldSend &&
			this.props.onSubmit
		) {
			this.props.onSubmit(event);

			this.setState({
				value: '',
			});
		}
	}

	openQuickSearchItem() {
		this.setState({
			showQuickSearchPanel: false,
			results: null,
		});
	}

	render() {
		const rest = _.omit(this.props, [
			'onChange',
			'onSubmit',
			'sendCommand',
			'value',
		]);

		return (
			<React.Fragment>
				<SubAuto
					value={this.state.value}
					onChange={this.handleOnChange}
					onKeyPress={this.handleOnKeyPress}
					{...rest}
				/>

				{this.state.showQuickSearchPanel && (
					<QuickSearchPanel p={3}>
						<Txt mb={2}>
							<strong>Quick search results</strong>
						</Txt>

						{!this.state.results && <Icon spin name="cog" />}

						{this.state.results && this.state.results.length === 0 && (
							<Txt>No results found</Txt>
						)}

						{_.map(this.state.results, (card) => {
							return (
								<div key={card.id}>
									<ConnectedQuickSearchItem
										card={card}
										onClick={this.openQuickSearchItem}
									/>
								</div>
							);
						})}
					</QuickSearchPanel>
				)}
			</React.Fragment>
		);
	}
}

export default AutoCompleteArea;
