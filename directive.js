angular.module("angular-input-file", [])
  .directive("input", function() {
    return {
      restrict: "E",
      require: "?ngModel",
      scope: {},
      link: function link(scope, element, attr, ngModel) {
        var handler

        // This directive should only activate if the element it's attached to is
        // an input[type=file] and it has a ngModel.
        if (!ngModel || attr.type !== "file") return

        // Enable automatic file loading
        FileReader.auto(element[0], "DataURL")

        // Make sure we set the pristine flag at link time
        ngModel.$setPristine()

        if (attr.multiple) {
          ngModel.$isEmpty = function(value) {
            return !value || value.length === 0
          }

          handler = function handleMultiple(event) {
            var files = (event.originalEvent || event).files
            ngModel.$setViewValue(Array.prototype.concat.apply([], files))
          }
        } else {
          handler = function handleSingle(event) {
            var file = (event.originalEvent || event).files[0]
            ngModel.$setViewValue(file)
          }
        }

        // Attach event listners to FileReader events
        element.on("loadallstart", handler)
        element.on("loadall", function loadall(event) {
          // Since event.file(s) is the same object/array as in "loadallstart"
          // we need to make sure to update Angular
          scope.$apply()
        })
      }
    }
  })
