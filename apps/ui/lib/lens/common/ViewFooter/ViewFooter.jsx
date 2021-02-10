/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Flex,
	Button
} from 'rendition'
import styled from 'styled-components'
import {
	Icon
} from '@balena/jellyfish-ui-components'

const Footer = styled(Flex) `
	border-top: 1px solid #eee;
`

export const ViewFooter = ({
	channel,
	type,
	actions,
	...rest
}) => {
	const [ isBusy, setIsBusy ] = React.useState(false)

	const synchronous = React.useMemo(() => {
		return type.slug === 'thread'
	}, [ type.slug ])

	const onAddCard = React.useCallback(async () => {
		setIsBusy(true)
		await actions.addCard(channel, type, {
			synchronous
		})
		setIsBusy(false)
	}, [ actions.addCard, synchronous, channel, type, synchronous ])
	return (
		<Footer
			flex={0}
			p={3}
			{...rest}
		>
			<Button
				disabled={isBusy}
				success
				className={`btn--add-${type.slug}`}
				onClick={onAddCard}
			>
				{ isBusy ? <Icon spin name="cog"/> : `Add ${type.name || type.slug}`	}
			</Button>
		</Footer>
	)
}
