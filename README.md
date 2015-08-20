===============
expectly-stream
===============

Expect like functions for streams.

### Install

    npm install expectly-stream

## createExpectlyStream(readStream, writeStream, options)

Create a new ExpectlyStream object attached to your stream.


## Example usage...

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

