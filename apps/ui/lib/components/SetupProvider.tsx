import React, { FunctionComponent } from 'react';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import Analytics from '../services/analytics';
import * as env from '../environment';

export interface Setup {
	environment: typeof env;
	sdk: JellyfishSDK;
	analytics: Analytics;
}

const setupContext = React.createContext<Setup | null>(null);

export const SetupProvider: FunctionComponent<Setup> = ({
	environment,
	analytics,
	sdk,
	children,
}) => {
	const setup = React.useMemo(() => {
		return {
			environment,
			sdk,
			analytics,
		};
	}, [environment, sdk, analytics]);

	return (
		<setupContext.Provider value={setup}>{children}</setupContext.Provider>
	);
};

export const withSetup = <TProps extends Setup>(
	Component: React.ComponentType<TProps>,
) => {
	return (props: React.PropsWithChildren<Omit<TProps, keyof Setup>>) => {
		return (
			<setupContext.Consumer>
				{(setup) => {
					return <Component {...setup!} {...(props as TProps)} />;
				}}
			</setupContext.Consumer>
		);
	};
};

export const useSetup = () => {
	return React.useContext(setupContext);
};
