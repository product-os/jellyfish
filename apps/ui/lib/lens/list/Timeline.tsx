import _ from 'lodash';
import { connect } from 'react-redux';
import { compose, bindActionCreators } from 'redux';
import { withDefaultGetActorHref, withSetup } from '../../components';
import { withResponsiveContext } from '../../hooks/use-responsive-context';
import { actionCreators, selectors } from '../../store';
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
		types: selectors.getTypes()(state),
		groups: selectors.getGroups()(state),
		user: selectors.getCurrentUser()(state),
		usersTyping: selectors.getUsersTypingOnCard(card.id)(state),
		timelineMessage: selectors.getTimelineMessage(card.id)(state),
		timelinePendingMessages: selectors.getTimelinePendingMessages(card.id)(
			state,
		),
	};
};

const mapDispatchToProps = (dispatch, ownProps) => {
	return bindActionCreators(actionCreators, dispatch);
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
			withSetup,
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
