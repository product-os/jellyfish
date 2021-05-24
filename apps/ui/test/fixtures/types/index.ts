/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import user from './user.json';
import org from './org.json';
import contact from './contact.json';
import account from './account.json';

export { default as user } from './user.json';
export { default as org } from './org.json';
export { default as contact } from './contact.json';
export { default as account } from './account.json';

export const allTypes = [user, org, contact, account];
