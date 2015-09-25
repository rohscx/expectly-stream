expectly-stream
===============
Expect like functions for streams.

### Install

    npm install expectly-stream

Expectly Constructor
--------------------

## createExpectlyStream(readStream, writeStream, options)

Create a new ExpectlyStream object attached to your stream. The `options` object can have a `timeout` setting in milliseconds.


### Example usage...

```
    var expectlystream = require('expectly-stream');
    var streamConnection; // This should be an active stream.
    var session = expectlystream.createExpectlyStream(streamConnection, {timeout: 5000});

    // sync execution...
    session.sync()
       .expect(/Username:/)
       .send("username\r\n")
       .respond(/Password:/, "somepassword\r\n")
       .match(/some regex/, function(err, results, done){
           // Do something creative here with the ...
           done(); // Release flow control back to the app.
       	})
       	.between(/starting regex/, /end regex/, function(err, results, done){
            
       	})
       .end(function(err) {

       	})
    // At the same time... async
    session.expect(/pattern/mi, function(err) {

    })



```


Expectly Methods
----------------

* **.send**(data, *callback*, *remaining*) - Sends `data` our the writeable stream. The `data` can be a string or a buffer. When a `callback` is supplied it is executed and passes an `err`, `results` and `remaining` values. The `remaining` value is used only when the function is executed in a *sync()* chain.

* **.expect**(regex, *callback*, *remaining*, *customTimeout*) - Listens for incomming chunks of data on the read stream and tests it against the `regex` supplied. The `callback` function is optional and returns a `(err, remaining)`.  The expect  method will timeout if a `regex` does match. By default the module will use the `defaultTimeout` provided in the constructor. You can also set a `customTimeout` as the last argument. The timeouts are in ms. e.g. 1000ms = 1 second.


* **.respond**(regex, data, *callback*, *remaining*, *customTimeout*) - Listens for incomming chunks of data on the read stream and tests it against the `regex` supplied. Once a match is detected it will send the data. The other arguments operate like the **.expect()** method.

* **.match(pattern, callback, *remaining*, *customTimeout*)** - Operates like expect except it will return a Regex match object when the callback is called. The `callback` function returns `(err, regexMatchObject, remaining)` when called.

* **.between(startPattern, endPattern, callback, *remaining*, *customTimeout*)** - Starts recording data after the first `startPattern` regex match until the start of the `endPattern` regex match. This is useful for matching complex multi line data. The callback function returns `(err, responseString, remaining)`.

* **.get(key)** - Returns the value of a key stored in the Expectly object.

* **.set(key, value)** - Sets a key value that is stored in the Expectly object.

* **.sync()** - Starts a sync flow control chain that executes multiple commands in order. Any remaining data from a method is passed to the next method in the chain. Sync will not start executing util the `.end()` method is added to the chain.
    * **.send(data)** - Sends data out the write stream.
    * **.expect(regex, *customTimeout*)** - Halts the chain until the expect regex matches.
    * **.respond(regex, data, *customTimeout*)** - Matches the `regex` and then sends the `data`.
    * **.match(regex, callback, *customTimeout*)** - Matches the `regex` and then executes your callback. The callback is passed a `(err, results, done)`. You need to make sure you call the `done` callback to pass control back to the sync chain.
    * **.between(startPattern, endPattern, callback, *customTimeout*)** Returns the data between the `startPattern` and `endPattern` regexes. The callback is passed a `(err, results, done)`. You need to make sure you call the `done` callback to pass control back to the sync chain.
    * **.end(callback)** - Ends a sync chain and is executed last or if there is an  error. Callback expects `(err, remaining)`. This must be added to the end of your sync chain.
