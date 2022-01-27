import { circularDeepEqual } from 'fast-equals';
import * as _ from 'lodash';
import { connect } from 'react-redux';
import React from 'react';
import { Box, Divider, Tab, Tabs, Theme } from 'rendition';
import styled from 'styled-components';
import { helpers } from '@balena/jellyfish-ui-components';
import { bindActionCreators } from '../../bindactioncreators';
import CardFields from '../../components/CardFields';
import CardLayout from '../../layouts/CardLayout';
import Timeline from '../list/Timeline';
import { UI_SCHEMA_MODE } from '../schema-util';
import { RelationshipsTab, customQueryTabs } from '../common';
import { actionCreators, selectors } from '../../core';
import { BoundActionCreators, LensRendererProps } from '../../types';
import { core } from '@balena/jellyfish-types';

export type OwnProps = LensRendererProps & {
	actionItems?: React.ReactNode;
	'data-test'?: string;
	children?: React.ReactNode;
};

export interface StateProps {
	types: core.TypeContract;
}

export interface DispatchProps {
	actions: BoundActionCreators<
		Pick<
			typeof actionCreators,
			'createLink' | 'addChannel' | 'getLinks' | 'queryAPI'
		>
	>;
}

type Props = StateProps & DispatchProps & OwnProps;

interface State {
	activeIndex: number;
}

export const ContractTabs = styled(Tabs)`
	flex: 1;
	> [role='tablist'] {
		height: 100%;
	}
	> [role='tabpanel'] {
		flex: 1;
		overflow-y: auto;
	}
`;

export class ContractRenderer extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);

		const tail = _.get(this.props.card.links, ['has attached element'], []);

		const comms = _.filter(tail, (item) => {
			const typeBase = item.type.split('@')[0];
			return typeBase === 'message' || typeBase === 'whisper';
		});

		this.state = {
			activeIndex: comms.length ? 1 : 0,
		};

		this.setActiveIndex = this.setActiveIndex.bind(this);
	}

	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	setActiveIndex(activeIndex) {
		this.setState({
			activeIndex,
		});
	}

	render() {
		const { card, channel, types, actionItems } = this.props;

		const type = helpers.getType(card.type, types);

		const tail = _.get(card.links, ['has attached element'], []);

		// Never display a timeline segment for a user card. The `contact` card type
		// is meant for discussing a user and exposing the timeline on the user card
		// is more than likely going to cause people to accidentally expose internal
		// comments about a user to the user themselves. Disaster!
		const displayTimeline = card.type !== 'user';

		return (
			<CardLayout
				overflowY
				card={card}
				channel={channel}
				actionItems={actionItems}
			>
				<Divider width="100%" color={helpers.colorHash(card.type)} />

				<ContractTabs
					activeIndex={this.state.activeIndex}
					onActive={this.setActiveIndex}
				>
					<Tab title="Info">
						<Box
							p={3}
							flex={1}
							style={{
								maxWidth: Theme.breakpoints[2],
							}}
						>
							{!!this.props.children ? (
								this.props.children
							) : (
								<CardFields
									card={card}
									type={type}
									viewMode={UI_SCHEMA_MODE.fields}
								/>
							)}
						</Box>
					</Tab>

					{displayTimeline && (
						<Tab data-test="timeline-tab" title="Timeline">
							<Timeline.data.renderer card={card} allowWhispers tail={tail} />
						</Tab>
					)}

					{customQueryTabs(card, type)}
					<RelationshipsTab card={card} />
				</ContractTabs>
			</CardLayout>
		);
	}
}

const mapStateToProps = (state): StateProps => {
	return {
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'createLink',
				'addChannel',
				'getLinks',
				'queryAPI',
			]),
			dispatch,
		),
	};
};

export default connect<StateProps, DispatchProps, OwnProps>(
	mapStateToProps,
	mapDispatchToProps,
)(ContractRenderer);
