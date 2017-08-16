angular.module("angular-input-file", [])
  .directive("input", function() {
    return {
      restrict: "E",
      require: "?ngModel",
      /* Can't use isolated scope, because ngModel already has done so.
      scope: {
        maxSize: "@?maxSize",
        readFormat: "=?readFormat"
      },
      */
      link: function link(scope, element, attr, ngModel) {
        // This directive should only activate if the element it's attached to
        // is an input[type=file] and it has a ngModel.
        if (!ngModel || attr.type !== "file") return

        // Enable automatic file loading
        FileReader.auto(element[0], attr.readFormat)

        // In order to simplify the code, assume multiple files and handle the
        // single file case further down.

        // Transform the Array-like `FileList` into a builtin `Array`
        ngModel.$parsers.push(function toArray(files) {
          return Array.prototype.concat.apply([], files)
        })

        // Check for any errors, such as max size exceeded
        ngModel.$parsers.push(function validate(files) {
          var i, error, name

          for (i = 0; i < files.length; ++i) {
            error = files[i].reader.error
            if (error instanceof Error) {
              name = error.constructor.name.replace(/Error$/, "")
              name = name[0].toLowerCase() + name.slice(1)
              ngModel.$setValidity(name, false)
            }
          }

          return files
        })

        // Handle multiple/single file(s)
        if (attr.multiple) {
          ngModel.$isEmpty = function isEmptyArray(value) {
            return !value || value.length === 0
          }

        } else {
          ngModel.$parsers.push(function toSingle(files) {
            return files && files[0]
          })
        }

        // Set the ngModel value early to make sure Angulars $dirty is correct.
        // This event fires just before the file(s) starts to be read.
        element.on("loadstart-all", function setViewValue(event) {
          // Clear any left over errors
          var i, errors = Object.keys(ngModel.$error)
          for (i = 0; i < errors.length; ++i) {
            ngModel.$setValidity(errors[i], true)
          }

          scope.$apply(function setter() {
            ngModel.$setViewValue((event.originalEvent || event).detail)
          })
        })

        // Update Angular every time a file is done reading. This event is for
        // both success and failure.
        element.on("loadend", scope.$apply.bind(scope))
      }
    }
  })
