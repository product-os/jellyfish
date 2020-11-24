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
	FLOW_IDS
} from '../../components/Flows/flow-utils'
import {
	selectors
} from '../../core'
import CardLayout from './CardLayout'

const mapStateToProps = (state, props) => {
	const channelTarget = _.get(props, [ 'channel', 'data', 'target' ])
	const flows = _.values(selectors.getAllChannelFlows(channelTarget)(state))
	const flow = _.head(flows)

	return {
		user: selectors.getCurrentUser(state),
		types: selectors.getTypes(state),
		flowId: props.flowId || FLOW_IDS.GUIDED_HANDOVER,
		flowState: selectors.getFlow(props.flowId, channelTarget, _.get(flow, [ 'card', 'id' ]))(state)
	}
}

export default connect(mapStateToProps)(CardLayout)
