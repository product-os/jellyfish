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
	useHistory
} from 'react-router-dom'

/*
 * It would be better to just use <Button as={Link}></Button>,
 * but then can't make it appear as a button.
 */
export const ButtonLink = ({
	onClick, to, ...rest
}) => {
	const history = useHistory()

	const handleClick = React.useCallback(() => {
		history.push(to)
	}, [ history, to ])

	return (
		<Button onClick={handleClick} {...rest} />
	)
}
