/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	connect
} from 'react-redux'
import _ from 'lodash'
import * as redux from 'redux'
import {
	withSetup
} from '@balena/jellyfish-ui-components'
import {
	actionCreators,
	selectors
} from '../../../core'
import MyUser from './MyUser'

const SLUG = 'lens-my-user'

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state)
	}
}

const mapDispatchToProps = (dispatch) => {
	return {
		actions: redux.bindActionCreators(_.pick(actionCreators, [
			'getIntegrationAuthUrl',
			'updateUser',
			'setPassword'
		]), dispatch)
	}
}

export default {
	slug: SLUG,
	type: 'lens',
	version: '1.0.0',
	name: 'Support thread lens',
	data: {
		icon: 'address-card',
		format: 'full',
		renderer: redux.compose(
			withSetup,
			connect(mapStateToProps, mapDispatchToProps)
		)(MyUser),
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'user@1.0.0'
				},
				slug: {
					type: 'string',
					const: {
						$eval: 'user.slug'
					}
				}
			}
		}
	}
}
