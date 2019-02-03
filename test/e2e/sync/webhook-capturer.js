/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
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
