import React from 'react';

const documentVisibilityContext = React.createContext<boolean | null>(null);

// A React context provider component that acts as a global handler
// for the document.onvisibilitychange callback.
export const DocumentVisibilityProvider: React.FunctionComponent = ({
	children,
}) => {
	const [isVisible, setIsVisible] = React.useState(!document.hidden);
	document.onvisibilitychange = () => {
		setIsVisible(!document.hidden);
	};
	return (
		<documentVisibilityContext.Provider value={isVisible}>
			{children}
		</documentVisibilityContext.Provider>
	);
};

// Returns a boolean value indicating if the document is currently visible
// This value can be used as the input trigger for a useEffect hook to
// take action when the document visibility changes.
export const useDocumentVisibility = () => {
	return React.useContext(documentVisibilityContext);
};
