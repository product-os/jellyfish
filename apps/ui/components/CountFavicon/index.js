/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	connect
} from 'react-redux'
import {
	selectors
} from '../../core'
import CountFavicon from './CountFavicon'

const getMentionsCount = (mentions) => {
	if (!mentions || !mentions.length) {
		return null
	}
	if (mentions.length > 99) {
		return '99+'
	}
	return mentions.length.toString()
}

const mapStateToProps = (state) => {
	const mentions = selectors.getViewData(state, 'view-my-inbox')
	return {
		label: getMentionsCount(mentions)
	}
}

export default connect(mapStateToProps)(CountFavicon)
