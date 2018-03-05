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

module.exports = {
  TYPE: {
    CARD: require('../../default-cards/type/card.json'),
    EVENT: require('../../default-cards/type/event.json'),
    TYPE: require('../../default-cards/type/type.json'),
    USER: require('../../default-cards/type/user.json'),
    ACTION: require('../../default-cards/type/action.json')
  },
  EVENT: {
    CREATE: require('../../default-cards/event/create.json')
  },
  USER: {
    ADMIN: require('../../default-cards/user/admin.json')
  },
  ACTION: {
    CREATE_CARD: require('../../default-cards/action/create-card.json')
  }
}
