import * as React from 'react';
import { Box, Form, Img, Txt } from 'rendition';
import { Task } from './ChatWidget/components/Task';
import { useTask } from './ChatWidget/hooks';
import { useSetup } from './SetupProvider';

const OauthProviderConsent = () => {
	const { sdk } = useSetup()!;

	const challenge = React.useMemo(() => {
		const searchParams = new URL(location.href).searchParams;
		return searchParams.get('consent_challenge');
	}, []);

	const readOauthConsentTask = useTask(async () => {
		return sdk.get(`/oauthprovider/consent/${challenge}`);
	});

	const writeOauthConsentTask = useTask(async (data) => {
		if (!challenge) {
			throw new Error('Missing challenge!');
		}

		const { redirect_to } = await sdk.post('/oauthprovider/consent', {
			challenge,
			accept: data.accept,
			consent: data.consent,
		});

		console.log(`Redirecting from oauth consent page to ${redirect_to}`);
		window.location.href = redirect_to;
	});

	React.useEffect(() => {
		(async () => {
			const {
				result: { skip, client },
			} = await readOauthConsentTask.exec();

			// Skip consent step if the client is livechat
			if (skip || client.client_id === 'jellyfish') {
				readOauthConsentTask.setState((readOauthConsentTaskState) => {
					return {
						...readOauthConsentTaskState,
						finished: false,
					};
				});

				writeOauthConsentTask.exec({
					accept: true,
					consent: {
						remember: true,
					},
				});
			}
		})();
	}, []);

	const schema = React.useMemo<any>(() => {
		return {
			type: 'object',
			required: ['remember'],
			properties: {
				remember: {
					title: 'Remember',
					type: 'boolean',
				},
			},
		};
	}, []);

	const [consent, setConsent] = React.useState({
		remember: true,
	});

	const handleFormChange = React.useCallback(({ formData }) => {
		setConsent(formData);
	}, []);

	const handleSubmit = React.useCallback(() => {
		writeOauthConsentTask.exec({
			accept: true,
			consent,
		});
	}, [consent]);

	const handleDenyClick = React.useCallback(() => {
		writeOauthConsentTask.exec({
			accept: false,
		});
	}, []);

	return (
		<Task task={readOauthConsentTask}>
			{({ client }) => {
				return (
					<Box p={3}>
						{client.logo_uri && <Img src={client.logo_uri} />}
						<Txt.p>
							Application{' '}
							<strong>#{client.client_name || client.client_id}</strong> wants
							access resources on your behalf.
						</Txt.p>
						<Form
							disabled={
								writeOauthConsentTask.started && !writeOauthConsentTask.finished
							}
							schema={schema}
							onFormChange={handleFormChange}
							onSubmit={handleSubmit}
							secondaryButtonProps={{
								children: 'Deny',
								onClick: handleDenyClick,
							}}
							submitButtonText="Allow"
						/>
					</Box>
				);
			}}
		</Task>
	);
};

export default OauthProviderConsent;
