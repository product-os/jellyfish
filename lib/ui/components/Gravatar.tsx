import * as Bluebird from 'bluebird';
import md5 = require('blueimp-md5');
import * as React from 'react';
import { Box, Img } from 'rendition';
import Icon from './Icon';

const GRAVATAR_URL = 'https://www.gravatar.com/avatar/';

const getGravatar = (email: string): Bluebird<string> => {
	return new Bluebird<string>((resolve) => {
		// The query string makes gravatar return a 404 if the image is not found.
		// Ordinarily gravatar will return a default image if the avatar isn't found
		const avatarUrl = GRAVATAR_URL + md5(email.trim()) + '?d=404';
		const img = new Image();
		img.src = avatarUrl;
		img.onload = () => resolve(avatarUrl);
		img.onerror = () => resolve('');
	});
};

interface GravatarState {
	avatarUrl: string;
}

interface GravatarProps {
	email?: string | null;
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
		if (this.state.avatarUrl) {
			return (
				<Img w={36} style={{borderRadius: '50%'}} src={this.state.avatarUrl} />
			);
		}

		return <Box><Icon name="user-circle" /></Box>;
	}
}
