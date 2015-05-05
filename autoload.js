/**
 * If the browser supports it, find all input[type=file] and attch event
 * listners to automatically load the selected file(s) using FileReader(s).
 *
 * Since the above is run only once when the DOM is ready, it won't pick up any
 * dynamically added input elements. For those situations this adds new static
 * method `FileReader.auto` which takes an input element and enables the above.
 * It is safe to call `FileReader.auto` multiple times on the same element, as
 * it remembers if it already has been called with that element.
 */
if (typeof FileReader === "function") {
  (function() {
    "use strict"

    // --- Begin Definitions ---

    /**
     * AutoFileReader represents the infrastructure to automatically read files
     * using native FileReader objects.
     *
     * @constructor
     * @param {HTMLInputElement} input element to attach to
     * @param {String = FileReader.format} format to read as
     */
    function AutoFileReader(input, format) {
      var i

      this.target = input
      this.format = "readAs" + (format || FileReader.format)
      Object.defineProperty(input, "__autoFileReader", {
        enumerable: false,
        configurable: false,
        writable: false,
        value: this
      })

      // Enable automatic reading when this input changes
      input.addEventListener("change", this.onChange.bind(this), false)

      // Enable Drag'N'Drop on all of this inputs labels
      for (i = 0; i < this.labels.length; ++i) {
        this.labels[i].addEventListener("dragenter", enableDragAndDrop, false)
        this.labels[i].addEventListener("dragover", enableDragAndDrop, false)
        this.labels[i].addEventListener("drop", this.onDrop.bind(this), false)
      }
    }

    _defineLazyProperty(AutoFileReader.prototype, "labels", {
      enumerable: true,
      configurable: false,
      get: function getLabels() {
        var input = this.target,
            parent = input,
            labels = input.labels

        // Find the labels for this input in the DOM
        if (labels == null) {
          if (input.id) {
            labels = document.querySelectorAll("label[for=" + input.id + "]")
          }

          while (parent !== null) {
            if (parent instanceof HTMLLabelElement) {
              if (Array.prototype.indexOf.call(labels, parent) === -1) {
                labels = Array.prototype.concat.apply([parent], labels)
              }
              break
            }
            parent = parent.parentElement
          }
        }

        return Array.prototype.concat.apply([], labels)
      }
    })

    /**
     * Define a lazily evaluated memonized property on the provided object with
     * the provided key using the provided property descriptor.
     *
     * It has the same parameters as `Object.defineProperty`.
     *
     * @param {Object} object
     * @param {String} key
     * @param {Object} descriptor
     */
    function _defineLazyProperty(object, key, descriptor) {
      var getter = descriptor.get,
          writable = descriptor.writeable || false

      delete descriptor.writeable
      descriptor.get = function init() {
        delete descriptor.get
        delete descriptor.set
        descriptor.value = getter.call(this)
        descriptor.writeable = writable
        Object.defineProperty(this, key, descriptor)
        return descriptor.value
      }
      Object.defineProperty(object, key, descriptor)
    }

    /**
     * Creates and returns a dispatcher function bound to the input element
     * this is attached to.
     *
     * @param {File} file to set as relatedTarget on the dispatached event
     * @return {dispatchEventAsync} dispatcher function
     */
    AutoFileReader.prototype.dispatcher = function AutoFileReader$dispatcher(file) {
      var input = this.target

      /**
       * @callback dispatchEventAsync
       * @param {Event} event to dispatch asyncronously
       */
      return function dispatchEventAsync(event) {
        event.relatedTarget = file

        // Dispatch asyncronous to avoid "The event is already being dispatched"
        setTimeout(function dispatchAsync() {
          input.dispatchEvent(event)
        }, 0)
      }
    }

    /**
     * Read the provided file using a FileReader and pipe the readers events to
     * the input element this is attached to.
     *
     * @param {File} file to read
     */
    AutoFileReader.prototype.read = function AutoFileReader$read(file) {
      var reader = file.reader = new FileReader(),
          dispatchEvent = this.dispatcher(file)

      reader.onabort = dispatchEvent
      reader.onerror = dispatchEvent
      reader.onload = dispatchEvent
      reader.onloadstart = dispatchEvent
      reader.onloadend = dispatchEvent
      reader.onprogress = dispatchEvent

      reader[this.format](file)

      if (file.size > 10 * Math.pow(1024, 2)) {
        console.warn("File size to large for auto load", file.size, "> 10 MiB")
        reader.abort("size to large")
      }
    }

    /**
     * Callback for _change_ events from the input element this is attached to.
     *
     * @callback onChange
     * @param {Event} event
     */
    AutoFileReader.prototype.onChange = function AutoFileReader$onChange(event) {
      this.processFiles(event.target.files)
    }

    /**
     * Callback for _drop_ events from the input element this is attached to.
     *
     * @callback onDrop
     * @param {Event} event
     */
    AutoFileReader.prototype.onDrop = function AutoFileReader$onDrop(event) {
      this.processFiles(event.dataTransfer.files)
      event.preventDefault()
    }

    /**
     * Read all the provided files and fire the corresponding events.
     *
     * @param {FileList} files to start reading
     */
    AutoFileReader.prototype.processFiles = function AutoFileReader$processFiles(files) {
      var i, input = this.target

      // Fail fast, since this is most likely a programmer error
      if (typeof FileReader.prototype[this.format] !== "function") {
        throw new TypeError('FileReader cannot read as "'+ this.format +'"')
      }

      // Notify listeners that we have started
      input.dispatchEvent(_createEvent("loadallstart", files))

      // Start reading all the files
      for (i = 0; i < files.length; ++i) {
        this.read(files[i])
      }

      return Promise.all(Array.prototype.map.call(files, _fileToPromise))
        .then(function allLoaded() {
          input.dispatchEvent(_createEvent("loadall", files))
        })
    }

    function _createEvent(name, files) {
        var event = document.createEvent("Event")
        event.initEvent(name, false, false)
        event.files = files
        return event
    }

    /**
     * Listen on the provided files' readers' events and return a Promise that
     * acts accordingly.
     *
     * @param {File} file whose reader will listened on
     * @return {Promise} for the completion of the reading
     */
    function _fileToPromise(file) {
      var name,
          events = {},
          promise = new Promise(function resolver(resolve, reject) {
            events.abort = reject
            events.error = reject
            events.load = resolve
          })

      for (name in events) {
        file.reader.addEventListener(name, events[name], false)
      }

      function removeAllListners() {
        for (var name in events) {
          file.reader.removeEventListener(name, events[name], false)
        }
      }

      // Make sure to always remove all event listners.
      return promise.then(removeAllListners, removeAllListners)
    }

    /**
     * To trigger Drag'n'Drop behaviour on an element, it has to call
     * `event.preventDefault` on `dragenter`/`dragover`
     *
     * @param {Event} event
     */
    function enableDragAndDrop(event) {
      event.stopPropagation()
      event.preventDefault()
    }

    // --- End Definitions ---

    /**
     * Attach the needed infrastructure for automatic reading on the provided
     * input element in the provided format.
     *
     * This is safe to call multiple times on the same input element. It will
     * remember if it already has been called.
     *
     * @param {HTMLInputElement} input element to attach to
     * @param {String} format to read the file as
     * @return {AutoFileReader}
     */
    FileReader.auto = function FileReader_auto(input, format) {
      return input.__autoFileReader || new AutoFileReader(input, format)
    }

    if (typeof FileReader.format === "undefined") {
      FileReader.format = "DataURL"
    }

    // Run automatically when the DOM is ready
    document.addEventListener("DOMContentLoaded", function autoAttach() {
      document.removeEventListener("DOMContentLoaded", autoAttach)
      var i, inputs = document.querySelectorAll("input[type=file]")

      for (i = 0; i < inputs.length; ++i) {
        FileReader.auto(inputs[i])
      }
    })
  })()
}
