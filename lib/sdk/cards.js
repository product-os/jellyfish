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
  CORE: {
    'action-update-property': require('../../default-cards/core/action-update-property.json'),
    action: require('../../default-cards/core/action.json'),
    card: require('../../default-cards/core/card.json'),
    'action-create-card': require('../../default-cards/core/action-create-card.json'),
    'action-create-event': require('../../default-cards/core/action-create-event.json'),
    create: require('../../default-cards/core/create.json'),
    event: require('../../default-cards/core/event.json'),
    type: require('../../default-cards/core/type.json')
  },
  ESSENTIAL: {
    user: require('../../default-cards/essential/user.json'),
    admin: require('../../default-cards/essential/admin.json'),
    'action-delete-card': require('../../default-cards/essential/action-delete-card.json'),
    'action-restore-card': require('../../default-cards/essential/action-restore-card.json'),
    'action-update-data-property': require('../../default-cards/essential/action-update-data-property.json'),
    'action-update-header-property': require('../../default-cards/essential/action-update-header-property.json'),
    delete: require('../../default-cards/essential/delete.json'),
    restore: require('../../default-cards/essential/restore.json'),
    update: require('../../default-cards/essential/update.json')
  },
  CONTRIB: {
    'action-update-email': require('../../default-cards/contrib/action-update-email.json')
  }
}
