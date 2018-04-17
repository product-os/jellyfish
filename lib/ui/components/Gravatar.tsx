import * as Promise from 'bluebird';
import md5 = require('blueimp-md5');
import * as React from 'react';
import { Box, Img } from 'rendition';
import Icon from './Icon';

const GRAVATAR_URL = 'https://www.gravatar.com/avatar/';

const getGravatar = (email: string): Promise<string> => {
	return new Promise<string>((resolve, reject) => {
		// The query string makes gravatar return a 404 if the image is not found.
		// Ordinarily gravatar will return a default image if the avatar isn't found
		const avatarUrl = GRAVATAR_URL + md5(email.trim()) + '?d=404';
		const img = new Image();
		img.src = avatarUrl;
		img.onload = () => resolve(avatarUrl);
		img.onerror = () => reject(new Error('User does not have a gravatar'));
	});
};

interface GravatarState {
	avatarUrl: null | string;
}

interface GravatarProps {
	email?: string | null;
}

export default class Gravatar extends React.Component<GravatarProps, GravatarState> {
	constructor(props: GravatarProps) {
		super(props);

		this.state = {
			avatarUrl: null,
		};

		if (this.props.email) {
			this.load(this.props.email);
		}
	}

	public componentWillReceiveProps(nextProps: GravatarProps) {
		if (this.props.email !== nextProps.email) {
			if (nextProps.email) {
				this.load(nextProps.email);
			} else {
				this.setState({ avatarUrl: null });
			}
		}
	}

	public load(email: string) {
		getGravatar(email)
		.then((avatarUrl) => this.setState({ avatarUrl }))
		.catch(() => this.setState({ avatarUrl: null }));
	}

	public render() {
		if (this.state.avatarUrl) {
			return (
				<Img w={36} style={{borderRadius: '50%'}} src={this.state.avatarUrl} />
			);
		}

		return <Box><Icon name='user-circle' /></Box>;
	}
}
