/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import * as React from 'react'
import SlideInFlowPanel from '../../components/Flows/SlideInFlowPanel'

const LensLayout = ({
	sdk, channelFlows, children, channel, flowId, ...rest
}) => {
	const openFlows = _.values(channelFlows).filter((flow) => {
		return flow.isOpen
	})
	const firstFlow = _.head(openFlows)

	return (
		<React.Fragment>
			{children}

			{firstFlow && (
				<SlideInFlowPanel
					slideInPanelProps={{
						height: 480
					}}
					channel={channel}
					flowId={firstFlow.type}
					card={firstFlow.card}
				/>
			)}
		</React.Fragment>
	)
}

export default LensLayout
