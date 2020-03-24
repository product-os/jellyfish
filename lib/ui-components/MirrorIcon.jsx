/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import styled from 'styled-components'
import {
	Flex,
	Img
} from 'rendition'
import Icon from './shame/Icon'

const Mirrors = [
	{
		name: 'Discourse',
		matcher: new RegExp(/forums.balena.io/),
		icon: <Icon name="discourse" brands />
	},
	{
		name: 'GitHub',
		matcher: new RegExp(/github.com/),
		icon: <Icon name="github" brands />
	},
	{
		name: 'Front',
		matcher: new RegExp(/frontapp.com/),
		icon: <Img
			width="100%"
			style={{
				height: '100%'
			}}
			src="/icons/front-app.svg"
		/>
	}
]

const getMirrorHandler = (mirrors) => {
	if (mirrors && mirrors.length) {
		// Assume we just use the first item
		const mirror = mirrors[0]
		for (const mirrorHandler of Mirrors) {
			if (mirrorHandler.matcher.test(mirror)) {
				return mirrorHandler
			}
		}
	}
	return null
}

const ThreadMirrorIconWrapper = styled(Flex) `
	height: 14px;
	width: 14px;
`

export const ThreadMirrorIcon = ({
	mirrors,
	...rest
}) => {
	const handler = getMirrorHandler(mirrors)
	if (!handler) {
		return null
	}
	return (
		<ThreadMirrorIconWrapper
			{...rest}
			data-test="thread-mirror-icon"
			alignItems="center"
			justifyContent="center"
			tooltip={`Synced with ${handler.name}`}
		>
			{handler.icon}
		</ThreadMirrorIconWrapper>
	)
}

const MirrorIconWrapper = styled(Flex) `
	margin: 0 0 2px 6px;
	font-size: 80%;
	opacity: 0.3;
	transition: opacity linear 0.5s;
	color: ${(props) => { return props.theme.colors.primary.light }};
	&.synced {
		opacity: 1;
	}
`

export const MirrorIcon = ({
	threadIsMirrored, mirrors
}) => {
	if (!threadIsMirrored) {
		return null
	}
	const synced = !_.isEmpty(mirrors)
	const handler = getMirrorHandler(mirrors)
	const displayName = handler ? handler.name : ''
	const tooltip = `${synced ? 'Synced' : 'Not yet synced'}${displayName ? ` with ${displayName}` : ''}`
	return (
		<MirrorIconWrapper
			data-test="mirror-icon"
			className={synced ? 'synced' : 'unsynced'}
			tooltip={tooltip}
		>
			<Icon name="check" />
		</MirrorIconWrapper>
	)
}
