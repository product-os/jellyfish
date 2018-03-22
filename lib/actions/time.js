/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
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

/**
 * @summary Get the current timestamp
 * @function
 * @public
 *
 * @returns {String} RFC 3339 timestamp
 *
 * @example
 * const timestamp = time.getCurrentTimestamp()
 */
exports.getCurrentTimestamp = () => {
	const currentDate = new Date()
	return currentDate.toISOString()
}

/**
 * @summary Get a timestamp X days from now
 * @function
 * @public
 *
 * @description
 * See https://stackoverflow.com/a/5741780/1641422.
 *
 * @param {Number} days - number of days
 * @returns {String} RFC 3339 timestamp
 *
 * @example
 * const timestamp = time.getFutureTimestampByDays(7)
 */
exports.getFutureTimestampByDays = (days) => {
	const date = new Date()
	date.setDate(date.getDate() + days)
	return date.toISOString()
}
