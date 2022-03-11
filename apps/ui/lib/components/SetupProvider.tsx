import React, { FunctionComponent } from 'react';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import Analytics from '../services/analytics';
import ErrorReporter from '../services/error-reporter';

export interface Setup {
	environment: any;
	sdk: JellyfishSDK;
	analytics: Analytics;
	errorReporter: ErrorReporter;
	actions: any;
}

const setupContext = React.createContext<Setup | null>(null);

export const SetupProvider: FunctionComponent<Setup> = ({
	environment,
	analytics,
	errorReporter,
	sdk,
	actions,
	children,
}) => {
	const setup = React.useMemo(() => {
		return {
			environment,
			sdk,
			analytics,
			errorReporter,
			actions,
		};
	}, [environment, sdk, analytics, errorReporter, actions]);

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
