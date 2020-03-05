/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import styled from 'styled-components'
import _ from 'lodash'
import {
	Flex
} from 'rendition'
import Icon from './shame/Icon'

const statusSize = (props) => {
	const size = props.small ? 12 : 18
	const fontSize = props.small ? 6 : 9
	return `
		width: ${size}px;
		height: ${size}px;
		font-size: ${fontSize}px;
	`
}

// Note: We use class-names here instead of child System Components so
// that the transition animation works correctly
const StatusWrapper = styled(Flex) `
	${statusSize}
	transition: all ease-in-out 500ms;
	padding: 2px;
	border-radius: 50%;
	background: transparent;
	&.user-status-icon--available {
		transform: scale(0);
	}
	&.user-status-icon--donotdisturb {
		background: ${(props) => { return props.theme.colors.tertiary.dark }};
		color: #fff;
	}
	&.user-status-icon--annualleave {
		background: ${(props) => { return props.theme.colors.success.dark }};
		color: #FFF;
	}
	&.user-status-icon--inameeting {
		background: ${(props) => { return props.theme.colors.info.main }};
		color: #FFF;
	}
`

const StatusIconNames = {
	Available: null,
	DoNotDisturb: 'bell-slash',
	AnnualLeave: 'umbrella-beach',
	Meeting: 'calendar-times'
}

export default function UserStatusIcon ({
	userStatus, className, ...props
}) {
	if (!userStatus || _.isEmpty(userStatus)) {
		return null
	}
	const statusIconName = StatusIconNames[userStatus.value]
	if (!StatusWrapper) {
		return null
	}
	return (
		<StatusWrapper
			className={`${className} user-status-icon--${userStatus.value.toLowerCase()}`}
			{...props}
			alignItems="center"
			justifyContent="center"
			tooltip={{
				text: userStatus.title, placement: 'right'
			}}
		>
			{ statusIconName && <Icon name={statusIconName} /> }
		</StatusWrapper>
	)
}
