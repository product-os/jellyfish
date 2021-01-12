/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	connect
} from 'react-redux'
import _ from 'lodash'
import {
	bindActionCreators
} from 'redux'
import {
	actionCreators
}	from '../../core'
import {
	LinkModal as LinkModalInner
} from './LinkModal'

export const LinkModal = connect(
	null,
	(dispatch) => {
		return {
			actions: bindActionCreators(
				_.pick(actionCreators, [
					'createLink'
				]),
				dispatch
			)
		}
	}
)(LinkModalInner)
