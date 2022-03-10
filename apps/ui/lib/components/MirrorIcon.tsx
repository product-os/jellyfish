import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';
import { Flex, FlexProps, Img } from 'rendition';
import Icon from './shame/Icon';
// @ts-ignore
import frontAppSvg from '../icons/front-app.svg';

const Mirrors = [
	{
		name: 'Discourse',
		matcher: /forums.balena.io/,
		icon: <Icon name="discourse" brands />,
	},
	{
		name: 'GitHub',
		matcher: /github.com/,
		icon: <Icon name="github" brands />,
	},
	{
		name: 'Front',
		matcher: /frontapp.com/,
		icon: (
			<Img
				// @ts-ignore
				width="100%"
				style={{
					height: '100%',
				}}
				src={frontAppSvg}
			/>
		),
	},
];

const getMirrorHandler = (mirrors: Mirrors) => {
	if (mirrors && mirrors.length) {
		// Assume we just use the first item
		const mirror = mirrors[0];
		for (const mirrorHandler of Mirrors) {
			if (mirrorHandler.matcher.test(mirror)) {
				return mirrorHandler;
			}
		}
	}
	return null;
};

const ThreadMirrorIconWrapper = styled(Flex)`
	height: 14px;
	width: 14px;
`;

type Mirrors = string[];

interface ThreadMirrorIconProps extends FlexProps {
	mirrors: Mirrors;
}

export const ThreadMirrorIcon: React.FunctionComponent<
	ThreadMirrorIconProps
> = ({ mirrors, ...rest }) => {
	const handler = getMirrorHandler(mirrors);
	if (!handler) {
		return null;
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
	);
};

const MirrorIconWrapper = styled(Flex)`
	margin: 0 0 2px 6px;
	font-size: 80%;
	opacity: 0.3;
	transition: opacity linear 0.5s;
	color: ${(props) => {
		return props.theme.colors.primary.light;
	}};
	&.synced {
		opacity: 1;
	}
`;

export const MirrorIcon: React.FunctionComponent<ThreadMirrorIconProps> = ({
	mirrors,
}) => {
	const synced = !_.isEmpty(mirrors);
	const handler = getMirrorHandler(mirrors);
	const displayName = handler ? handler.name : '';
	const tooltip = `${synced ? 'Synced' : 'Not yet synced'}${
		displayName ? ` with ${displayName}` : ''
	}`;
	return (
		<MirrorIconWrapper
			data-test="mirror-icon"
			className={synced ? 'synced' : 'unsynced'}
			tooltip={tooltip}
		>
			<Icon name="check" />
		</MirrorIconWrapper>
	);
};
