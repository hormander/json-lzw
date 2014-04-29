angular.module('jsonlzw', []).
  value('jsonlzw', {
		TOKEN_TRUE: -1,
		TOKEN_FALSE: -2,
		TOKEN_NULL: -3,
		TOKEN_EMPTY_STRING: -4,

		decode: function(s) {
			var dict = {};
			var data = (s + "").split("");
			var currChar = data[0];
			var oldPhrase = currChar;
			var out = [currChar];
			var code = 256;
			var phrase;
			for (var i=1; i<data.length; i++) {
				var currCode = data[i].charCodeAt(0);
				if (currCode < 256) {
					phrase = data[i];
				}
				else {
				   phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
				}
				out.push(phrase);
				currChar = phrase.charAt(0);
				dict[code] = oldPhrase + currChar;
				code++;
				oldPhrase = phrase;
			}
			var t = out.join("");
			return this.unpack(t);
		},
		
		encode: function(s) {
			var dict = {};
			var data = (s + "").split("");
			var currChar = data[0];
			var oldPhrase = currChar;
			var out = [currChar];
			var code = 256;
			var phrase;
			for (var i = 1; i < data.length; i++) {
				var currCode = data[i].charCodeAt(0);
				phrase = (currCode < 256) ? data[i] : (dict[currCode] ? dict[currCode] : (oldPhrase + currChar));
				out.push(phrase);
				currChar = phrase.charAt(0);
				dict[code] = oldPhrase + currChar;
				code++;
				oldPhrase = phrase;
			}
			var t = out.join("");
			return this.pack(t);			
		},

		pack: function(json, options) {

			// Canonizes the options
			options = options || {};

			// A shorthand for debugging
			var verbose = options.verbose || false;

			// JSON as Javascript Object (Not string representation)
			json = typeof json === 'string' ? this.JSON.parse(json) : json;

			// The dictionary
			var dictionary = {
				strings : [],
				integers : [],
				floats : []
			};

			// The AST
			var ast = (function recursiveAstBuilder(item) {

				// The type of the item
				var type = typeof item;

				// Case 7: The item is null
				if (item === null) {
					return {
						type : 'null',
						index : this.TOKEN_NULL
					};
				}

				// Case 1: The item is Array Object
				if ( item instanceof Array) {

					// Create a new sub-AST of type Array (@)
					var ast = ['@'];

					// Add each items
					for (var i in item) {
						ast.push(recursiveAstBuilder(item[i]));
					}

					// And return
					return ast;

				}

				// Case 2: The item is Object
				if (type === 'object') {

					// Create a new sub-AST of type Object ($)
					var ast = ['$'];

					// Add each items
					for (var key in item) {
						if (!item.hasOwnProperty(key))
							continue;
						ast.push(recursiveAstBuilder(key));
						ast.push(recursiveAstBuilder(item[key]));
					}

					// And return
					return ast;

				}

				// Case 3: The item empty string
				if (item === '') {
					return {
						type : 'empty',
						index : this.TOKEN_EMPTY_STRING
					};
				}

				// Case 4: The item is String
				if (type === 'string') {

					// The index of that word in the dictionary
					var index = this._indexOf.call(dictionary.strings, item);

					// If not, add to the dictionary and actualize the index
					if (index == -1) {
						dictionary.strings.push(this._encode(item));
						index = dictionary.strings.length - 1;
					}

					// Return the token
					return {
						type : 'strings',
						index : index
					};
				}

				// Case 5: The item is integer
				if (type === 'number' && item % 1 === 0) {

					// The index of that number in the dictionary
					var index = this._indexOf.call(dictionary.integers, item);

					// If not, add to the dictionary and actualize the index
					if (index == -1) {
						dictionary.integers.push(this._base10To36(item));
						index = dictionary.integers.length - 1;
					}

					// Return the token
					return {
						type : 'integers',
						index : index
					};
				}

				// Case 6: The item is float
				if (type === 'number') {
					// The index of that number in the dictionary
					var index = this._indexOf.call(dictionary.floats, item);

					// If not, add to the dictionary and actualize the index
					if (index == -1) {
						// Float not use base 36
						dictionary.floats.push(item);
						index = dictionary.floats.length - 1;
					}

					// Return the token
					return {
						type : 'floats',
						index : index
					};
				}

				// Case 7: The item is boolean
				if (type === 'boolean') {
					return {
						type : 'boolean',
						index : item ? this.TOKEN_TRUE : this.TOKEN_FALSE
					};
				}

				// Default
				throw new Error('Unexpected argument of type ' + typeof (item));

			})(json);

			// A set of shorthands proxies for the length of the dictionaries
			var stringLength = dictionary.strings.length;
			var integerLength = dictionary.integers.length;
			var floatLength = dictionary.floats.length;

			// Create a raw dictionary
			var packed = dictionary.strings.join('|');
			packed += '^' + dictionary.integers.join('|');
			packed += '^' + dictionary.floats.join('|');

			// And add the structure
			packed += '^' + (function recursiveParser(item) {

				// If the item is Array, then is a object of
				// type [object Object] or [object Array]
				if ( item instanceof Array) {

					// The packed resulting
					var packed = item.shift();

					for (var i in item) {
						packed += recursiveParser(item[i]) + '|';
					}

					return (packed[packed.length - 1] === '|' ? packed.slice(0, -1) : packed) + ']';

				}

				// A shorthand proxies
				var type = item.type, index = item.index;

				if (type === 'strings') {
					// Just return the base 36 of index
					return this._base10To36(index);
				}

				if (type === 'integers') {
					// Return a base 36 of index plus stringLength offset
					return this._base10To36(stringLength + index);
				}

				if (type === 'floats') {
					// Return a base 36 of index plus stringLength and integerLength offset
					return this._base10To36(stringLength + integerLength + index);
				}

				if (type === 'boolean') {
					return item.index;
				}

				if (type === 'null') {
					return this.TOKEN_NULL;
				}

				if (type === 'empty') {
					return this.TOKEN_EMPTY_STRING;
				}

				throw new TypeError('The item is alien!');

			})(ast);

			// If debug, return a internal representation of dictionary and stuff
			if (options.debug)
				return {
					dictionary : dictionary,
					ast : ast,
					packed : packed
				};

			return packed;

		},

		unpack: function(packed, options) {

			// Canonizes the options
			options = options || {};

			// A raw buffer
			var rawBuffers = packed.split('^');

			// Create a dictionary
			var dictionary = [];

			// Add the strings values
			var buffer = rawBuffers[0];
			if (buffer !== '') {
				buffer = buffer.split('|');
				for (var i in buffer) {
					dictionary.push(this._decode(buffer[i]));
				}
			}

			// Add the integers values
			buffer = rawBuffers[1];
			if (buffer !== '') {
				buffer = buffer.split('|');
				for (var i in buffer) {
					dictionary.push(this._base36To10(buffer[i]));
				}
			}

			// Add the floats values
			buffer = rawBuffers[2];
			if (buffer !== '') {
				buffer = buffer.split('|')
				for (var i in buffer) {
					dictionary.push(parseFloat(buffer[i]));
				}
			}
			// Free memory
			delete buffer;

			// Tokenizer the structure
			var number36 = '';
			var tokens = [];
			for (var i in rawBuffers[3]) {
				var symbol = rawBuffers[3][i];
				if (symbol === '|' || symbol === '$' || symbol === '@' || symbol === ']') {
					if (number36) {
						tokens.push(this._base36To10(number36));
						number36 = '';
					}
					symbol !== '|' && tokens.push(symbol);
				} else {
					number36 += symbol;
				}
			}

			// A shorthand proxy for tokens.length
			var tokensLength = tokens.length;

			// The index of the next token to read
			var tokensIndex = 0;

			return (function recursiveUnpackerParser() {

				// Maybe '$' (object) or '@' (array)
				
				var type = tokens[tokensIndex++];

				// Parse an array
				if (type === '@') {

					var node = [];

					for (; tokensIndex < tokensLength; tokensIndex++) {
						var value = tokens[tokensIndex];
						if (value === ']')
							return node;
						if (value === '@' || value === '$') {
							node.push(recursiveUnpackerParser());
						} else {
							switch(value) {
								case this.TOKEN_TRUE:
									node.push(true);
									break;
								case this.TOKEN_FALSE:
									node.push(false);
									break;
								case this.TOKEN_NULL:
									node.push(null);
									break;
								case this.TOKEN_EMPTY_STRING:
									node.push('');
									break;
								default:
									node.push(dictionary[value]);
							}

						}
					}

					return node;

				}

				// Parse a object
				if (type === '$') {
					var node = {};

					for (; tokensIndex < tokensLength; tokensIndex++) {

						var key = tokens[tokensIndex];

						if (key === ']')
							return node;

						if (key === this.TOKEN_EMPTY_STRING)
							key = '';
						else
							key = dictionary[key];

						var value = tokens[++tokensIndex];

						if (value === '@' || value === '$') {
							node[key] = recursiveUnpackerParser();
						} else {
							switch(value) {
								case this.TOKEN_TRUE:
									node[key] = true;
									break;
								case this.TOKEN_FALSE:
									node[key] = false;
									break;
								case this.TOKEN_NULL:
									node[key] = null;
									break;
								case this.TOKEN_EMPTY_STRING:
									node[key] = '';
									break;
								default:
									node[key] = dictionary[value];
							}

						}

					}

					return node;
				}

				throw new TypeError('Bad token ' + type + ' isn\'t a type');

			})();

		},
		
		_indexOfDictionary: function(dictionary, value) {

			// The type of the value
			var type = typeof value;

			// If is boolean, return a boolean token
			if (type === 'boolean')
				return value ? this.TOKEN_TRUE : this.TOKEN_FALSE;

			// If is null, return a... yes! the null token
			if (value === null)
				return this.TOKEN_NULL;

			if (value === '') {
				return this.TOKEN_EMPTY_STRING;
			}

			if (type === 'string') {
				value = this._encode(value);
				var index = this._indexOf.call(dictionary.strings, value);
				if (index === -1) {
					dictionary.strings.push(value);
					index = dictionary.strings.length - 1;
				}
			}

			// If has an invalid JSON type (example a function)
			if (type !== 'string' && type !== 'number') {
				throw new Error('The type is not a JSON type');
			};

			if (type === 'string') {// string
				value = this._encode(value);
			} else if (value % 1 === 0) {// integer
				value = this._base10To36(value);
			} else {// float

			}

			// If is number, "serialize" the value
			value = type === 'number' ? this._base10To36(value) : this._encode(value);

			// Retrieve the index of that value in the dictionary
			var index = this._indexOf.call(dictionary[type], value);

			// If that value is not in the dictionary
			if (index === -1) {
				// Push the value
				dictionary[type].push(value);
				// And return their index
				index = dictionary[type].length - 1;
			}

			// If the type is a number, then add the '+'  prefix character
			// to differentiate that they is a number index. If not, then
			// just return a 36-based representation of the index
			return type === 'number' ? '+' + index : index;

		},

		_encode: function(str) {
			if ( typeof str !== 'string')
				return str;

			return str.replace(/[\+ \|\^\%]/g, function(a) {
				return ({
				' ' : '+',
				'+' : '%2B',
				'|' : '%7C',
				'^' : '%5E',
				'%' : '%25'
				})[a]
			});
		},

		_decode: function(str) {
			if ( typeof str !== 'string')
				return str;

			return str.replace(/\+|%2B|%7C|%5E|%25/g, function(a) {
				return ({
				'+' : ' ',
				'%2B' : '+',
				'%7C' : '|',
				'%5E' : '^',
				'%25' : '%'
				})[a]
			})
		},

		_base10To36: function(number) {
			return Number.prototype.toString.call(number, 36).toUpperCase();
		},

		_base36To10: function(number) {
			return parseInt(number, 36);
		},

		_indexOf: Array.prototype.indexOf ||
		function(obj, start) {
			for (var i = (start || 0), j = this.length; i < j; i++) {
				if (this[i] === obj) {
					return i;
				}
			}
			return -1;
		}
    
  });
