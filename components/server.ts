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

import express = require('express')
const app = express()

if (app.get('env') === 'production') {
  app.set('port', process.env.PORT)
} else {
  app.set('port', 8000)
}

app.get('/', (request, response) => {
  response.send('Hello World!')
})

app.listen(app.get('port'), () => {
  console.log(`Example app listening on port ${app.get('port')}!`)
})
