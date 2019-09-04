/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	CreateThread
} from '../components/CreateThread'
import {
	useRouter
} from '../hooks'

export const NewThreadRoute = () => {
	const router = useRouter()

	const handleSuccess = React.useCallback(({
		thread
	}) => {
		router.history.replace(`/chat/${thread.id}`)
	}, [])

	return (
		<CreateThread onSuccess={handleSuccess} />
	)
}
