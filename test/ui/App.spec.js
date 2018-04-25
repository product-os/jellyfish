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

require('ts-node').register()

const ava = require('ava')
const {
	mount
} = require('enzyme')
const React = require('react')
const {
	Provider
} = require('react-redux')
const App = require('../../lib/ui/App').default
const store = require('../../lib/ui/services/store').default

ava.test('should be able to render the UI without errors', (test) => {
	test.notThrows(() => {
		mount(
			<Provider store={store}>
				<App />
			</Provider>
		)
	})
})
