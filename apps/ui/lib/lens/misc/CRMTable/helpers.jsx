/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import styled from 'styled-components'
import {
	oneLineCommaListsAnd
} from 'common-tags'

/**
 * Formats an array of words to a conjuction
 *
 * @param {Array} words - for example: [ 'Account', 'Org', 'User' ]
 * @returns {String} - for example: Account, Org, and User
 */
export const formatAsConjunction = (words = []) => {
	return oneLineCommaListsAnd `${words}`
}

/**
 * An inline span that doesn't line wrap
 */
export const SingleLineSpan = styled.span `
	white-space: 'nowrap'
`
