import queryString from 'query-string';
import React from 'react';
import { Box } from 'rendition';
import { Markdown } from 'rendition/dist/extra/Markdown';
import { Icon } from '@balena/jellyfish-ui-components';

interface OauthState {
	authError: Error | null;
}

export default class Oauth extends React.Component<any, OauthState> {
	constructor(props) {
		super(props);

		this.state = {
			authError: null,
		};
	}

	componentDidMount() {
		const { actions, user, match, location, history } = this.props;
		const integration = match.params.integration;
		const { code } = queryString.parse(location.search);

		actions
			.authorizeIntegration(user, integration, code)
			.then(() => {
				history.push(`/${user.slug}`);
			})
			.catch((error: Error) => {
				console.error(error);
				this.setState({
					authError: error,
				});
			});
	}

	render() {
		const { authError } = this.state;

		if (authError) {
			return (
				<Box p={3}>
					An error occurred:
					{/* @ts-ignore bug in Rendition results in the css prop being (incorrectly) required */}
					<Markdown>{authError.message || authError.toString()}</Markdown>
				</Box>
			);
		}

		return (
			<Box p={3}>
				<Icon name="cog" spin /> Authorizing...
			</Box>
		);
	}
}
