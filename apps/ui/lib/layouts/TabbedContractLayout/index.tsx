import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { Box, Divider, Tab, Tabs, Theme } from 'rendition';
import styled from 'styled-components';
import * as helpers from '../../services/helpers';
import CardFields from '../../components/CardFields';
import CardLayout from '../../layouts/CardLayout';
import Timeline from '../../lens/list/Timeline';
import { UI_SCHEMA_MODE } from '../../lens/schema-util';
import { RelationshipsTab, customQueryTabs } from '../../lens/common';
import { LensRendererProps } from '../../types';
import { TypeContract } from '@balena/jellyfish-types/build/core';
import { selectors } from '../../core';

export const SingleCardTabs = styled(Tabs)`
	flex: 1;
	> [role='tablist'] {
		height: 100%;
	}
	> [role='tabpanel'] {
		flex: 1;
		overflow-y: auto;
	}
`;

export type OwnProps = Pick<LensRendererProps, 'card' | 'channel'> & {
	children?: React.ReactNode;
	tabs?: React.ReactNode[];
	actionItems?: React.ReactNode;
	primaryTabTitle?: string;
};

export interface StateProps {
	types: TypeContract[];
}

type Props = StateProps & OwnProps;

interface State {
	activeIndex: number;
}

class TabbedContractLayout extends React.Component<Props, State> {
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
		const {
			card,
			channel,
			types,
			actionItems,
			children,
			tabs,
			primaryTabTitle,
		} = this.props;

		const type = helpers.getType(card.type, types);

		const tail = _.get(card.links, ['has attached element'], []);

		// Never display a timeline segment for a user card. The `contact` card type
		// is meant for discussing a user and exposing the timeline on the user card
		// is more than likely going to cause people to accidentally expose internal
		// comments about a user to the user themselves. Disaster!
		const displayTimeline = card.type !== 'user';

		return (
			<CardLayout
				data-test={this.props['data-test']}
				overflowY
				card={card}
				channel={channel}
				actionItems={actionItems}
			>
				<Divider width="100%" color={helpers.colorHash(card.type)} />

				<SingleCardTabs
					activeIndex={this.state.activeIndex}
					onActive={this.setActiveIndex}
				>
					<Tab title={primaryTabTitle || 'Info'}>
						<Box
							p={3}
							flex={1}
							style={{
								maxWidth: Theme.breakpoints[2],
							}}
						>
							{children}
							{!children && (
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

					{tabs}

					{customQueryTabs(card, type, channel)}
					<RelationshipsTab card={card} channel={channel} />
				</SingleCardTabs>
			</CardLayout>
		);
	}
}

const mapStateToProps = (state): StateProps => {
	return {
		types: selectors.getTypes(state),
	};
};

export default connect<StateProps, {}, OwnProps>(mapStateToProps)(
	TabbedContractLayout,
);
