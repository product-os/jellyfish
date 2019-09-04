/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import {
	Box,
	Flex,
	Img,
	Theme
} from 'rendition'
import Icon from './Icon'

export default function Avatar (props) {
	const {
		small
	} = props
	const passthroughProps = _.omit(props, [ 'small', 'email' ])
	const style = {
		borderRadius: 3,
		width: 36,
		height: 36,
		textAlign: 'center'
	}

	if (small) {
		style.width = 24
		style.height = 24
	}

	if (props.url) {
		return (
			<Box {...props}>
				<Img style={style} src={props.url}/>
			</Box>
		)
	}

	style.padding = 4

	return (
		<Box {...passthroughProps}>
			<Flex
				p='4px'
				bg={Theme.colors.text.light}
				color='white'
				flexDirection='column'
				justifyContent='center'
				style={style}
			>
				<Icon name="user"/>
			</Flex>
		</Box>
	)
}
