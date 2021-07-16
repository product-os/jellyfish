/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	useTask
} from '@balena/jellyfish-chat-widget/build/hooks'
import {
	Task
} from '@balena/jellyfish-chat-widget/build/components/task'
import {
	useSetup
} from '@balena/jellyfish-ui-components'

const authenticate = async ({
	sdk
}, userSlug, oauthUrl) => {
	const user = await sdk.auth.whoami()

	if (!user) {
		throw new Error('whoami is expected to return a user')
	}

	if (!user.slug) {
		throw new Error(`Could not get a slug of the user: "${userSlug}", check the user's permissions`)
	}

	if (user.slug !== userSlug) {
		window.location.href = oauthUrl
	}
}

export const AuthenticationTask = ({
	userSlug, oauthUrl, children, ...rest
}) => {
	const {
		sdk
	} = useSetup()
	const authenticationTask = useTask(authenticate)

	React.useEffect(() => {
		authenticationTask.exec({
			sdk
		}, userSlug, oauthUrl)
	}, [ sdk, userSlug, oauthUrl ])

	return (
		<Task task={authenticationTask} {...rest}>{children}</Task>
	)
}
