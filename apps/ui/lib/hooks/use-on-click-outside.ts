import { useEffect } from 'react';

export default function useOnClickOutside(
	domRef: HTMLElement,
	handler: (event: Event) => unknown,
) {
	useEffect(() => {
		const listener = (event: Event) => {
			// Do nothing if clicking ref's element or descendent elements
			if (domRef && !domRef.contains(event.target as Node)) {
				handler(event);
			}
		};

		document.addEventListener('mousedown', listener);
		document.addEventListener('touchstart', listener);

		return () => {
			document.removeEventListener('mousedown', listener);
			document.removeEventListener('touchstart', listener);
		};
	}, [domRef, handler]);
}
