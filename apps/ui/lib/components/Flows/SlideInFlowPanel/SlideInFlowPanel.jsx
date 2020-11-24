/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	SlideInPanel
} from '@balena/jellyfish-ui-components'
import HandoverFlowPanel from '../HandoverFlowPanel'
import TeardownFlowPanel from '../TeardownFlowPanel'
import {
	FLOW_IDS
} from '../flow-utils'

const SlideInFlowPanel = ({
	sdk,
	card,
	channel,
	slideInPanelProps,
	flowState,
	actions,
	children,
	...rest
}) => {
	const flowId = _.get(flowState, [ 'type' ])
	const isOpen = _.get(flowState, [ 'isOpen' ], false)

	if (_.isArray(children)) {
		throw new Error('SlideInFlowPanel only accepts a single child component')
	}
	const close = () => {
		actions.setFlow(channel.data.target, card.id, {
			isOpen: false
		})
	}

	return (
		<SlideInPanel
			height="50%"
			from="bottom"
			{...slideInPanelProps}
			isOpen={isOpen}
			onClose={close}
		>
			{flowId === FLOW_IDS.GUIDED_HANDOVER && Boolean(flowState) && (
				<HandoverFlowPanel
					sdk={sdk}
					card={card}
					channel={channel}
					flowId={flowId}
					onClose={close}
					flowState={flowState}
					actions={actions}
					{...rest} />
			)}

			{flowId === FLOW_IDS.GUIDED_TEARDOWN && Boolean(flowState) && (
				<TeardownFlowPanel
					sdk={sdk}
					card={card}
					channel={channel}
					flowId={flowId}
					onClose={close}
					flowState={flowState}
					actions={actions}
					{...rest} />
			)}
		</SlideInPanel>
	)
}

export default SlideInFlowPanel
