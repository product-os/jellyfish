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

import {
  JSV
} from 'JSV'

const sanitizeSchemaURI = (uri) => {
  return uri.slice(uri.indexOf('#'))
}

export const validate = (schema, object) => {
  const environment = JSV.createEnvironment()
  const report = environment.validate(object, schema)

  return {
    valid: report.errors.length === 0,
    errors: report.errors.map((error) => {
      error.schemaUri = sanitizeSchemaURI(error.schemaUri)
      error.uri = sanitizeSchemaURI(error.uri)
      return error
    })
  }
}
