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
	sdk, errorReporter
}, userSlug, oauthUrl) => {
	const user = await sdk.auth.whoami()

	if (!user) {
		throw new Error('whoami is expected to return a user')
	}

	if (!user.slug) {
		throw new Error(`Could not get a slug of the user: "${userSlug}", check the user's permissions`)
	}

	if (user.slug !== userSlug) {
		errorReporter.reportInfo(
			`Logged in user "${user.slug}" does not match authorizing user "${userSlug}", reauthorizing`,
			user
		)

		window.location.href = oauthUrl
	}
}

export const AuthenticationTask = ({
	userSlug, oauthUrl, children
}) => {
	const {
		sdk, errorReporter
	} = useSetup()
	const authenticationTask = useTask(authenticate)

	React.useEffect(() => {
		authenticationTask.exec({
			sdk, errorReporter
		}, userSlug, oauthUrl)
	}, [ sdk, errorReporter, userSlug, oauthUrl ])

	return (
		<Task task={authenticationTask}>{children}</Task>
	)
}
