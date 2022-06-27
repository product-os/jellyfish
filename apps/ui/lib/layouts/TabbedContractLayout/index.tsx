import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { Box, Divider, Tab, Tabs, Theme } from 'rendition';
import styled from 'styled-components';
import { bindActionCreators } from '../../bindactioncreators';
import * as helpers from '../../services/helpers';
import CardFields from '../../components/CardFields';
import CardLayout from '../../layouts/CardLayout';
import Timeline from '../../lens/list/Timeline';
import { UI_SCHEMA_MODE } from '../../lens/schema-util';
import { RelationshipsTab, customQueryTabs } from '../../lens/common';
import type { BoundActionCreators, LensRendererProps } from '../../types';
import type { TypeContract } from '@balena/jellyfish-types/build/core';
import { actionCreators, selectors } from '../../store';

const SLUG = 'tabbed-contract-layout';

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
	title?: JSX.Element;
	maxWidth?: number | string;
};

export interface StateProps {
	types: TypeContract[];
	lensState: {
		activeIndex?: number;
	};
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

type Props = StateProps & OwnProps & DispatchProps;

interface State {
	activeIndex: number;
}

class TabbedContractLayout extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);

		this.state = {
			activeIndex: props.lensState.activeIndex || 0,
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
		// The intention here is to persist the active index per type
		// It's a bit hacky, because technically this component is not a Lens
		// TODO: Find a cleaner way of persisting tab selection between types
		const target = this.props.card.type;
		this.props.actions.setLensState(SLUG, target, {
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
			title,
			primaryTabTitle,
			maxWidth,
		} = this.props;

		const type = helpers.getType(card.type, types);

		// Never display a timeline segment for a user card. The `contact` card type
		// is meant for discussing a user and exposing the timeline on the user card
		// is more than likely going to cause people to accidentally expose internal
		// comments about a user to the user themselves. Disaster!
		const displayTimeline = card.type !== 'user';

		const allowWhispers =
			card.type.split('@')[0] === 'support-thread' ||
			card.type.split('@')[0] === 'sales-thread';

		return (
			<CardLayout
				data-test={this.props['data-test']}
				overflowY
				title={title}
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
								maxWidth: maxWidth || Theme.breakpoints[2],
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
							<Timeline.data.renderer
								card={card}
								allowWhispers={allowWhispers}
							/>
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

const mapStateToProps = (state, ownProps): StateProps => {
	const target = _.get(ownProps, ['card', 'type']);
	return {
		types: selectors.getTypes()(state),
		lensState: selectors.getLensState(SLUG, target)(state),
	};
};

const mapDispatchToProps = (dispatch): DispatchProps => {
	return {
		actions: bindActionCreators(actionCreators, dispatch),
	};
};

export default connect<StateProps, DispatchProps, OwnProps>(
	mapStateToProps,
	mapDispatchToProps,
)(TabbedContractLayout);
