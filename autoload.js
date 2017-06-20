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
if (typeof FileReader === "function") (function() {
  "use strict"

  // --- Begin Definitions ---

  var HIDDEN_FIELD_SYMBOL = Symbol("@@autoFileReader")

  /**
   * AutoFileReader represents the infrastructure to automatically read files
   * using native FileReader objects.
   *
   * @constructor
   * @param {HTMLInputElement} input element to attach to
   * @param {String = FileReader.format} format to read as
   */
  function AutoFileReader(input, format) {
    var i, maxSize = input.getAttribute("data-max-size")

    this.target = input
    this.format = "readAs" + (format || FileReader.format)

    if (maxSize) {
      this.maxSize = _parseSize.apply(void 0, maxSize.split(" "))
    } else {
      this.maxSize = _parseSize(10, "MiB")
    }

    Object.defineProperty(input, HIDDEN_FIELD_SYMBOL, {
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

  /**
   * Parse and calculate the provided file size with the provided multipler.
   *
   * The provided multipler must be one of "B", "KB", "KiB", "MB", "MiB", "GB"
   * or "GiB". The return value is the file size in plain bytes.
   *
   * @param {Number|String} size in the provided format
   * @param {String = "B"} multipler for the provided size
   *
   * @return {Number} of bytes for the provided size and multipler
   */
  function _parseSize(size, multipler) {
    size = parseInt(size, 10)
    multipler = _parseSize.multiplers[multipler] || _parseSize.multiplers.B

    // Ensure size is not `NaN`
    if (size !== size)  {
      throw new TypeError("max-size is not a number")
    }

    return parseInt(size, 10) * multipler
  }

  _parseSize.multiplers = {
    1000: ["B", "KB", "MB", "GB"],
    1024: ["B", "KiB", "MiB", "GiB"]
  }

  // Turns the above object into a lookup table for multiplers.
  _parseSize.multiplers = Object.keys(_parseSize.multiplers)
    .reduce(function calculate(result, base) {
      var power, names = _parseSize.multiplers[base]

      for (power = 0; power < names.length; ++power) {
        result[names[power]] = Math.pow(base, power)
      }

      return result
    }, {})

  /**
   * Formats the provided size, in bytes, to be human readable.
   *
   * Essentially the reverse of _parseSize.
   *
   * @param {Number} size in bytes
   * @return {[Number, String]} [size, multipler]
   */
  function _humanSize(size) {
    var i, name

    for (i = 0; i < _humanSize.multiplers.length; ++i) {
      name = _humanSize.multiplers[i]
      if (_parseSize.multiplers[name] < size) {
        break
      }
    }

    // Basic rounding, will have errors but that's fine for this function
    return [Math.round(100 * size / _parseSize.multiplers[name]) / 100, name]
  }

  _humanSize.multiplers = ["GiB", "MiB", "KiB", "B"]

  _defineLazyProperty(AutoFileReader.prototype, "labels", {
    enumerable: true,
    configurable: false,
    get: function getLabels() {
      var parent,
          input = this.target,
          labels = input.labels

      // Find the labels for this input in the DOM
      if (labels == null) {
        if (input.id) {
          labels =  Array.prototype.concat.apply(
            [], document.querySelectorAll("label[for=" + input.id + "]")
          )
        } else {
          labels = []
        }

        for (parent = input; parent != null; parent = parent.parentElement) {
          if (parent instanceof HTMLLabelElement) {
            if (labels.indexOf(parent) === -1) {
              labels.push(parent)
            }
            break
          }
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
    var dispatchEvent = this.target.dispatchEvent.bind(this.target)

    /**
     * @callback dispatchEventAsync
     * @param {Event} event to dispatch asyncronously
     */
    return function dispatchEventAsync(event) {
      event.relatedTarget = file

      // Dispatch asyncronous to avoid "The event is already being dispatched"
      setTimeout(dispatchEvent, 0, event)
    }
  }

  /**
   * Read the provided file using a FileReader and pipe the readers events to
   * the input element this is attached to.
   *
   * @param {File} file to read
   */
  AutoFileReader.prototype.read = function AutoFileReader$read(file) {
    var dispatchEvent = this.dispatcher(file)

    if (file.size < this.maxSize) {
      file.reader = new FileReader()

      // Pipe events from the Filereader to this input element, but use the
      // "on<event>" attributes to avoid memory leaks.
      for (name in file.reader) {
        if (name.slice(0, 2) === "on") {
          file.reader[name] = dispatchEvent
        }
      }

      // Start reading
      file.reader[this.format](file)
    } else {
      console.warn("File exceeds max-size:",
                   _humanSize(file.size), ">", _humanSize(this.maxSize))

      // Create a dummy reader to work around read only properties.
      file.reader = Object.create(FileReader.prototype, {
        readyState: { value: FileReader.done },
        result: { value: null },
        error: { value: new RangeError("File exceeds max-size") }
      })
      file.reader.error.max = this.maxSize

      // Bind event handling to this input element
      file.reader.dispatchEvent = dispatchEvent
      file.reader.addEventListener = this.target.addEventListener.bind(this.target)
      file.reader.removeEventListener = this.target.removeEventListener.bind(this.target)

      _dispatchCustomEvent.call(file.reader, "error", file.reader.error)
    }
  }

  /**
   * Create and dispatch a CustomEvent with the provided name and details to
   * the EventTarget bound to this function.
   *
   * @this {EventTarget} to dispatch the event to
   * @param {String} name of the event
   * @param {*} details for the event
   */
  function _dispatchCustomEvent(name, details) {
      var event = document.createEvent("CustomEvent")
      event.initCustomEvent(name, false, false, details)
      this.dispatchEvent(event)
  }

  /**
   * Callback for _change_ events from the input element this is attached to.
   *
   * @callback onChange
   * @param {Event} event
   */
  AutoFileReader.prototype.onChange = function AutoFileReader$onChange(event) {
    if (event.target.disabled) return
    this.processFiles(event.target.files)
  }

  /**
   * Callback for _drop_ events from the input element this is attached to.
   *
   * @callback onDrop
   * @param {Event} event
   */
  AutoFileReader.prototype.onDrop = function AutoFileReader$onDrop(event) {
    event.preventDefault()
    if (event.target.control.disabled) return
    event.target.control.files = event.dataTransfer.files
    this.processFiles(event.dataTransfer.files)
  }

  /**
   * Read all the provided files and fire the corresponding events.
   *
   * @param {FileList} files to start reading
   */
  AutoFileReader.prototype.processFiles = function AutoFileReader$processFiles(files) {
    var i, dispatchEvent = _dispatchCustomEvent.bind(this.target)

    // Fail fast, since this is most likely a programmer error
    if (typeof FileReader.prototype[this.format] !== "function") {
      throw new TypeError('FileReader cannot read as "'+ this.format +'"')
    }

    // Start reading all the files
    for (i = 0; i < files.length; ++i) {
      this.read(files[i])
    }

    dispatchEvent("loadstart-all", files)
    return Promise.all(Array.prototype.map.call(files, _fileToPromise))
      .then(function allLoaded() {
        dispatchEvent("load-all", files)
        dispatchEvent("loadend-all", files)
      }, function failure(reason) {
        dispatchEvent("loadend-all", files)
        return Promise.reject(reason)
      })
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
        events = Object.create(null),
        promise = new Promise(function resolver(resolve, reject) {
          events.abort = reject
          events.error = reject
          events.load = resolve
        })

    for (name in events) {
      file.reader.addEventListener(name, events[name], false)
    }

    function removeAllListeners() {
      for (var name in events) {
        file.reader.removeEventListener(name, events[name], false)
      }
    }

    // Make sure to always remove all event listners.
    return promise.then(
      removeAllListeners,
      function failure(reason) {
        removeAllListeners()
        return Promise.reject(reason)
      })
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

  if (typeof ErrorStackParser === "object") {
    _defineLazyProperty(Error.prototype, "__stackFrame", {
      get: function getStackFrame() {
        return ErrorStackParser.parse(this)[0]
      }
    })

    Object.defineProperties(Error.prototype, [
      "fileName", "lineNumber", "columnNumber"
    ].filter(Object.prototype.hasOwnProperty.bind(Error.prototype))
    .reduce(function toGetter(descriptors, name) {
      descriptors[name] = { get: function getter() {
        return this.__stackFrame[name]
      }}
      return descriptors
    }, {}))
  }

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
    if (!(input instanceof HTMLInputElement)) {
      throw new TypeError(String(input) + " is not a HTMLInputElement")
    }

    return input[HIDDEN_FIELD_SYMBOL] || new AutoFileReader(input, format)
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
