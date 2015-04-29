/**
 * If the browser supports it, find all input[type=file] and attch event
 * listners to automatically load the selected file using FileReader.
 *
 * Caveats:
 * This needs FileReader to work and uses a simple detection test to see if the
 * browser supports it. However it then assumes that the browser is fairly new
 * and has access to some of the other HTML5 APIs. All the modern browsers that
 * do support FileReader also supports these extra APIs but if you need it to
 * work on something exotic, make sure to test it.
 */
if (typeof FileReader !== "undefined") {
  (function() {
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

      // Normal interaction
      input.addEventListener("change", this.onChange.bind(this), false)

      // Drag and Drop
      for (i = 0; i < this.labels.length; ++i) {
        this.labels[i].addEventListener("dragenter", enableDragAndDrop, false)
        this.labels[i].addEventListener("dragover", enableDragAndDrop, false)
        this.labels[i].addEventListener("drop", this.onDrop.bind(this), false)
      }
    }

    Object.defineProperty(AutoFileReader.prototype, "labels", {
      enumerable: true,
      configurable: false,
      get: function getLabels() {
        var input = this.target,
            parent = input,
            labels = input.labels

        // Find the labels for this input in the DOM
        if (typeof labels === "undefined") {
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

        // Remeber this value to save a few cycles
        Object.defineProperty(this, "labels", {
          enumerable: true,
          configurable: false,
          writable: false,
          value: Array.prototype.concat.apply([], labels)
        })
        return this.labels
      }
    })

    AutoFileReader.prototype.dispatcher = function AutoFileReader$dispatcher(file) {
      var input = this.target

      return function dispatchEvent(event) {
        event.relatedTarget = file

        // Dispatch asyncronous to avoid "The event is already being dispatched"
        setTimeout(function dispatchAsync() {
          input.dispatchEvent(event)
        }, 0)
      }
    }

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

    AutoFileReader.prototype.onChange = function AutoFileReader$onChange(event) {
      this.processFiles(event.target.files)
    }

    AutoFileReader.prototype.onDrop = function AutoFileReader$onDrop(event) {
      this.processFiles(event.dataTransfer.files)
      event.preventDefault()
    }

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

    // Attach to FileReader
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
