angular.module("angular-input-file", [])
  .directive("input", function() {
    return {
      restrict: "E",
      require: "?ngModel",
      scope: {
        maxSize: "=?maxSize",
        readFormat: "=?readFormat"
      },
      link: function link(scope, element, attr, ngModel) {
        // This directive should only activate if the element it's attached to is
        // an input[type=file] and it has a ngModel.
        if (!ngModel || attr.type !== "file") return

        function emptyArray(value) {
          return !value || value.length === 0
        }

        function validate(name, files, validator) {
          var validity = emptyArray(files) || files.every(validator)
          ngModel.$setValidity(name, validity)
          return validFiles
        }

        function setViewValue(event) {
          scope.$apply(function setter() {
            ngModel.$setViewValue((event.originalEvent || event).files)
          })
        }

        // Enable automatic file loading
        FileReader.auto(element[0], scope.readFormat)

        // Assume mutiple files to simplify the code

        // Transform `FileList` -> `Array`
        ngModel.$parsers.push(function toArray(files) {
          return Array.prototype.concat.apply([], files)
        })

        // Max size validator
        if (typeof scope.maxSize === "number") {
          ngModel.$parsers.push(function validateAllSizes(files) {
            return validate("maxSize", files, function validateSize(file) {
              return file && file.size <= scope.maxSize
            })
          })
        }

        // Handle multiple/single file(s)
        if (attr.multiple) {
          ngModel.$isEmpty = emptyArray
        } else {
          ngModel.$parsers.push(function toSingle(files) {
            return files && files[0]
          })
        }

        // Attach event listners to FileReader events
        element.on("loadallstart", setViewValue)
        element.on("load", function() {
          scope.$apply()
        })
        element.on("error", function(event) {
          console.error("Error:", event)
        })
      }
    }
  })
