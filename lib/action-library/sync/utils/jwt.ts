/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as jwt from 'jsonwebtoken';
import * as _ from 'lodash';
import * as moment from 'moment';

export function makeAuthorizationHeader(
	body: object,
	key: string,
	options?: { expiry?: number },
): string {
	if (options && options.expiry) {
		const rightNow = moment();
		const soon = moment(rightNow).add(options.expiry, 'seconds');
		_.set(body, 'exp', soon.unix());
		_.set(body, 'iat', rightNow.unix());
	}
	const bookendedKey = [
		'-----BEGIN RSA PRIVATE KEY-----',
		key,
		'-----END RSA PRIVATE KEY-----',
	].join('\n');
	const jwToken = jwt.sign(body, bookendedKey, { algorithm: 'RS256' });
	return `Bearer ${jwToken}`;
}
