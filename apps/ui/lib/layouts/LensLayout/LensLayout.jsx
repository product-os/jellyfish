/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import * as React from 'react'
import SlideInFlowPanel from '../../components/Flows/SlideInFlowPanel'
import LayoutTitle from '../../components/LayoutTitle'

const LensLayout = ({
	channelFlows,
	flowPanel,
	children,
	channel,
	title,
	card
}) => {
	const openFlows = _.values(channelFlows).filter((flow) => {
		return flow.isOpen
	})
	const firstFlow = _.head(openFlows)

	return (
		<React.Fragment>
			<LayoutTitle title={title} card={card} />

			{children}

			{Boolean(firstFlow) && Boolean(flowPanel) && (
				<SlideInFlowPanel
					slideInPanelProps={{
						height: 480
					}}
					channel={channel}
					flowPanel={flowPanel}
					flowId={firstFlow.type}
					card={firstFlow.card}
				/>
			)}
		</React.Fragment>
	)
}

export default LensLayout
