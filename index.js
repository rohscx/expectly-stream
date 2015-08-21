
function ExpectlyStream(readStream, writeStream, options) {
	var self = this;

	if(!arguments[1]) {
		self._writeStream = readStream;
		options = {};
	} else if(!arguments[1].write) {
		self._writeStream = readStream;
		options = arguments[1];
	} else {
		self._writeStream = arguments[1];
		options = options || {};
	}

	self._defaultTimeout = options.timeout || 10000;
	self._readStream = readStream;
}

ExpectlyStream.prototype.send = function(data, callback, remaining) {
	try {
		this._writeStream.write(data);
		if(callback) {
			return callback(null, remaining);
		}
	} catch(err) {
		if(callback) {
			return callback(err, remaining);
		}
	}
	
}

ExpectlyStream.prototype.expect = function(pattern, callback, remaining, customTimeout) {
	var self = this;
	var timeoutId = null;
	var timeoutMs = customTimeout || self._defaultTimeout;
	var output = "" + remaining || '';

	// Todo: Verify pattern is a regex...

	function expectListener(chunk) {
		var str = chunk.toString();
		var results;

		for(var i=0, l=str.length; i < l; i++) {
			output += str[i];
			results = pattern.exec(output);
			if(results) {
				clearTimeout(timeoutId);
				return done(null, str.substr(i + 1, l + 1));
			}
		}
	}

	function timeout() {
		return done("Expect timed out after " + timeoutMs + "ms.", output);
	}

	function done(err, remaining) {
		self._readStream.removeListener("data", expectListener);
		if(callback)
			return callback(err, remaining);
	}

	timeoutId = setTimeout(timeout, timeoutMs);
	this._readStream.on("data", expectListener);
	return self;
}

ExpectlyStream.prototype.respond = function(pattern, data, callback, remaining, customTimeout) {
	var self = this;
	function sendDone(err, remaining) {
		return callback(err, remaining);
	}

	function expectDone(err, remaining) {
		if(err) {
			return callback(err, remaining);
		} else {
			self.send(data, sendDone, remaining);
		}
	}
	self.expect(pattern, expectDone, remaining, customTimeout);
}


ExpectlyStream.prototype.match = function(pattern, callback, remaining, customTimeout) {
	var self = this;
	var timeoutId = null;
	var timeoutMs = customTimeout || self._defaultTimeout;
	var output = "" + remaining || '';

	// Todo: Verify pattern is a regex...

	function expectListener(chunk) {
		var str = chunk.toString();
		var results;

		for(var i=0, l=str.length; i < l; i++) {
			output += str[i];
			results = pattern.exec(output);
			
			if(results) {
				clearTimeout(timeoutId);
				return done(null, results, str.substr(i + 1, l + 1));
			}
		}
	}

	function timeout() {
		return done("Match timed out after " + timeoutMs, output);
	}

	function done(err, results, remaining) {
		self._readStream.removeListener("data", expectListener);
		if(callback)
			return callback(err, results, remaining);
	}

	timeoutId = setTimeout(timeout, timeoutMs)
	this._readStream.on("data", expectListener);
	return self;
}


ExpectlyStream.prototype.between = function(startPattern, endPattern, callback, remaining, customTimeout) {
	var self = this;
	var timeoutId = null;
	var timeoutMs = customTimeout || self._defaultTimeout;
	var output = "" + remaining || '';
	var startMatched = false;

	// Todo: Verify pattern is a regex...

	function expectListener(chunk) {
		var str = chunk.toString();
		var results;

		for(var i=0, l=str.length; i < l; i++) {
			output += str[i];
			if(startMatched == false) {
				results = startPattern.exec(output);
			} else {
				results = endPattern.exec(output);
			}
			
			if(results) {
				if(startMatched == false) {
					output = str.substr(results.index, str.length);
					startMatched = true;
				} else {
					clearTimeout(timeoutId);
					return done(null, output.substr(0, results.index), str.substr(i + 1, l + 1));
				}

			}
		}
	}

	function timeout() {
		return done("Match timed out after " + timeoutMs, output);
	}

	function done(err, results, remaining) {
		self._readStream.removeListener("data", expectListener);
		if(callback)
			return callback(err, results, remaining);
	}

	timeoutId = setTimeout(timeout, timeoutMs)
	this._readStream.on("data", expectListener);
	return self;
}



ExpectlyStream.prototype.sync = function Sync(remaining) {
	var self = this;
	var _stack = [];
	var _remaining = remaining;

	var syncSession = {
		send: Send,
		expect: Expect,
		respond: Respond,
		match: Match,
		between: Between,
		end: End
	};

	function Send(data) {
		_stack.push(["send", data]);
		return syncSession;
	}

	function Expect(pattern, customTimeout) {
		_stack.push(["expect", pattern, customTimeout]);
		return syncSession;	
	}

	function Respond(pattern, data, customTimeout) {
		_stack.push(["respond", pattern, data, customTimeout]);
		return syncSession;	
	}

	function Match(pattern, callback, customTimeout) {
		_stack.push(["match", pattern, callback, customTimeout]);
		return syncSession;		
	}

	function Between(startPattern, endPattern, callback, customTimeout) {
		_stack.push(["between", startPattern, endPattern, callback, customTimeout]);
		return syncSession;		
	}

	function End(callback) {
		var _stackError = null;

		function ShiftStack(remaining) {
			var action = _stack.shift();
			var remaining = remaining || '';
			switch(action[0]) {
				case "send":  
					self.send(action[1], function(err, remaining){
						if(err) return callback(err);
						Again(remaining);
					});
					break;
				case "expect":
					self.expect(action[1], function(err, remaining) {
						if(err) return callback(err);
						Again(remaining);
					}, remaining, action[2]);
					break;
				case "respond":
					self.respond(action[1], action[2], function(err, remaining){
						if(err) return callback(err);
						Again(remaining);
					}, remaining, action[3]);
					break;
				case "match":
					self.match(action[1], function(err, results, remaining) {
						if(action[2]) {
							action[2](err, results, function done() {
								Again(remaining);
							});
						} else {
							if(err) return callback(err);	
						}
					}, remaining);
					break;
				case 'between':
					self.between(action[1], action[2], function(err, results, remaining) {
						if(action[3]) {
							action[3](err, results, function done() {
								Again(remaining);
							});
						} else {
							if(err) return callback(err);	
						}
					}, remaining);
					break;

				default:
			}

			function Again(remaining) {
				if(_stack.length > 0 || _stackError != null) {
					ShiftStack(remaining);
				} else {
					return callback(_stackError, remaining);
				}
			}

		}
		if(_stack.length > 0)
			ShiftStack(_remaining);
	}
	return syncSession;
}



module.exports.createExpectlyStream = function createExpectlyStream(readStream, writeStream, options) {
	return new ExpectlyStream(readStream, writeStream, options);
}

module.exports.ExpectlyStream = ExpectlyStream;
