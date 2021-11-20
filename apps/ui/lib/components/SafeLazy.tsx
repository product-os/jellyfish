import React, { Suspense } from 'react';
import { ErrorBoundary } from '@balena/jellyfish-ui-components';
import Splash from './Splash';

const SafeLazy = ({ children }) => {
	return (
		<ErrorBoundary>
			<Suspense fallback={<Splash />}>{children}</Suspense>
		</ErrorBoundary>
	);
};

export const createLazyComponent = (fn) => {
	const LazyComponent = React.lazy(fn);

	return (props) => {
		return (
			<SafeLazy>
				<LazyComponent {...props} />
			</SafeLazy>
		);
	};
};

export default SafeLazy;
