/*
Copyright 2018 Resin.io

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import * as moment from 'moment';
import UrlRegex = require('url-regex');

export function isUrl(focus: string): boolean {
	return UrlRegex({ exact: true }).test(focus);
}

export function isSingleLine(focus: string): boolean {
	return !/[\r\n]/.test(focus);
}

export function isSlug(focus: string): boolean {
	return /^[a-z0-9-]+$/.test(focus);
}

export function hasSpace(focus: string): boolean {
	return /\s/.test(focus);
}

export function isTime(focus: string): boolean {
	return moment(focus).isValid();
}

export function hasContent(focus: string): boolean {
	return focus.trim() !== '';
}
