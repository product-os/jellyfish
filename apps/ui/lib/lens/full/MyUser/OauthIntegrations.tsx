import { Icon, useSetup } from '@balena/jellyfish-ui-components';
import * as React from 'react';
import { Button, Divider, Flex, Link, Txt } from 'rendition';
import get from 'lodash/get';

const OauthIntegration = ({ integration, user }) => {
	const [fetchingIntegrationUrl, setFetchingIntegrationUrl] =
		React.useState(false);
	const { sdk } = useSetup()!;

	const startAuthorize = React.useCallback(async () => {
		setFetchingIntegrationUrl(true);

		window.location.href = await sdk.integrations.getAuthorizationUrl(
			user,
			integration.name,
		);
	}, [user]);

	return (
		<>
			<Divider color="#eee" />

			<Flex justifyContent="space-between" alignItems="center">
				<Link href={integration.website} blank>
					<Txt bold mr={2}>
						{integration.title}
					</Txt>
				</Link>

				{get(user, ['data', 'oauth', integration.name]) ? (
					<Txt>Authorized</Txt>
				) : (
					<Button
						data-test={`integration-connection--${integration.name}`}
						onClick={startAuthorize}
					>
						{fetchingIntegrationUrl ? <Icon spin name="cog" /> : 'Connect'}
					</Button>
				)}
			</Flex>
		</>
	);
};

const integrations = [
	{
		title: 'Balena',
		name: 'balena-api',
		website: 'https://dashboard.balena-cloud.com/',
	},
	{
		title: 'Outreach',
		name: 'outreach',
		website: 'https://www.outreach.io/',
	},
];

export const OauthIntegrations = ({ user }) => {
	return (
		<>
			{integrations.map((integration) => {
				return (
					<OauthIntegration
						key={integration.name}
						user={user}
						integration={integration}
					/>
				);
			})}
		</>
	);
};
