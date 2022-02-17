import Bluebird from 'bluebird';
import { connect } from 'react-redux';
import clone from 'deep-copy';
import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { Box, Button, Flex } from 'rendition';
import { helpers, Icon, withSetup } from '@balena/jellyfish-ui-components';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import type {
	Contract,
	TypeContract,
} from '@balena/jellyfish-types/build/core';
import { BoundActionCreators } from '../../types';
import { LinkModal } from '../../components/LinkModal';
import { actionCreators, selectors } from '../../core';

interface StateProps {
	activeLoop: string | null;
}

interface OwnProps {
	segment:
		| {
				link: string;
				type: string;
		  }
		| {
				query: Array<{
					link: string;
					type: string;
				}>;
		  };
	types: TypeContract[];
	card: Contract;
	draftCards?: Contract[];
	onCardsUpdated?: (cards: Contract[]) => any;
	onSave?: (
		card: Contract | null,
		selectedTarget: Contract,
		linkTypeName: string,
	) => any;
	showLinkToExistingElementButton?: boolean;
	actions: BoundActionCreators<
		Pick<typeof actionCreators, 'addChannel' | 'getLinks' | 'queryAPI'>
	>;
}

interface SetupProps {
	sdk: JellyfishSDK;
}

type Props = StateProps & OwnProps & SetupProps;

interface State {
	results: Contract[] | null;
	showLinkModal: boolean;
}

class Segment extends React.Component<Props, State> {
	constructor(props) {
		super(props);

		this.state = {
			results: props.draftCards || null,
			showLinkModal: false,
		};

		this.openCreateChannel = this.openCreateChannel.bind(this);
		this.openLinkModal = this.openLinkModal.bind(this);
		this.hideLinkModal = this.hideLinkModal.bind(this);
		this.updateResults = this.updateResults.bind(this);
		this.getData = this.getData.bind(this);
	}

	componentDidUpdate(prevProps) {
		if (!circularDeepEqual(prevProps.segment, this.props.segment)) {
			this.setState({
				results: null,
			});
			this.getData();
		} else if (
			!circularDeepEqual(prevProps.card, this.props.card) ||
			!circularDeepEqual(prevProps.draftCards, this.props.draftCards)
		) {
			this.getData();
		}
	}

	openLinkModal() {
		this.setState({
			showLinkModal: true,
		});
	}

	hideLinkModal() {
		this.setState({
			showLinkModal: false,
		});
	}

	componentDidMount() {
		this.getData();
	}

	updateResults(results) {
		const { onCardsUpdated, draftCards } = this.props;
		this.setState(
			{
				results: _.unionBy(results, draftCards || [], 'id'),
			},
			() => {
				if (onCardsUpdated) {
					onCardsUpdated(results);
				}
			},
		);
	}

	async getData() {
		const { card, segment, actions, sdk } = this.props;

		if ('link' in segment) {
			const results = await actions.getLinks(
				{
					sdk,
				},
				card,
				segment.link,
				segment.type === '*' ? 'undefined@1.0.0' : `${segment.type}@1.0.0`,
			);
			this.updateResults(results);
		} else if (segment.query) {
			let context = [card];
			for (const relation of _.castArray(segment.query)) {
				if (relation.link) {
					context = await actions.getLinks(
						{
							sdk,
						},
						card,
						relation.link,
						`${relation.type}@1.0.0`,
					);
				} else {
					const mapped = await Bluebird.map(context, (item) => {
						return actions.queryAPI(
							helpers.evalSchema(clone(relation), {
								result: item,
							}),
						);
					});
					context = _.flatten(mapped);
				}
			}

			this.updateResults(_.flatten(context));
		}
	}

	openCreateChannel() {
		const {
			actions: { addChannel },
			card,
			segment,
			types,
			onSave,
			activeLoop,
		} = this.props;

		addChannel({
			head: {
				types: _.find(types, {
					slug: (segment as any).type.split('@')[0],
				}),
				seed: {
					markers: card.markers,
					loop: card.loop || activeLoop,
				},
				onDone: {
					action: 'link',
					targets: [card],
					onLink: onSave
						? (newCard: Contract) => {
								return onSave(null, newCard, (segment as any).link);
						  }
						: null,
					callback: this.getData,
				},
			},
			format: 'create',
			canonical: false,
		});
	}

	render() {
		const { results, showLinkModal } = this.state;

		const {
			card,
			segment,
			types,
			onSave,
			showLinkToExistingElementButton = true,
		} = this.props;

		console.log('actions', this.props.actions);

		const type = _.find(types, {
			slug: helpers.getRelationshipTargetType(segment),
		});

		if (!results) {
			return (
				<Box p={3}>
					<Icon name="cog" spin />
				</Box>
			);
		}

		// This is to avoid circular dependency
		const lens = require('../../lens').getLens('list', results);

		return (
			<Flex
				flexDirection="column"
				style={{
					flex: 1,
				}}
			>
				<Box
					flex={1}
					mt={3}
					style={{
						minHeight: 0,
					}}
				>
					{results.length === 0 && (
						<Box px={3}>
							<strong>No results found</strong>
						</Box>
					)}
					{Boolean(results.length) && (
						<lens.data.renderer
							tail={results}
							page={1}
							totalPages={1}
							nextPage={_.noop}
							pageOptions={{
								limit: 30,
								sortBy: ['created_at'],
								sortDir: 'desc',
							}}
						/>
					)}
				</Box>

				{(segment as any).link && type && (
					<Flex px={3} pb={3} flexWrap="wrap">
						<Button
							mr={2}
							mt={2}
							success
							data-test={`add-${type.slug}`}
							onClick={this.openCreateChannel}
						>
							Add new {type.name || type.slug}
						</Button>

						{showLinkToExistingElementButton && (
							<Button
								outline
								mt={2}
								data-test={`link-to-${type.slug}`}
								onClick={this.openLinkModal}
							>
								Link to an existing {type.name || type.slug}
							</Button>
						)}
					</Flex>
				)}

				{showLinkModal && (
					<LinkModal
						linkVerb={(segment as any).link}
						cards={[card]}
						targetTypes={[type]}
						onHide={this.hideLinkModal}
						onSave={onSave}
						onSaved={this.getData}
					/>
				)}
			</Flex>
		);
	}
}

const mapStateToProps = (state: any): StateProps => {
	return {
		activeLoop: selectors.getActiveLoop(state),
	};
};

// TS-TODO: Sort out this typing nightmare. withSetup should return the correct value when combined with redux.connect
export default withSetup(
	connect<StateProps, {}, OwnProps>(mapStateToProps)(Segment) as any,
) as any as React.ComponentClass<OwnProps, State>;
