jellyfish-sdk
============

> Javascript SDK for interacting with a Balena Jellyfish server

Installation
------------

Install `jellyfish-sdk` by running:

```sh
npm install --save @resin.io/jellyfish-sdk
```

Usage
-----

```js
import { getSdk } from 'jellyfish-sdk';

const sdk = getSdk({
	apiPrefix: 'api/v1',
	apiUrl: 'http://localhost:8000'
});

const userId = await sdk.signup({
	username: 'johndoe',
	email: 'johndoe@example.com',
	password: 'password123',
});
```

TypeScript
----------

For TypeScript users, typings are included in the module and should **Just Work™**.

Documentation
-------------

	<a name="JellyfishSDK"></a>

## JellyfishSDK : <code>object</code>
**Kind**: global namespace  

* [JellyfishSDK](#JellyfishSDK) : <code>object</code>
    * [.auth](#JellyfishSDK.auth) : <code>object</code>
        * [.whoami()](#JellyfishSDK.auth.whoami) ⇒ <code>Promise</code>
        * [.signup()](#JellyfishSDK.auth.signup) ⇒ <code>Promise</code>
        * [.loginWithToken()](#JellyfishSDK.auth.loginWithToken) ⇒ <code>Promise</code>
        * [.login()](#JellyfishSDK.auth.login) ⇒ <code>Promise</code>
        * [.logout()](#JellyfishSDK.auth.logout)
    * [.card](#JellyfishSDK.card) : <code>object</code>
        * [.get(idOrSlug)](#JellyfishSDK.card.get) ⇒ <code>Promise</code>
        * [.getAllByType(type)](#JellyfishSDK.card.getAllByType) ⇒ <code>Promise</code>
        * [.getTimeline(id)](#JellyfishSDK.card.getTimeline) ⇒ <code>Promise</code>
        * [.create(card)](#JellyfishSDK.card.create) ⇒ <code>Promise</code>
        * [.update(id, body)](#JellyfishSDK.card.update) ⇒ <code>Promise</code>
        * [.remove(id)](#JellyfishSDK.card.remove) ⇒ <code>Promise</code>
    * [.utils](#JellyfishSDK.utils) : <code>object</code>
        * [.debug(params)](#JellyfishSDK.utils.debug)
        * [.isUUID(string)](#JellyfishSDK.utils.isUUID) ⇒ <code>Boolean</code>
        * [.slugify(string)](#JellyfishSDK.utils.slugify) ⇒ <code>String</code>
        * [.compileSchema(schema)](#JellyfishSDK.utils.compileSchema) ⇒ <code>function</code>
    * [.getConfig()](#JellyfishSDK.getConfig) ⇒ <code>Promise</code>
    * [.setApiUrl(apiUrl)](#JellyfishSDK.setApiUrl)
    * [.getApiUrl()](#JellyfishSDK.getApiUrl) ⇒ <code>String</code> \| <code>undefined</code>
    * [.setApiBase(apiUrl, apiPrefix)](#JellyfishSDK.setApiBase)
    * [.setAauthToken(token)](#JellyfishSDK.setAauthToken)
    * [.getAauthToken()](#JellyfishSDK.getAauthToken) ⇒ <code>String</code> \| <code>undefined</code>
    * [.clearAuthToken()](#JellyfishSDK.clearAuthToken)
    * [.cancelAllRequests([reason])](#JellyfishSDK.cancelAllRequests)
    * [.cancelAllstreams()](#JellyfishSDK.cancelAllstreams)
    * [.post(endpoint, body, [options])](#JellyfishSDK.post) ⇒ <code>Promise</code>
    * [.query(schema)](#JellyfishSDK.query) ⇒ <code>Promise</code>
    * [.action(body)](#JellyfishSDK.action) ⇒ <code>Promise</code>
    * [.stream(schema)](#JellyfishSDK.stream) ⇒ <code>EventEmitter</code>

<a name="JellyfishSDK.auth"></a>

### JellyfishSDK.auth : <code>object</code>
**Kind**: static namespace of [<code>JellyfishSDK</code>](#JellyfishSDK)  

* [.auth](#JellyfishSDK.auth) : <code>object</code>
    * [.whoami()](#JellyfishSDK.auth.whoami) ⇒ <code>Promise</code>
    * [.signup()](#JellyfishSDK.auth.signup) ⇒ <code>Promise</code>
    * [.loginWithToken()](#JellyfishSDK.auth.loginWithToken) ⇒ <code>Promise</code>
    * [.login()](#JellyfishSDK.auth.login) ⇒ <code>Promise</code>
    * [.logout()](#JellyfishSDK.auth.logout)

<a name="JellyfishSDK.auth.whoami"></a>

#### auth.whoami() ⇒ <code>Promise</code>
Gets the user card of the currently authorised user using
their auth token

**Kind**: static method of [<code>auth</code>](#JellyfishSDK.auth)  
**Summary**: Get the currently authenticated user  
**Access**: public  
**Fulfil**: <code>Object\|null</code> - A single user card, or null if one wasn't found  
**Example**  
```js
sdk.auth.whoami()
	.then((user) => {
		console.log(user)
	})
```
<a name="JellyfishSDK.auth.signup"></a>

#### auth.signup() ⇒ <code>Promise</code>
Create a new user account and return the newly created user's
id

**Kind**: static method of [<code>auth</code>](#JellyfishSDK.auth)  
**Summary**: Create a new user account  
**Access**: public  
**Fulfil**: <code>Object</code> - The newly created user  
**Example**  
```js
sdk.auth.signup({
	username: 'johndoe',
	email: 'johndoe@example.com',
	password: 'password123'
})
	.then((id) => {
		console.log(id)
	})
```
<a name="JellyfishSDK.auth.loginWithToken"></a>

#### auth.loginWithToken() ⇒ <code>Promise</code>
Authenticate the SDK using a token. The token is checked for
validity and then saved using `jellyFishSdk.setAuthToken` to be used for
later requests. Once logged in, there is no need to set the token again

**Kind**: static method of [<code>auth</code>](#JellyfishSDK.auth)  
**Summary**: Authenticate the SDK using a token  
**Access**: public  
**Example**  
```js
sdk.auth.loginWithToken('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	.then(() => {
		console.log('Authenticated')
	})
```
<a name="JellyfishSDK.auth.login"></a>

#### auth.login() ⇒ <code>Promise</code>
Authenticate the SDK using a username and password. If the
username and password are valid, a user session card will be returned.
The id of the user session id (which is used to authenticate requests) is
then saved using `jellyFishSdk.setAuthToken` to be used for later requests.
Once logged in, there is no need to set the token again

**Kind**: static method of [<code>auth</code>](#JellyfishSDK.auth)  
**Summary**: Authenticate the SDK using a username and password  
**Access**: public  
**Fulfils**: <code>Object</code> The generated user session  
**Example**  
```js
sdk.auth.login({
		username: 'johndoe',
		password: 'password123'
	})
	.then((session) => {
		console.log('Authenticated', session)
	})
```
<a name="JellyfishSDK.auth.logout"></a>

#### auth.logout()
Logout, removing the current authToken and closing all
streams and network requests

**Kind**: static method of [<code>auth</code>](#JellyfishSDK.auth)  
**Summary**: Logout  
**Access**: public  
**Example**  
```js
sdk.auth.logout()
```
<a name="JellyfishSDK.card"></a>

### JellyfishSDK.card : <code>object</code>
**Kind**: static namespace of [<code>JellyfishSDK</code>](#JellyfishSDK)  

* [.card](#JellyfishSDK.card) : <code>object</code>
    * [.get(idOrSlug)](#JellyfishSDK.card.get) ⇒ <code>Promise</code>
    * [.getAllByType(type)](#JellyfishSDK.card.getAllByType) ⇒ <code>Promise</code>
    * [.getTimeline(id)](#JellyfishSDK.card.getTimeline) ⇒ <code>Promise</code>
    * [.create(card)](#JellyfishSDK.card.create) ⇒ <code>Promise</code>
    * [.update(id, body)](#JellyfishSDK.card.update) ⇒ <code>Promise</code>
    * [.remove(id)](#JellyfishSDK.card.remove) ⇒ <code>Promise</code>

<a name="JellyfishSDK.card.get"></a>

#### card.get(idOrSlug) ⇒ <code>Promise</code>
Get a card using an id or a slug

**Kind**: static method of [<code>card</code>](#JellyfishSDK.card)  
**Summary**: Get a card  
**Access**: public  
**Fulfil**: <code>Object\|null</code> - A single card, or null if one wasn't found  

| Param | Type | Description |
| --- | --- | --- |
| idOrSlug | <code>String</code> | The id or slug of the card to retrieve |

**Example**  
```js
sdk.card.get('user-johndoe')
	.then((card) => {
		console.log(card)
	})

sdk.card.get('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	.then((card) => {
		console.log(card)
	})
```
<a name="JellyfishSDK.card.getAllByType"></a>

#### card.getAllByType(type) ⇒ <code>Promise</code>
Get all cards that have the provided 'type' attribute

**Kind**: static method of [<code>card</code>](#JellyfishSDK.card)  
**Summary**: Get a all cards of a given type  
**Access**: public  
**Fulfil**: <code>Object[]</code> - All cards of the given type  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | The type of card to retrieve |

**Example**  
```js
sdk.card.getAllByType('view')
	.then((cards) => {
		console.log(cards)
	})
```
<a name="JellyfishSDK.card.getTimeline"></a>

#### card.getTimeline(id) ⇒ <code>Promise</code>
Get all the timeline cards that target a card with the
specified id

**Kind**: static method of [<code>card</code>](#JellyfishSDK.card)  
**Summary**: Get the timeline for a card  
**Access**: public  
**Fulfil**: <code>Object[]</code> - A set of timeline cards  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | The id of the card to retrieve a timeline for |

**Example**  
```js
sdk.card.getTimeline('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
	.then((timeline) => {
		console.log(timeline)
	})
```
<a name="JellyfishSDK.card.create"></a>

#### card.create(card) ⇒ <code>Promise</code>
Send an action request to create a new card

**Kind**: static method of [<code>card</code>](#JellyfishSDK.card)  
**Summary**: Create a new card  
**Access**: public  
**Fulfil**: <code>Card</code> - The newly created card  

| Param | Type | Description |
| --- | --- | --- |
| card | <code>Object</code> | The card that should be created, must include a 'type' attribute. |

**Example**  
```js
sdk.card.create({
	type: 'thread',
	data: {
		description: 'lorem ipsum dolor sit amet'
	}
})
	.then((id) => {
		console.log(id)
	})
```
<a name="JellyfishSDK.card.update"></a>

#### card.update(id, body) ⇒ <code>Promise</code>
Send an action request to update a card

**Kind**: static method of [<code>card</code>](#JellyfishSDK.card)  
**Summary**: Update a card  
**Access**: public  
**Fulfil**: <code>Object</code> - An action response object  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | The id of the card that should be updated |
| body | <code>Object</code> | An object that will be used to update the card |

**Example**  
```js
sdk.card.update('8b465c9a-b4cb-44c1-9df9-632649d7c4c3', {
	data: {
		description: 'foo bar baz'
	}
})
	.then((response) => {
		console.log(response)
	})
```
<a name="JellyfishSDK.card.remove"></a>

#### card.remove(id) ⇒ <code>Promise</code>
Send an action request to remove a card

**Kind**: static method of [<code>card</code>](#JellyfishSDK.card)  
**Summary**: Remove a card  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>String</code> | The id of the card that should be remove |

**Example**  
```js
sdk.card.remove('8b465c9a-b4cb-44c1-9df9-632649d7c4c3')
```
<a name="JellyfishSDK.utils"></a>

### JellyfishSDK.utils : <code>object</code>
**Kind**: static namespace of [<code>JellyfishSDK</code>](#JellyfishSDK)  

* [.utils](#JellyfishSDK.utils) : <code>object</code>
    * [.debug(params)](#JellyfishSDK.utils.debug)
    * [.isUUID(string)](#JellyfishSDK.utils.isUUID) ⇒ <code>Boolean</code>
    * [.slugify(string)](#JellyfishSDK.utils.slugify) ⇒ <code>String</code>
    * [.compileSchema(schema)](#JellyfishSDK.utils.compileSchema) ⇒ <code>function</code>

<a name="JellyfishSDK.utils.debug"></a>

#### utils.debug(params)
Stream updates and insertions for cards that match a JSON
schema

**Kind**: static method of [<code>utils</code>](#JellyfishSDK.utils)  
**Summary**: Print a debug message to the console  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>\*</code> | The data to print to the console |

**Example**  
```js
debug('foo bar baz')
```
<a name="JellyfishSDK.utils.isUUID"></a>

#### utils.isUUID(string) ⇒ <code>Boolean</code>
**Kind**: static method of [<code>utils</code>](#JellyfishSDK.utils)  
**Summary**: Check if a string is a UUID  
**Returns**: <code>Boolean</code> - whether the string is a uuid  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| string | <code>String</code> | string |

**Example**  
```js
if (sdk.utils.isUUID('4a962ad9-20b5-4dd8-a707-bf819593cc84')) {
  console.log('This is a uuid')
}
```
<a name="JellyfishSDK.utils.slugify"></a>

#### utils.slugify(string) ⇒ <code>String</code>
Lowercases text, then converts spaces to hyphens and removes any character that isn't
alphanumeric or a dash

**Kind**: static method of [<code>utils</code>](#JellyfishSDK.utils)  
**Summary**: Convert a string into a value that can be used as a slug  
**Returns**: <code>String</code> - A valid slug  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| string | <code>String</code> | string |

**Example**  
```js
const slug = sdk.utils.slugify('Lorem ipsum!')
console.log(slug) //--> 'lorem-ipsum'
```
<a name="JellyfishSDK.utils.compileSchema"></a>

#### utils.compileSchema(schema) ⇒ <code>function</code>
Compiles a schema using AJV, return a validator function

**Kind**: static method of [<code>utils</code>](#JellyfishSDK.utils)  
**Summary**: Compile a schema using AJV  
**Returns**: <code>function</code> - An ajv validator function  
**Access**: public  
**See**: https://github.com/epoberezkin/ajv#compileobject-schema---functionobject-data  

| Param | Type | Description |
| --- | --- | --- |
| schema | <code>Object</code> | A JSON schema |

**Example**  
```js
const schema = {
	type: 'object',
	properies: {
		type: {
			const: 'thread'
		}
	}
};

const validator = sdk.utils.compileSchema(schema);
```
<a name="JellyfishSDK.getConfig"></a>

### JellyfishSDK.getConfig() ⇒ <code>Promise</code>
Retrieve configuration data from the API

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Load config object from the API  
**Access**: public  
**Fulfil**: <code>Object</code> - Config object  
**Example**  
```js
sdk.getConfig()
	.then((config) => {
		console.log(config);
	});
```
<a name="JellyfishSDK.setApiUrl"></a>

### JellyfishSDK.setApiUrl(apiUrl)
Set the url of the Jellyfish API instance the SDK should
communicate with

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Set the API url  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| apiUrl | <code>String</code> | The API url |

**Example**  
```js
sdk.setApiUrl('http://localhost:8000')
```
<a name="JellyfishSDK.getApiUrl"></a>

### JellyfishSDK.getApiUrl() ⇒ <code>String</code> \| <code>undefined</code>
Get the url of the Jellyfish API instance the SDK should
communicate with

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Get the API url  
**Returns**: <code>String</code> \| <code>undefined</code> - The API url  
**Access**: public  
**Example**  
```js
const url = sdk.getApiUrl()
console.log(url) //--> 'http://localhost:8000'
```
<a name="JellyfishSDK.setApiBase"></a>

### JellyfishSDK.setApiBase(apiUrl, apiPrefix)
Set the url and path prefix to use when sending requests to
the API

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Set the base API url  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| apiUrl | <code>String</code> | The API url |
| apiPrefix | <code>String</code> | The API path prefix |

**Example**  
```js
sdk.setApiBase('http://localhost:8000', 'api/v2')
```
<a name="JellyfishSDK.setAauthToken"></a>

### JellyfishSDK.setAauthToken(token)
Set authentication token used when sending request to the API

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Set the auth token  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| token | <code>String</code> | The authentication token |

**Example**  
```js
sdk.setAuthToken('799de256-31bb-4399-b2d2-3c2a2483ddd8')
```
<a name="JellyfishSDK.getAauthToken"></a>

### JellyfishSDK.getAauthToken() ⇒ <code>String</code> \| <code>undefined</code>
Get authentication token used when sending request to the API

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Get the auth token  
**Returns**: <code>String</code> \| <code>undefined</code> - The authentication token if it has been set  
**Access**: public  
**Example**  
```js
const token = sdk.getAuthToken(
console.log(token) //--> '799de256-31bb-4399-b2d2-3c2a2483ddd8'
```
<a name="JellyfishSDK.clearAuthToken"></a>

### JellyfishSDK.clearAuthToken()
Clear the authentication token used when sending request to the API

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: clear the auth token  
**Access**: public  
**Example**  
```js
sdk.clearAuthToken()
```
<a name="JellyfishSDK.cancelAllRequests"></a>

### JellyfishSDK.cancelAllRequests([reason])
Cancel all network requests that are currently in progress,
optionally providing a reason for doing so.

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Cancel all network requests  
**Access**: public  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [reason] | <code>String</code> | <code>&#x27;Operation canceled by user&#x27;</code> | The reason for cancelling the network requests |

**Example**  
```js
sdk.cancelAllRequests()
```
<a name="JellyfishSDK.cancelAllstreams"></a>

### JellyfishSDK.cancelAllstreams()
Close all open streams to the Jellyfish API

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Cancel all streams  
**Access**: public  
**Example**  
```js
sdk.cancelAllStreams()
```
<a name="JellyfishSDK.post"></a>

### JellyfishSDK.post(endpoint, body, [options]) ⇒ <code>Promise</code>
Send a POST request to the Jellyfish API. Uses Axios under the
hood. Requests are automatically authorized using a token if it has
been set.

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Send a POST request to the API  
**Access**: public  
**Fulfil**: <code>Object</code> - Request response object  

| Param | Type | Description |
| --- | --- | --- |
| endpoint | <code>String</code> | The endpoint to send the POST request to |
| body | <code>Object</code> | The body data to send |
| [options] | <code>Object</code> | Request configuration options. See https://github.com/axios/axios#request-config |

**Example**  
```js
sdk.post('action', { foo: 'bar'})
	.then((data) => {
		console.log(data);
	});
```
<a name="JellyfishSDK.query"></a>

### JellyfishSDK.query(schema) ⇒ <code>Promise</code>
Query the API for card data, using a JSON schema. Cards that
match the JSON schema are returned

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Send a query request to the API  
**Access**: public  
**Fulfil**: <code>Object[]</code> - An array of cards that match the schema  

| Param | Type | Description |
| --- | --- | --- |
| schema | <code>Object</code> | The JSON schema to query with |

**Example**  
```js
const schema = {
	type: 'object',
	properies: {
		type: {
			const: 'thread'
		}
	}
};

sdk.query(schema)
	.then((cards) => {
		console.log(cards);
	});
```
<a name="JellyfishSDK.action"></a>

### JellyfishSDK.action(body) ⇒ <code>Promise</code>
Send an action to the API, the request will resolve
once the action is complete

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Send an action to the API  
**Access**: public  
**Fulfil**: [<code>ActionResponse</code>](#ActionResponse) - An action response object  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>Object</code> | The action request |
| body.card | <code>String</code> | The slug or UUID of the target card |
| body.action | <code>String</code> | The name of the action to run |
| [body.arguments] | <code>\*</code> | The arguments to use when running the action |
| [body.transient] | <code>\*</code> | The transient arguments to use when running the action |

**Example**  
```js
sdk.action({
	card: 'thread',
	action: 'action-create-card',
	arguments: {
		data: {
			description: 'lorem ipsum dolor sit amet'
		}
	}
})
	.then((response) => {
		console.log(response);
	});
```
<a name="JellyfishSDK.stream"></a>

### JellyfishSDK.stream(schema) ⇒ <code>EventEmitter</code>
Stream updates and insertions for cards that match a JSON
schema

**Kind**: static method of [<code>JellyfishSDK</code>](#JellyfishSDK)  
**Summary**: Stream cards from the API  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| schema | <code>Object</code> | The JSON schema to query with |

**Example**  
```js
const schema = {
	type: 'object',
	properies: {
		type: {
			const: 'thread'
		}
	}
};

const stream = sdk.stream(schema)

stream.on('update', (data) => {
	console.log(data);
})

stream.on('streamError', (error) => {
	console.error(error);
})
```
