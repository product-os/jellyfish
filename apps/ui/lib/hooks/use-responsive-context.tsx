/* eslint-disable no-undefined */

import React from 'react';
import type { ThemeType } from 'rendition';
import { withTheme } from 'styled-components';

interface ResponsiveContextValue {
	windowSize: {
		width: number | undefined;
		height: number | undefined;
	};
	isMobile: boolean;
}

const responsiveContext = React.createContext<ResponsiveContextValue | null>(
	null,
);

const ResponsiveProviderInner: React.FunctionComponent<{
	theme: any;
}> = ({ theme, children }) => {
	const isClient = typeof window === 'object';

	const getSize = () => {
		return {
			width: isClient ? window.innerWidth : undefined,
			height: isClient ? window.innerHeight : undefined,
		};
	};

	const [windowSize, setWindowSize] = React.useState(getSize);

	React.useEffect(() => {
		if (!isClient) {
			return;
		}

		const handleResize = () => {
			setWindowSize(getSize());
		};

		window.addEventListener('resize', handleResize);
		return () => {
			return window.removeEventListener('resize', handleResize);
		};

		// Empty array ensures that effect is only run on mount and unmount
	}, []);

	const context: ResponsiveContextValue = {
		windowSize,
		isMobile: !!windowSize.width && windowSize.width < theme.breakpoints[1],
	};

	return (
		<responsiveContext.Provider value={context}>
			{children}
		</responsiveContext.Provider>
	);
};

export const ResponsiveProvider = withTheme(ResponsiveProviderInner);

export const withResponsiveContext = <TProps extends {}>(
	Component: React.ComponentType<TProps & ResponsiveContextValue>,
) => {
	return (props: TProps) => {
		return (
			<responsiveContext.Consumer>
				{(context) => {
					return <Component {...context!} {...props} />;
				}}
			</responsiveContext.Consumer>
		);
	};
};

export const useResponsiveContext = () => {
	return React.useContext(responsiveContext);
};
