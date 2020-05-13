/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator' ])

class XMLHttpRequest {}
global.XMLHttpRequest = XMLHttpRequest

class HowlerGlobal {}
global.HowlerGlobal = HowlerGlobal

class Howl {}
global.Howl = Howl

class Sound {}
global.Sound = Sound
