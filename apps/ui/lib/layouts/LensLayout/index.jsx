/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	connect
} from 'react-redux'
import {
	sdk,
	selectors
} from '../../core'
import LensLayout from './LensLayout'

const mapStateToProps = (state, props) => {
	return {
		channelFlows: selectors.getAllChannelFlows(props.channel.data.target)(state),
		sdk
	}
}

export default connect(mapStateToProps)(LensLayout)
