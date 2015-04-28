# Better `input[type=file]`
Upgrade your file inputs to automatically read their selected file(s) in the 
background. Just include the [autoload.js][1] file in your project and you are
good to go.

## Automatic attachement
It automatically finds all `input[type=file]` and attaches the needed event
listeners for it to work. However, if you insert dynamic content, you need to
call `FileReader.auto` on all the `input[type=file]`. It is safe to call it
multiple times on the same element, it remembers if it is already enabled.

## Public API
It adds one static property and one static method onto the `FileReader` class.
This is to avoid polluting the global namespace, but it does modify a native
object. It dosen't modify the any native prototype though.

### `FileReader.format`
This specifies the default format for automatic file reading. This is the part
after `readAs` on all `FileReader` instances. See MDN for the [full list][2].

### `FileReader.auto(HTMLInputElement input, string format = FileReader.format)`
This enables automatic file reading for the provided `input` element in the
provided format. The latter defaults to `FileReader.format`, see above.

## Events
All events from the `FileReader` are broadcasted onto the `input` element. This
means if you have multiple files, e.g. `<input type="file" multiple />`, then
you will receive these events for each selected file. To solve this 
`event.relatedTarget` is set to the `File` in question.

All events gets a new property `files` which contain the `FileList` of the
currently selected files. Each of the `File` objects in that `FileList` gets a
new property `reader` which contains their corresponding `FileReader`.

It also adds two new events to handle multiple files better, but they are also
fired on single file input. See MDN for the `FileReader`[events][3].

### _loadallstart_
Before automatic reading starts.

### _loadall_
After all files have been read.

## AngularJS
This also includes a small AngularJS directive that listens on the above events
and properly integrates with [ngModel][4] so you can just use it as any other
input field. Include the [directive.js][5] and inject "angular-file-input" into
your application.

## Dependcies
For the vanilla JavaScript version, it requires the [File API][6] and a fairly
modern browser. Make sure you test it on all platforms you need to support.

## License
This code is licensed under MIT, the the [LICENSE.md][7] file for details.

[1]: autoload.js
[2]: https://developer.mozilla.org/en-US/docs/Web/API/FileReader#Methods
[3]: https://developer.mozilla.org/en-US/docs/Web/API/FileReader#Event_handlers
[4]: https://docs.angularjs.org/api/ng/directive/ngModel
[5]: directive.js
[6]: https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications
[7]: LICENSE.md

