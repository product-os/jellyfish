/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import SlideInPanel from '../../../../../lib/ui-components/SlideInPanel'

export default function SlideInFlowPanel ({
	flowId,
	card,
	slideInPanelProps,
	flowState,
	actions,
	children,
	...rest
}) {
	if (_.isArray(children)) {
		throw new Error('SlideInFlowPanel only accepts a single child component')
	}
	const close = () => {
		actions.setFlow(flowId, card.id, {
			isOpen: false
		})
	}
	const isOpen = _.get(flowState, [ 'isOpen' ], false)

	return (
		<SlideInPanel
			height="50%"
			from="bottom"
			{...slideInPanelProps}
			isOpen={isOpen}
			onClose={close}
		>
			{Boolean(flowState) && React.cloneElement(children, {
				flowId,
				card,
				flowState,
				actions,
				onClose: close,
				...rest
			})}
		</SlideInPanel>
	)
}
