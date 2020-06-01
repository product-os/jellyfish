/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	useEffect
} from 'react'

export default function useOnClickOutside (domRef, handler) {
	useEffect(
		() => {
			const listener = (event) => {
				// Do nothing if clicking ref's element or descendent elements
				if (domRef && !domRef.contains(event.target)) {
					handler(event)
				}
			}

			document.addEventListener('mousedown', listener)
			document.addEventListener('touchstart', listener)

			return () => {
				document.removeEventListener('mousedown', listener)
				document.removeEventListener('touchstart', listener)
			}
		},
		[ domRef, handler ]
	)
}
