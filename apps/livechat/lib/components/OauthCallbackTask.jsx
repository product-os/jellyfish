/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	useTask
} from '@balena/jellyfish-chat-widget/lib/hooks'
import {
	Task
} from '@balena/jellyfish-chat-widget/lib/components/Task'
import {
	useSetup
} from '@balena/jellyfish-ui-components/lib/SetupProvider'

const exchangeCode = async ({
	sdk, errorReporter
}, userSlug, code, oauthProvider) => {
	if (!code) {
		throw new Error('Auth code missing')
	}

	if (!oauthProvider) {
		throw new Error('Auth provider missing')
	}

	const result = await sdk.post(`/oauth/${oauthProvider}`, {
		slug: userSlug,
		code
	})

	const token = result.data && result.data.access_token

	if (!token) {
		throw new Error('Could not fetch auth token')
	}

	errorReporter.reportInfo(
		`Oauth with ${oauthProvider} was successful for the user "${userSlug}", setting token`
	)

	localStorage.setItem('token', token)
	sdk.setAuthToken(token)
}

export const OauthCallbackTask = ({
	userSlug, location, oauthProvider, children
}) => {
	const {
		sdk, errorReporter
	} = useSetup()
	const exchangeCodeTask = useTask(exchangeCode)

	React.useEffect(() => {
		const code = new URLSearchParams(location.search).get('code')
		exchangeCodeTask.exec({
			sdk, errorReporter
		}, userSlug, code, oauthProvider)
	}, [ sdk, errorReporter, location.search, userSlug, oauthProvider ])

	return (
		<Task task={exchangeCodeTask} px={2}>
			{children}
		</Task>
	)
}
