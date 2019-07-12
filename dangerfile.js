/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	fail,
	danger
} from 'danger'

if (danger.git.modified_files.includes('package.json') &&
	!danger.git.modified_files.includes('package-lock.json')) {
	const idea = 'Perhaps you need to run `npm install`?'
	fail(`Changes were made to package.json, but not to package-lock.json - <i>${idea}</i>`)
}
