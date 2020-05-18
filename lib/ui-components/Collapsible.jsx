/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import cn from 'classnames'
import styled from 'styled-components'
import {
	Box,
	Flex,
	Txt
} from 'rendition'
import Icon from './shame/Icon'
import {
	px
} from './services/helpers'
import useDebounce from './hooks/use-debounce'

const DELAY = 500

const CollapsibleWrapper = styled(Box) ``

const CollapsibleHeader = styled(Flex) `
	cursor: pointer;
`

const CollapsibleContent = styled(Box) `
	max-height: ${(props) => { return px(props.maxHeight) }};
	transition: max-height ease-in-out ${DELAY}ms;
	overflow-y: auto;
	&.collapsed {
		max-height: 0;
		overflow-y: hidden;
	}
`

export default function Collapsible ({
	title,
	collapsible = true,
	defaultCollapsed = true,
	maxContentHeight = 1000,
	lazyLoadContent = false,
	children,
	...rest
}) {
	const [ isCollapsed, setIsCollapsed ] = React.useState(collapsible && defaultCollapsed)
	const isContentLoaded = useDebounce(!isCollapsed, DELAY, {
		lagOnRisingEdge: false
	})
	const toggleCollapsed = () => {
		setIsCollapsed(!isCollapsed)
	}
	return (
		<CollapsibleWrapper data-test="collapsible" {...rest}>
			{collapsible && (
				<CollapsibleHeader
					color="primary.main"
					alignItems="center"
					onClick={toggleCollapsed}
					data-test="collapsible__header"
				>
					<Box mr={2}><Icon name="angle-down" rotate={isCollapsed ? 0 : 180} /></Box>
					{typeof title === 'string' ? <Txt>{title}</Txt> : title}
				</CollapsibleHeader>
			)}
			<CollapsibleContent
				data-test="collapsible__content"
				maxHeight={maxContentHeight}
				className={cn({
					collapsed: isCollapsed
				})}
			>
				{(!lazyLoadContent || isContentLoaded) && children}
			</CollapsibleContent>
		</CollapsibleWrapper>
	)
}
