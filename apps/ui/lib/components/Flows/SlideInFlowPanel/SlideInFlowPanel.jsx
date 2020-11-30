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

const SlideInFlowPanel = ({
	sdk,
	card,
	channel,
	slideInPanelProps,
	flowState,
	flowPanel,
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
			{Boolean(flowState) && React.cloneElement(flowPanel, {
				sdk,
				card,
				channel,
				flowId,
				flowState,
				actions,
				onClose: close,
				...rest
			})}
		</SlideInPanel>
	)
}

export default SlideInFlowPanel
