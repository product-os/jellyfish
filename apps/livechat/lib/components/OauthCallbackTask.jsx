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
	sdk
}) => {
	const {
		code,
		state
	} = Object.fromEntries(new URLSearchParams(location.search).entries())

	const params = state ? JSON.parse(state) : { }

	if (!code) {
		throw new Error('Auth code parameter is missing')
	}

	if (!params.clientSlug) {
		throw new Error('Oauth client slug parameter is missing')
	}

	if (!params.userSlug) {
		throw new Error('User slug parameter is missing')
	}

	const result = await sdk.post(`/oauth/${params.clientSlug}`, {
		userSlug: params.userSlug,
		code
	})

	const token = result.data && result.data.access_token

	if (!token) {
		throw new Error('Could not fetch auth token')
	}

	localStorage.setItem('token', token)
	sdk.setAuthToken(token)

	return params
}

export const OauthCallbackTask = ({
	children
}) => {
	const {
		sdk
	} = useSetup()
	const exchangeCodeTask = useTask(exchangeCode)

	React.useEffect(() => {
		exchangeCodeTask.exec({
			sdk
		})
	}, [ sdk ])

	return (
		<Task task={exchangeCodeTask} px={2}>{children}</Task>
	)
}
