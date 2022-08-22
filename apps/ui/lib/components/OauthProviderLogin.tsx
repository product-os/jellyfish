import * as React from 'react';
import { Task } from './ChatWidget/components/Task';
import { useTask } from './ChatWidget/hooks';
import { useSetup } from './SetupProvider';

const OauthProviderLogin = () => {
	const { sdk } = useSetup()!;

	const oauthLoginTask = useTask(async () => {
		const searchParams = new URL(location.href).searchParams;
		const challenge = searchParams.get('login_challenge');

		if (!challenge) {
			throw new Error('Missing challenge!');
		}

		const { redirect_to } = await sdk.post('/oauthprovider/login', {
			challenge,
		});

		console.log(`Redirecting from oauth login page to ${redirect_to}`);
		window.location.href = redirect_to;
	});

	React.useEffect(() => {
		oauthLoginTask.exec();
	}, []);

	return <Task task={oauthLoginTask} />;
};

export default OauthProviderLogin;
