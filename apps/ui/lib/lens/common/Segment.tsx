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
import { JsonSchema } from '@balena/jellyfish-types';
import { BoundActionCreators, ChannelContract } from '../../types';
import { LinkModal } from '../../components/LinkModal';
import { actionCreators, selectors } from '../../core';
import LiveCollection from './LiveCollection';

interface StateProps {
	activeLoop: string | null;
}

interface OwnProps {
	channel: ChannelContract;
	segment: {
		link: string;
		title: string;
		type: string;
	};
	types: TypeContract[];
	card: Contract;
	draftCards?: Contract[];
	onSave?: (
		card: Contract | null,
		selectedTarget: Contract,
		linkTypeName: string,
	) => any;
	actions: BoundActionCreators<
		Pick<typeof actionCreators, 'addChannel' | 'getLinks' | 'queryAPI'>
	>;
}

interface SetupProps {
	sdk: JellyfishSDK;
}

type Props = StateProps & OwnProps & SetupProps;

interface State {
	showLinkModal: boolean;
	query: JsonSchema | null;
}

class Segment extends React.Component<Props, State> {
	constructor(props) {
		super(props);

		this.state = {
			showLinkModal: false,
			query: null,
		};

		this.openCreateChannel = this.openCreateChannel.bind(this);
		this.openLinkModal = this.openLinkModal.bind(this);
		this.hideLinkModal = this.hideLinkModal.bind(this);
		this.getData = this.getData.bind(this);
	}

	componentDidUpdate(prevProps) {
		if (!circularDeepEqual(prevProps.segment, this.props.segment)) {
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

	getData() {
		const { card, segment, actions, sdk } = this.props;

		const verb = segment.link;
		const targetType =
			segment.type === '*' ? 'undefined@1.0.0' : `${segment.type}@1.0.0`;
		let baseTargetType = targetType && helpers.getTypeBase(targetType);
		let linkedType: string | undefined = targetType;

		// Link constraints allow '*' to indicate any type
		if (targetType === 'undefined@1.0.0') {
			// eslint-disable-next-line no-undefined
			linkedType = undefined;
			baseTargetType = '*';
		}
		const linkDefinition = _.find(sdk.LINKS, {
			name: verb,
			data: {
				to: baseTargetType,
			},
		});

		if (!linkDefinition) {
			throw new Error(
				`No link definition found from ${card.type} to ${baseTargetType} using ${verb}`,
			);
		}

		// Find the inverse of the link definition
		const inverseDefinition = _.find(sdk.LINKS, {
			slug: linkDefinition.data.inverse,
		});

		if (!inverseDefinition) {
			throw new Error(
				`No link definition found from ${baseTargetType} to ${card.type} using ${verb}`,
			);
		}

		const query = {
			$$links: {
				[inverseDefinition.name]: {
					type: 'object',
					required: ['id'],
					properties: {
						id: {
							const: card.id,
						},
					},
				},
			},
			// Always load the owner if there is one
			anyOf: [
				{
					$$links: {
						'is owned by': {
							type: 'object',
						},
					},
				},
				true,
			],
			description: `Get ${baseTargetType} contracts linked to ${card.id}`,
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: linkedType,
				},
				links: {
					type: 'object',
				},
			},
			required: ['type'],
		} as any as JsonSchema;

		this.setState({
			query,
		});
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
					slug: segment.type.split('@')[0],
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
								return onSave(null, newCard, segment.link);
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
		const { showLinkModal, query } = this.state;

		const { card, channel, segment, types, onSave } = this.props;

		const type = _.find(types, {
			slug: helpers.getRelationshipTargetType(segment),
		});

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
					{!!query && (
						<LiveCollection channel={channel} query={query} card={card} />
					)}
				</Box>

				{segment.link && type && (
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

						<Button
							outline
							mt={2}
							data-test={`link-to-${type.slug}`}
							onClick={this.openLinkModal}
						>
							Link to an existing {type.name || type.slug}
						</Button>
					</Flex>
				)}

				{showLinkModal && (
					<LinkModal
						linkVerb={segment.link}
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
