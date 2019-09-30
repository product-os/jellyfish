/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* global process */
/* eslint-disable no-process-env */

export const test = {
	user: {
		username: process.env.TEST_USER_USERNAME,
		password: process.env.TEST_USER_PASSWORD
	}
}
