/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Button
} from 'rendition'
import {
	useRouter
} from '../hooks'

/*
 * It would be better to just use <Button as={Link}></Button>,
 * but then can't make it appear as a button.
 */
export const ButtonLink = ({
	onClick, to, ...rest
}) => {
	const router = useRouter()

	const handleClick = React.useCallback(() => {
		router.history.push(to)
	}, [ router, to ])

	return (
		<Button onClick={handleClick} {...rest} />
	)
}
