# Better `input[type=file]`
Upgrade your file inputs to automatically read their selected file(s) in the
background. Just include the [autoload.js][1] file in your project and you are
good to go.

## Automatic attachement
The [autoload.js][1] will once the DOM is ready find all `input[type=file]` and
attach the needed infrastructure for it to automatically read the file(s) that
the user has chosen. This can be either from the `input[type=file]` or dragged
and dropped onto one of its labels.

Every time this happens it creates a new `FileReader` for each `File` chosen and
starts the reading. Access to this `FileReader` is provided through a new
property `reader` on the corresponding `File`.

If you insert any `input[type=file]` dynamically and want to enable automatic
reading, make sure to call `FileReader.auto` on those elements. It is safe to
call it multiple times on the same element. It remembers if it already has been
enabled.

## Public API
In order to avoid polluting the global namespace [autoload.js][1] adds its
public API to the native `FileReader` class as static methods.

### `FileReader.format`
This specifies the default format for automatic file reading. This is the part
after `readAs` on all `FileReader` instances. The default value is `DataURL`,
see MDN for the [full list][2].

### `FileReader.auto(HTMLInputElement input, string format = FileReader.format)`
This enables automatic file reading for the provided element in the provided
format. The latter defaults to `FileReader.format`, see above.

## Events
All [events][3] from the native `FileReader` are broadcasted onto the
`input[type=file]` element that [autoload.js][1] is attached to. These all have
the `event.relatedTarget` set to the `File` object corresponding to the
`FileReader` that originated the event.

This is useful when you have the _multiple_ attribute set, since you then will
receive events from more then one `FileReader` object.

To make it easier to handle multiple files, and to support drag'n'drop, it
fires a few extra events. These are `CustomEvent` and have their `detail`
property set to the `FileList` for the files chosen by the user.

### _load-all_
This event is triggered after the automatic reading completed successfully for
all files.

### _loadstart-all_
This event is triggered as the automatic reading is started.

### _loadend-all_
This event is triggered after the automatic reading is completed for all files.
This is independent if the reading was successful or failed.

## AngularJS
This also includes a small AngularJS directive that listens on the above events
and properly integrates with [ngModel][4] so you can just use it as any other
input field. Include the [directive.js][5] and inject "angular-file-input" into
your application.

## Dependcies
For the vanilla JavaScript version, it requires the [File API][6] and a fairly
modern browser. Make sure you test it on all platforms you need to support.

## Drag'N'Drop
Because of the way drag'n'drop works, you can't rely on the `files` property on
the `input[type]` element for the list of files the user has chosen. Instead
listen for one of the above custom events which unifies this for you.

## License
This code is licensed under MIT, see the [LICENSE.md][7] file for details.

[1]: autoload.js
[2]: https://developer.mozilla.org/en-US/docs/Web/API/FileReader#Methods
[3]: https://developer.mozilla.org/en-US/docs/Web/API/FileReader#Event_handlers
[4]: https://docs.angularjs.org/api/ng/directive/ngModel
[5]: directive.js
[6]: https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications
[7]: LICENSE.md

