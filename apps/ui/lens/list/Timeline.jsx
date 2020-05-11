/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import {
	connect
} from 'react-redux'
import {
	compose,
	bindActionCreators
} from 'redux'
import {
	actionCreators,
	sdk,
	selectors
} from '../../core'
import * as environment from '../../environment'
import Timeline from '../../../../lib/ui-components/Timeline'
import {
	withResponsiveContext
} from '../../../../lib/ui-components/hooks/ResponsiveProvider'

const mapStateToProps = (state, ownProps) => {
	const card = ownProps.card

	return {
		wide: !ownProps.isMobile,
		selectCard: selectors.getCard,
		enableAutocomplete: !environment.isTest(),
		sdk,
		types: selectors.getTypes(state),
		user: selectors.getCurrentUser(state),
		usersTyping: selectors.getUsersTypingOnCard(state, card.id),
		timelineMessage: selectors.getTimelineMessage(state, card.id)
	}
}

const mapDispatchToProps = (dispatch) => {
	return bindActionCreators(
		_.pick(actionCreators, [
			'addNotification',
			'setTimelineMessage',
			'signalTyping',
			'getCard',
			'getActor'
		]),
		dispatch
	)
}

const lens = {
	slug: 'lens-timeline',
	type: 'lens',
	version: '1.0.0',
	name: 'Timeline lens',
	data: {
		format: 'list',
		icon: 'address-card',
		renderer: compose(
			withResponsiveContext,
			connect(mapStateToProps, mapDispatchToProps)
		)(Timeline),

		// This lens can display event-like objects
		filter: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					data: {
						type: 'object',
						properties: {
							timestamp: {
								type: 'string',
								format: 'date-time'
							},
							actor: {
								type: 'string',
								format: 'uuid'
							},
							payload: {
								type: 'object'
							}
						},
						required: [
							'timestamp',
							'actor'
						]
					}
				}
			}
		}
	}
}

export default lens
