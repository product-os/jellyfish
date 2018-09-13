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

import { createSession, createUser } from './core/auth';
import { createCard, deleteCard, updateCard } from './core/card';
import { createEvent } from './core/event';
import { setAdd } from './core/misc';
import { ActionLibrary } from './types';

const actionLibrary = {
	'action-create-session': createSession,
	'action-create-user': createUser,
	'action-create-card': createCard,
	'action-delete-card': deleteCard,
	'action-update-card': updateCard,
	'action-create-event': createEvent,
	'action-set-add': setAdd,
} as ActionLibrary;

module.exports = actionLibrary;
