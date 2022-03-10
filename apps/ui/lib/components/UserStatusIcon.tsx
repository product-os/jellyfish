import React from 'react';
import styled from 'styled-components';
import _ from 'lodash';
import { Flex, FlexProps } from 'rendition';
import type { UserContract } from '@balena/jellyfish-types/build/core';
import Icon from './Icon';

const statusSize = (props: { small?: boolean }) => {
	const size = props.small ? 12 : 18;
	const fontSize = props.small ? 6 : 9;
	return `
		width: ${size}px;
		height: ${size}px;
		font-size: ${fontSize}px;
	`;
};

// Note: We use class-names here instead of child System Components so
// that the transition animation works correctly
const StatusWrapper = styled(Flex)`
	${statusSize}
	transition: all ease-in-out 500ms;
	padding: 2px;
	border-radius: 50%;
	background: transparent;
	&.user-status-icon--available {
		transform: scale(0);
	}
	&.user-status-icon--donotdisturb {
		background: ${(props) => {
			return props.theme.colors.tertiary.dark;
		}};
		color: #fff;
	}
	&.user-status-icon--annualleave {
		background: ${(props) => {
			return props.theme.colors.success.dark;
		}};
		color: #fff;
	}
	&.user-status-icon--inameeting {
		background: ${(props) => {
			return props.theme.colors.info.main;
		}};
		color: #fff;
	}
`;

const StatusIconNames = {
	Available: null,
	DoNotDisturb: 'bell-slash',
	AnnualLeave: 'umbrella-beach',
	Meeting: 'calendar-times',
};

interface UserStatusIconProps extends FlexProps {
	userStatus: UserContract['data']['status'];
	className: string;
	small?: boolean;
}

export default function UserStatusIcon({
	userStatus,
	className,
	...props
}: React.PropsWithChildren<UserStatusIconProps>) {
	if (!userStatus || _.isEmpty(userStatus) || !userStatus.value) {
		return null;
	}
	const statusIconName = StatusIconNames[userStatus.value];
	if (!StatusWrapper) {
		return null;
	}
	return (
		<StatusWrapper
			className={`${className} user-status-icon--${userStatus.value.toLowerCase()}`}
			{...props}
			alignItems="center"
			justifyContent="center"
			tooltip={userStatus.title}
		>
			{statusIconName && <Icon name={statusIconName} />}
		</StatusWrapper>
	);
}
