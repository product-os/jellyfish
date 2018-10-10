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

const express = require('express')
const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const morgan = require('morgan')
const bodyParser = require('body-parser')

const outputDirectory = process.cwd()
const app = express()

app.set('port', 3000)
app.set('route', '/event')

app.use(morgan('dev'))
app.use(bodyParser.json())

let counter = 1

app.all(app.get('route'), (request, response) => {
	const event = {
		headers: request.headers,
		payload: request.body
	}

	const name = _.padStart(counter.toString(), 2, '0')
	const fileName = path.join(outputDirectory, `${name}.json`)

	console.log(`Writing ${fileName}`)
	fs.writeFileSync(fileName, JSON.stringify(event, null, 2), {
		encoding: 'utf-8'
	})

	counter += 1
	response.status(200).json(event)
})

app.listen(app.get('port'), () => {
	console.log(`Listening on port ${app.get('port')}`)
	console.log(`Pipe webhooks to ${app.get('route')}`)
	console.log(`Recording to ${outputDirectory}`)
})
