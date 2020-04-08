/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	useTask
} from '../../../lib/chat-widget/hooks'
import {
	Task
} from '../../../lib/chat-widget/components/Task'

const exchangeCode = async (sdk, userSlug, code, oauthProvider) => {
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

	localStorage.setItem('token', token)
	sdk.setAuthToken(token)
}

export const OauthCallbackTask = ({
	userSlug, location, sdk, oauthProvider, children
}) => {
	const exchangeCodeTask = useTask(exchangeCode)

	React.useEffect(() => {
		const code = new URLSearchParams(location.search).get('code')
		exchangeCodeTask.exec(sdk, userSlug, code, oauthProvider)
	}, [ sdk, location.search, userSlug, oauthProvider ])

	return (
		<Task task={exchangeCodeTask} px={2}>
			{children}
		</Task>
	)
}
