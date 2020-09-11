/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import Bluebird from 'bluebird'
import React, {
	useState,
	useCallback
} from 'react'
import {
	Button
} from 'rendition'
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'

const markMessagesAsRead = (sdk, inboxData, user, groupNames) => {
	return Bluebird.map(inboxData, (card) => {
		return sdk.card.markAsRead(user.slug, card, groupNames)
	}, {
		concurrency: 10
	})
}

const MarkAsReadButton = ({
	canMarkAsRead,
	inboxData,
	user,
	groupNames,
	sdk
}) => {
	if (!canMarkAsRead) {
		return null
	}
	const [ isMarkingAllAsRead, setIsMarkingAllAsRead ] = useState(false)

	const markAllAsRead = useCallback(async () => {
		setIsMarkingAllAsRead(true)
		if (inboxData) {
			await markMessagesAsRead(sdk, inboxData, user, groupNames)
		}
		setIsMarkingAllAsRead(false)
	}, [ inboxData, sdk, user, groupNames ])

	return (
		<Button
			ml={3}
			disabled={isMarkingAllAsRead}
			onClick={markAllAsRead}
			data-test="inbox__mark-all-as-read"
			icon={isMarkingAllAsRead ? <Icon name="cog" spin /> : <Icon name="check-circle" />}
		>
			{`Mark ${inboxData ? inboxData.length : 'all'} as read`}
		</Button>
	)
}

export default MarkAsReadButton
