/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	useHistory
} from 'react-router-dom'
import {
	Box,
	Flex
} from 'rendition'
import {
	CreateThread
} from '../components/CreateThread'
import {
	Heading
} from '../components/Heading'

export const NewThreadRoute = () => {
	const history = useHistory()

	const handleSuccess = React.useCallback(({
		thread
	}) => {
		history.replace(`/chat/${thread.id}`)
	}, [])

	return (
		<Flex
			flex={1}
			p={16}
			flexDirection="column"
			alignItems="center"
			data-test="create-new-conversation-page">
			<Box>
				<Heading
					primaryText="Welcome"
					secondaryText="Our team will reply to your questions & solve your problems in realtime as soon as possible."
				/>
			</Box>
			<Box alignSelf="stretch">
				<CreateThread onSuccess={handleSuccess} />
			</Box>
		</Flex>
	)
}
