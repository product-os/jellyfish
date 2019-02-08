/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird';
import md5 = require('blueimp-md5');
import * as _ from 'lodash';
import * as React from 'react';
import { Box, DefaultProps, Img } from 'rendition';
import Icon from './Icon';

const GRAVATAR_URL = 'https://www.gravatar.com/avatar/';

const getGravatar = _.memoize((email: string): Bluebird<string> => {
	return new Bluebird<string>((resolve) => {
		// The query string makes gravatar return a 404 if the image is not found.
		// Ordinarily gravatar will return a default image if the avatar isn't found
		const avatarUrl = GRAVATAR_URL + md5(email.trim()) + '?d=404';
		const img = new Image();
		img.src = avatarUrl;
		img.onload = () => resolve(avatarUrl);
		img.onerror = () => resolve('');
	});
});

interface GravatarState {
	avatarUrl: string;
}

interface GravatarProps extends DefaultProps {
	email?: string | null;
	small?: boolean;
}

export default class Gravatar extends React.Component<GravatarProps, GravatarState> {
	constructor(props: GravatarProps) {
		super(props);

		this.state = {
			avatarUrl: '',
		};

		if (this.props.email) {
			this.load(this.props.email);
		}
	}

	public componentWillReceiveProps(nextProps: GravatarProps): void {
		if (this.props.email !== nextProps.email) {
			if (nextProps.email) {
				this.load(nextProps.email);
			} else {
				this.setState({ avatarUrl: '' });
			}
		}
	}

	public load(email: string): void {
		getGravatar(email)
		.then((avatarUrl) => {
			return this.setState({ avatarUrl });
		});
	}

	public render(): React.ReactNode {
		const {
			small,
			email,
			...props
		} = this.props;

		const style: any = {
			borderRadius: 3,
			width: 36,
			height: 36,
		};

		if (small) {
			style.width = 24;
			style.height = 24;
		}

		if (this.state.avatarUrl) {
			return (
				<Box {...props}>
					<Img style={style} src={this.state.avatarUrl} />
				</Box>
			);
		}

		style.padding = 4;

		return (
			<Box {...props}>
				<Box style={style}>
					<Icon name="user-circle" />
				</Box>
			</Box>
		);
	}
}
