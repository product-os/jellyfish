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

const authenticate = async ({
	sdk
}) => {
	const {
		username,
		...params
	} = Object.fromEntries(new URLSearchParams(location.search).entries())

	const missingParams = [
		'clientSlug',
		'product',
		'inbox'
	].filter((name) => {
		return !params[name]
	})

	if (missingParams.length) {
		throw new Error(`Missing required parameters: ${missingParams.join(', ')}. ${JSON.stringify(params)}`)
	}

	if (!params.userSlug) {
		if (!username) {
			throw new Error('Username or user slug is required')
		}

		const result = await sdk.get(`/oauth/${params.clientSlug}/user_slug?username=${username}`)
		params.userSlug = result.data.userSlug
	}

	let user = null
	try {
		user = await sdk.auth.whoami()
	} catch (err) {
		if (err.name !== 'JellyfishInvalidSession') {
			throw err
		}
	}

	if (user) {
		if (!user.slug) {
			throw new Error('Could not retrieve user slug')
		}

		if (user.slug === params.userSlug) {
			return
		}
	}

	const {
		data: {
			url
		}
	} = await sdk.get(`/oauth/${params.clientSlug}/auth_url`)

	const modifiedUrl = new URL(url)
	modifiedUrl.searchParams.append('state', JSON.stringify(params))

	console.info('User is not authorized, redirecting to:', modifiedUrl.href)
	window.location.href = modifiedUrl.href
}

export const AuthenticationTask = ({
	children
}) => {
	const {
		sdk
	} = useSetup()
	const authenticationTask = useTask(authenticate)

	React.useEffect(() => {
		authenticationTask.exec({
			sdk
		})
	}, [ sdk ])

	return (
		<Task task={authenticationTask}>{children}</Task>
	)
}
