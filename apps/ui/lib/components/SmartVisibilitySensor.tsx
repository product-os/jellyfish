import React from 'react';
import VisibilitySensor from 'react-visibility-sensor';
import { useDocumentVisibility } from '../hooks/use-document-visibility';

interface SmartVisibilitySensorProps {
	onChange: (isElementVisible: boolean) => void;
}

// Wraps a VisibilitySensor and only calls the 'onChange' callback
// prop if the underlying element is visible _and_ the document
// is not currently hidden.
export default function SmartVisibilitySensor({
	onChange,
	children,
}: React.PropsWithChildren<SmartVisibilitySensorProps>) {
	const [isElementVisible, setIsElementVisible] = React.useState(false);
	const isDocumentVisible = useDocumentVisibility();

	React.useEffect(() => {
		if (isDocumentVisible === null) {
			// If we can't detect document visibility, just pass on the
			// visibility sensor's change.
			onChange(isElementVisible);
		} else {
			// Otherwise the child element 'visible' if:
			//   1. the element is visible in the DOM AND
			//   2. the document is not hidden
			onChange(isElementVisible && isDocumentVisible);
		}
	}, [isElementVisible, isDocumentVisible]);

	return (
		<VisibilitySensor onChange={setIsElementVisible}>
			{children}
		</VisibilitySensor>
	);
}
