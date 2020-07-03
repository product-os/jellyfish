/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Box
} from 'rendition'
import Event from '../Event'

const PendingMessages = ({
	pendingMessages,
	...eventProps
}) => {
	return _.map(pendingMessages, (message) => {
		return (
			<Box key={message.slug}>
				<Event
					{...eventProps }
					card={message}
				/>
			</Box>
		)
	})
}

export default PendingMessages
