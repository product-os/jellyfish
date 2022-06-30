import { connect } from 'react-redux';
import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { v4 as uuid } from 'uuid';
import { Box, Flex } from 'rendition';
import { withSetup } from '../../components/SetupProvider';
import * as helpers from '../../services/helpers';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import type { Contract, JsonSchema } from 'autumndb';
import type { ChannelContract } from '../../types';
import { selectors } from '../../store';
import LiveCollection from './LiveCollection';
import LinkOrCreate from './LinkOrCreate';
import type { RelationshipContract } from 'autumndb';

interface StateProps {
	activeLoop: string | null;
	relationships: RelationshipContract[];
}

interface OwnProps {
	channel: ChannelContract;
	segment: {
		link: string;
		title: string;
		type: string;
	};
	card: Contract;
}

interface SetupProps {
	sdk: JellyfishSDK;
}

type Props = StateProps & OwnProps & SetupProps;

interface State {
	query: JsonSchema | null;
}

class Segment extends React.Component<Props, State> {
	constructor(props) {
		super(props);

		this.state = {
			query: null,
		};

		this.getData = this.getData.bind(this);
	}

	componentDidUpdate(prevProps) {
		if (!circularDeepEqual(prevProps.segment, this.props.segment)) {
			this.getData();
		} else if (!circularDeepEqual(prevProps.card, this.props.card)) {
			this.getData();
		}
	}

	componentDidMount() {
		this.getData();
	}

	getData() {
		const { card, segment, sdk, relationships } = this.props;

		const verb = segment.link;
		const targetType =
			segment.type === '*' ? 'undefined@1.0.0' : `${segment.type}@1.0.0`;
		let baseTargetType = targetType && helpers.getTypeBase(targetType);
		let linkedType: string | undefined = targetType;

		// Relationships allow '*' to indicate any type
		if (targetType === 'undefined@1.0.0') {
			// eslint-disable-next-line no-undefined
			linkedType = undefined;
			baseTargetType = '*';
		}
		const relationship = _.find(relationships, {
			name: verb,
			data: {
				to: {
					type: baseTargetType,
				},
			},
		});

		if (!relationship) {
			throw new Error(
				`No link definition found from ${card.type} to ${baseTargetType} using ${verb}`,
			);
		}

		const query = {
			$id: uuid(),
			$$links: {
				[relationship.data.inverseName!]: {
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

	render() {
		const { query } = this.state;

		const { card, channel, segment } = this.props;

		return (
			<Flex
				flexDirection="column"
				style={{
					maxWidth: '100%',
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
						<LiveCollection
							// Use a key here to force a remount if the query changes
							key={(query as any).$id}
							hideFooter
							channel={channel}
							query={query}
							card={card}
						/>
					)}
				</Box>

				{segment.link && (
					<Box px={3}>
						<LinkOrCreate segment={segment} card={card} />
					</Box>
				)}
			</Flex>
		);
	}
}

const mapStateToProps = (state: any): StateProps => {
	return {
		activeLoop: selectors.getActiveLoop()(state),
		relationships: selectors.getRelationships()(state),
	};
};

// TS-TODO: Sort out this typing nightmare. withSetup should return the correct value when combined with redux.connect
export default withSetup(
	connect<StateProps, {}, OwnProps>(mapStateToProps)(Segment) as any,
) as any as React.ComponentClass<OwnProps, State>;
