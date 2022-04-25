import _ from 'lodash';
import { connect } from 'react-redux';
import { compose, bindActionCreators } from 'redux';
import { withDefaultGetActorHref } from '../../components';
import { withResponsiveContext } from '../../hooks/use-responsive-context';
import { actionCreators, sdk, selectors } from '../../core';
import * as environment from '../../environment';
import { createLazyComponent } from '../../components/SafeLazy';

export const Timeline = createLazyComponent(
	() =>
		import(/* webpackChunkName: "lens-timeline" */ '../../components/Timeline'),
);

const mapStateToProps = (state, ownProps) => {
	const card = ownProps.card;
	return {
		wide: !ownProps.isMobile,
		enableAutocomplete: !environment.isTest(),
		sdk,
		types: selectors.getTypes(state),
		groups: selectors.getGroups(state),
		user: selectors.getCurrentUser(state),
		usersTyping: selectors.getUsersTypingOnCard(state, card.id),
		timelineMessage: selectors.getTimelineMessage(state, card.id),
		timelinePendingMessages: selectors.getTimelinePendingMessages(
			state,
			card.id,
		),
	};
};

const mapDispatchToProps = (dispatch, ownProps) => {
	const card = ownProps.card;
	return bindActionCreators(
		{
			..._.pick(actionCreators, [
				'setTimelineMessage',
				'setTimelinePendingMessages',
				'signalTyping',
				'getActor',
			]),
			next: () => actionCreators.loadMoreChannelData(card.id),
		},
		dispatch,
	);
};

const lens = {
	slug: 'lens-timeline',
	type: 'lens',
	version: '1.0.0',
	name: 'Timeline lens',
	data: {
		label: 'Timeline',
		format: 'list',
		icon: 'list',
		renderer: compose<any>(
			withResponsiveContext,
			connect(mapStateToProps, mapDispatchToProps),
			withDefaultGetActorHref(),
		)(Timeline),

		// This lens can display event-like objects
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						not: {
							const: 'rating@1.0.0',
						},
					},
					data: {
						type: 'object',
						properties: {
							timestamp: {
								type: 'string',
								format: 'date-time',
							},
							actor: {
								type: 'string',
								format: 'uuid',
							},
							payload: {
								type: 'object',
							},
						},
						required: ['timestamp', 'actor', 'payload'],
					},
				},
				required: ['type', 'data'],
			},
		},
	},
};

export default lens;
