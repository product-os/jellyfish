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

const authenticate = async (sdk, userSlug, oauthUrl) => {
	return
	const user = await sdk.auth.whoami()

	if (!user || user.slug !== userSlug) {
		window.location.href = oauthUrl
	}
}

export const AuthenticationTask = ({
	userSlug, sdk, oauthUrl, children
}) => {
	const authenticationTask = useTask(authenticate)

	React.useEffect(() => {
		authenticationTask.exec(sdk, userSlug, oauthUrl)
	}, [ sdk, userSlug, oauthUrl ])

	return (
		<Task task={authenticationTask}>{children}</Task>
	)
}
