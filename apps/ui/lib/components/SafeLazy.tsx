import React, { Suspense } from 'react';
import { ErrorBoundary } from '@balena/jellyfish-ui-components';
import Splash from './Splash';

const SafeLazy = ({ children }) => {
	return (
		<ErrorBoundary>
			<Suspense fallback={<Splash data-testid="splash" />}>{children}</Suspense>
		</ErrorBoundary>
	);
};

export const createLazyComponent = <TProps extends any>(
	fn: () => Promise<{ default: React.ComponentType<TProps> }>,
) => {
	const LazyComponent = React.lazy(fn);

	return (
		props: JSX.IntrinsicAttributes &
			React.PropsWithRef<TProps & { children?: React.ReactNode }>,
	) => {
		return (
			<SafeLazy>
				<LazyComponent {...props} />
			</SafeLazy>
		);
	};
};

export default SafeLazy;
