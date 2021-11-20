import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import {
	Box,
	Button,
	Divider,
	Flex,
	Heading,
	Search,
	Tab,
	Tabs,
	Txt,
} from 'rendition';
import styled from 'styled-components';
import { helpers, Icon } from '@balena/jellyfish-ui-components';
import { RelationshipsTab, customQueryTabs } from '../../common';
import CardFields from '../../../components/CardFields';
import CardLayout from '../../../layouts/CardLayout';
import { getContextualThreadsQuery, getLensBySlug } from '../../';
import { ViewFooter } from '../../common';

const SingleCardTabs = styled(Tabs)`
	flex: 1 > [role= 'tabpanel' ] {
		flex: 1;
	}
`;

const LIMIT = 30;

export default class RepositoryFull extends React.Component<any, any> {
	eventSchema;
	isLoadingPage;

	constructor(props) {
		super(props);

		const tail = _.get(this.props.card.links, ['has attached element'], []);

		const comms = _.filter(tail, (item) => {
			const typeBase = item.type.split('@')[0];
			return typeBase === 'message' || typeBase === 'whisper';
		});

		this.state = {
			activeIndex: comms.length ? 1 : 0,
			expanded: false,
			options: {
				page: 0,
				totalPages: Infinity,
			},
			searchTerm: '',
		};

		const messageType = helpers.getType('message', this.props.types);
		this.eventSchema = messageType.data.schema;

		this.setActiveIndex = this.setActiveIndex.bind(this);
		this.setPage = this.setPage.bind(this);
		this.onSearchTermChange = this.onSearchTermChange.bind(this);
		this.refreshQuery = _.debounce(this.refreshQuery, 350);
		this.isLoadingPage = false;
	}

	async loadThreadData(page, searchTerm = '') {
		const query = getContextualThreadsQuery(this.props.card.id);
		if (searchTerm) {
			const searchQuery = helpers.createFullTextSearchFilter(
				this.eventSchema,
				searchTerm,
				{
					fullTextSearchFieldsOnly: true,
				},
			);
			if (searchQuery) {
				query.anyOf = (query.anyOf || []).concat(searchQuery.anyOf);
			}
		}
		const options = {
			viewId: this.props.card.id,
			page,
			limit: LIMIT,
			sortBy: 'created_at',
			sortDir: 'desc',
		};

		const loader =
			page === 0
				? this.props.actions.loadViewData
				: this.props.actions.loadMoreViewData;

		return loader(query, options).then((results) => {
			this.setState({
				options: {
					...this.state.options,
					page,
					totalPages:
						results.length < LIMIT ? page : this.state.options.totalPages,
				},
			});
		});
	}

	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	componentDidMount() {
		this.loadThreadData(this.state.options.page, this.state.searchTerm);
	}

	setActiveIndex(activeIndex) {
		this.setState({
			activeIndex,
		});
	}

	async setPage(page) {
		if (this.isLoadingPage) {
			return;
		}

		if (page + 1 >= this.state.options.totalPages) {
			return;
		}

		this.isLoadingPage = true;

		const options = Object.assign({}, this.state.options, {
			page,
		});

		await this.loadThreadData(options.page, this.state.searchTerm);

		this.isLoadingPage = false;
	}

	onSearchTermChange(event) {
		this.setState(
			{
				searchTerm: event.target.value,
			},
			() => {
				this.refreshQuery();
			},
		);
	}

	refreshQuery() {
		this.loadThreadData(this.state.options.page, this.state.searchTerm);
	}

	componentWillUnmount() {
		// Clean up store data on unmount
		const query = getContextualThreadsQuery(this.props.card.id);
		this.props.actions.clearViewData(query, {
			viewId: this.props.card.id,
		});
	}

	render() {
		const { card, channel, types } = this.props;
		const { searchTerm, expanded } = this.state;
		const type = helpers.getType(card.type, types);

		const threadType = helpers.getType('thread', types);
		const messages = _.sortBy(this.props.messages, 'created_at');

		const Interleaved = getLensBySlug('lens-interleaved').data.renderer;

		return (
			<CardLayout
				overflowY
				card={card}
				channel={channel}
				inlineActionItems={
					<Box mr={2} data-test="repository__search">
						<Search
							value={searchTerm}
							onChange={this.onSearchTermChange}
							placeholder="Search..."
						/>
					</Box>
				}
				title={
					<Flex>
						<Button
							plain
							mr={3}
							icon={<Icon name={`chevron-${expanded ? 'up' : 'down'}`} />}
							onClick={() =>
								this.setState({
									expanded: !expanded,
								})
							}
						/>
						<Box>
							<Heading.h4>{card.name || card.slug || card.type}</Heading.h4>

							<Txt color="text.light" fontSize="0">
								Repository
							</Txt>
						</Box>
					</Flex>
				}
			>
				<Divider mb={0} width="100%" color={helpers.colorHash(card.type)} />

				{expanded && (
					<SingleCardTabs
						activeIndex={this.state.activeIndex}
						onActive={this.setActiveIndex}
					>
						<Tab title="Info">
							<Box p={3}>
								<CardFields card={card} type={type} />
							</Box>
						</Tab>

						{customQueryTabs(card, type)}
						<RelationshipsTab card={card} />
					</SingleCardTabs>
				)}

				<Flex
					flexDirection="column"
					style={{
						overflow: 'auto',
					}}
					flex={1}
				>
					<Interleaved
						channel={channel}
						tail={messages}
						setPage={this.setPage}
						page={this.state.options.page}
						totalPages={this.state.options.totalPages}
					/>
					<ViewFooter types={[threadType]} justifyContent="flex-end" />
				</Flex>
			</CardLayout>
		);
	}
}
