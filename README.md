JSON-LZW
-------------

This is a compression algorithm for json data (use jsonpack and lzw).

In my tests the json message is reduced by almost 80%.

## Install

```bash
npm install json-lzw
```

## Example

```app.js
"use strict";

var lzw = require("json-lzw");
var buffer = "{ 'message': 'hello world' }";

var encode = lzw.encode(buffer);
console.log(encode);

var decode = lzw.decode(buffer);
console.log(decode);

```

## API

### encode(value)

encoding json string and return string encoded

### decode(value)

decoding string value and return json string

## AngularJS integration

Under node-lzw-install-path/angular there is jsonlzw.js, port of this library for AngularJS.
Follow example of use.

In your html file put

```html
<script src="path/jsonlzw.js" type="text/javascript"></script>
```

In your angular controller file put

```js
var app = angular.module('app', ['jsonlzw']);

app.controller('myController', function($scope, jsonlzw) {
	...
	var encode = jsonlzw.encode(...);
	...
	var decode = jsonlzw.decode(...);
	...
}
```

## Contributors

- [Marco Murdocca aka `hormander`](https://github.com/hormander)
- [Sapienlab] (http://sapienlab.com)

## Thanks

Rodrigo for jsonpack module

