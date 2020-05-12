/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import {
	connect
} from 'react-redux'
import {
	Flex,
	Heading,
	Txt
} from 'rendition'
import {
	CloseButton
} from '../../../../lib/ui-components/shame/CloseButton'
import Column from '../../../../lib/ui-components/shame/Column'
import CardActions from '../../components/CardActions'
import SlideInFlowPanel from '../../components/Flows/SlideInFlowPanel'
import {
	FLOW_IDS
} from '../../components/Flows/flow-utils'
import {
	HandoverFlowPanel
} from '../../components/Flows/HandoverFlowPanel'
import {
	LinksProvider
} from '../../../../lib/ui-components/LinksProvider'
import {
	selectors,
	sdk
} from '../../core'

const CardLayout = (props) => {
	const {
		actionItems,
		card,
		channel,
		children,
		noActions,
		overflowY,
		title,
		types,
		user
	} = props

	const typeBase = card.type && card.type.split('@')[0]

	const typeName = _.get(_.find(types, {
		slug: typeBase
	}), [ 'name' ], null)

	return (
		<LinksProvider sdk={sdk} cards={typeBase ? [ card ] : []} link="is owned by">
			<Column
				className={`column--${typeBase || 'unknown'} column--slug-${card.slug || 'unkown'}`}
				overflowY={overflowY}
				data-test={props['data-test']}
			>
				<Flex
					p={3} pb={0}
					flexDirection={[ 'column-reverse', 'column-reverse', 'row' ]}
					justifyContent="space-between"
					alignItems="center">
					<Flex flex={1} alignSelf={[ 'flex-start', 'flex-start', 'inherit' ]} my={[ 2, 2, 0 ]}>
						{title}

						{!title && (
							<div>
								<Heading.h4>
									{card.name || card.slug || card.type}
								</Heading.h4>

								{Boolean(typeName) && (
									<Txt color="text.light" fontSize="0">{typeName}</Txt>
								)}
							</div>
						)}
					</Flex>
					<Flex alignSelf={[ 'flex-end', 'flex-end', 'flex-start' ]}>
						{!noActions && (
							<CardActions card={card}>
								{actionItems}
							</CardActions>
						)}
						<CloseButton
							flex={0}
							onClick={props.onClose}
							channel={channel}
						/>
					</Flex>
				</Flex>

				{children}
				<SlideInFlowPanel
					slideInPanelProps={{
						height: 480
					}}
					card={card}
					flowId={FLOW_IDS.GUIDED_HANDOVER}
				>
					<HandoverFlowPanel user={user} />
				</SlideInFlowPanel>
			</Column>
		</LinksProvider>
	)
}

const mapStateToProps = (state) => {
	return {
		user: selectors.getCurrentUser(state),
		types: selectors.getTypes(state)
	}
}

export default connect(mapStateToProps)(CardLayout)
