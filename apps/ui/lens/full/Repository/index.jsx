/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import {
	connect
} from 'react-redux'
import {
	bindActionCreators
} from 'redux'
import {
	actionCreators,
	selectors
} from '../../../core'
import {
	getContextualThreadsQuery
} from '../../'
import Repository from './Repository'

const mapStateToProps = (state, ownProps) => {
	const query = getContextualThreadsQuery(ownProps.card.id)

	return {
		types: selectors.getTypes(state),
		messages: selectors.getViewData(state, query, {
			viewId: ownProps.card.id
		})
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'addChannel',
				'addNotification',
				'clearViewData',
				'createLink',
				'getLinks',
				'loadViewResults',
				'queryAPI',
				'streamView'
			]), dispatch)
	}
}

const lens = {
	slug: 'lens-full-repository',
	type: 'lens',
	version: '1.0.0',
	name: 'Repository lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect(mapStateToProps, mapDispatchToProps)(Repository),
		filter: {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: 'repository@1.0.0'
				}
			}
		}
	}
}

export default lens
