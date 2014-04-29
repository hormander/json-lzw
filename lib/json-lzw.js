"use strict";

var jpack = require("jsonpack/main");
var lzw = require("node-lzw");

var JSONLZW = function() { };

JSONLZW.prototype.encode = function(t) {
	var s = jpack.pack(t);
	return lzw.encode(s);
};

JSONLZW.prototype.decode = function(t) {
	var s = jpack.unpack(t);
	return lzw.decode(s);
};

module.exports = new JSONLZW();
