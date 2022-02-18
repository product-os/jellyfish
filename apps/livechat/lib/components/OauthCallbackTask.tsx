import React from 'react';
import { useTask } from '@balena/jellyfish-chat-widget/build/hooks';
import { Task } from '@balena/jellyfish-chat-widget/build/components/task';
import { useSetup } from '@balena/jellyfish-ui-components';
import { JellyfishSDK } from '@balena/jellyfish-client-sdk';

const exchangeCode = async (
	{ sdk }: { sdk: JellyfishSDK },
	userSlug,
	code,
	oauthProvider,
) => {
	if (!code) {
		throw new Error('Auth code missing');
	}

	if (!oauthProvider) {
		throw new Error('Auth provider missing');
	}

	const data = await sdk.post<{ access_token: string }>(
		`/oauth/${oauthProvider}`,
		{
			slug: userSlug,
			code,
		},
	);

	const token = data && data.access_token;

	if (!token) {
		throw new Error('Could not fetch auth token');
	}

	localStorage.setItem('token', token);
	sdk.setAuthToken(token);
};

export const OauthCallbackTask = ({
	userSlug,
	location,
	oauthProvider,
	children,
}) => {
	const { sdk } = useSetup()!;
	const exchangeCodeTask = useTask(exchangeCode);

	React.useEffect(() => {
		const code = new URLSearchParams(location.search).get('code');
		exchangeCodeTask.exec(
			{
				sdk,
			},
			userSlug,
			code,
			oauthProvider,
		);
	}, [sdk, location.search, userSlug, oauthProvider]);

	return (
		<Task task={exchangeCodeTask} px={2}>
			{children}
		</Task>
	);
};
