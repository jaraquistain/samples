//Create your namespace
SIS.namespace("SIS.Directives.MultiSelect");

//Define your namespace
(function (namespace) {
    namespace.directive = function ($timeout) {
        return {
            scope:    {
                'data':               '=sisMultiSelect',
                'numberOfSelections': '=sisMultiSelectNumber',
                'tabIndex':           '=sisMultiSelectTabindex'
            },
            template: $('#sis-directive-multi-select-template').html(),
            link:     function ($scope, $element, $attrs) {
                /********************
                 * PRIVATE METHODS
                 *********************/

                var _init = function () {
                    $scope.numberOfSelections = $scope.numberOfSelections || 3;
                    $scope.required = $attrs.required !== undefined;
                    $scope.data.length = $scope.data.length <= $scope.numberOfSelections ? $scope.data : $scope.data.slice(0,$scope.numberOfSelections);
                    $scope.autocompleteProxy = $attrs.sisMultiSelectAutocompleteProxy || undefined;
                };

                var _modified = function () {
                    $scope.multiSelectForm.multiSelect.$setViewValue($scope.data);
                    $scope.$emit(SIS.BROADCAST_EVENTS.TAGS_MODIFIED);
                };

                var _handleKeyPress = function(e) {
                    switch (e.keyCode) {
                        case _keys.backspace:
                            if (!$scope.dataText && $scope.data.length) {
                                $scope.highlightedIndex > -1 && $scope.removeSelection($scope.highlightedIndex);
                                $scope.highlightedIndex = $scope.data.length ? $scope.highlightedIndex > 0 ? $scope.highlightedIndex - 1 : $scope.data.length - 1 : undefined;
                            }
                            break;
                        case _keys.left:
                            if (!$scope.dataText && $scope.data.length) {
                                $scope.highlightedIndex = $scope.data.length ? $scope.highlightedIndex > 0 ? $scope.highlightedIndex - 1 : $scope.data.length - 1 : undefined;                            }
                            break;
                        case _keys.right:
                            $scope.highlightedIndex = $scope.highlightedIndex < $scope.data.length - 1 ? $scope.highlightedIndex + 1 : undefined;
                            break;
                        case _keys.enter:
                            console.log('enter key pressed');
                        default:
                            $scope.highlightedIndex = undefined;
                            break;
                    }
                };

                /********************
                 * PUBLIC METHODS
                 *********************/
                $scope.addSelection = function (item, value, $element) {
                    item.text.length && ($scope.data.length < $scope.numberOfSelections) && $scope.data.push(item.text);
                    $scope.dataText = '';
                    _modified();
                };

                $scope.getTypes = function (value, callback) {
                    var processItems = function (pType, addedPType, removeIndices) {
                        if (pType.text === addedPType) {
                            pType.disabled = true;
                            pType['class'] = 'sis-icon-tick-after'; // Not using dot notation because Class is a reserved word

                            // If the item is cached, remove it as it is not
                            if (pType.cached) {
                                pType.disabled = false;
                                pType['class'] = '';
                                removeIndices[i] = true;
                            }
                        }
                    };

                    SIS.Model.Autocomplete.getItems({
                        'value':    value,
                        'type':     'types',
                        'callback': function (filteredData) {
                            var removeIndices = {}, output = [];

                            filteredData && filteredData.length && filteredData.forEach(function (pType, i) {
                                $scope.data = $scope.data || [];
                                $scope.data.forEach(function (addedPType) {
                                    processItems(pType, addedPType, removeIndices);
                                });
                            });

                            // Only add the item to the output if it should not be removed
                            for (var i = 0; i < filteredData.length; i++) {
                                !removeIndices[i] && output.push(filteredData[i]);
                            }

                            // If the user segment is 'all' we can just return all the project types
                            if (SIS.Model.PersonalizeBrowsingService.getBrowsingSegmentLocal() === 'all') {
                                SIS.Utils.call(callback, undefined, output);
                            }
                            else {
                                // If the user segment is not 'all' we need to get the list of
                                // the project types of the user segment and make a new
                                // list by removing the project types of the user segment
                                // from the master list and concatenating this to the list itself
                                SIS.Model.PersonalizeBrowsingService.getBrowsingProjectTypes(function (projectTypes) {
                                    var removeIndices = {},
                                        newOutput = []
                                        sortAlpha = function (a, b) {
                                            if (a.text > b.text) {return 1;}
                                            else if (a.text < b.text) {return -1;}
                                            else {return 0;}
                                        };

                                    projectTypes && projectTypes.length && projectTypes.forEach(function (pType, i) {
                                        $scope.data = $scope.data || [];
                                        $scope.data.forEach(function (addedPType) {
                                            processItems(pType, addedPType, removeIndices);
                                        });
                                    });

                                    // Create the array of suggested project types
                                    output.forEach(function (outputType, i) {
                                        var isInOutput = false;
                                        projectTypes && projectTypes.forEach(function (projectType) {
                                            if (projectType.text === outputType.text) {
                                                isInOutput = true;
                                            }
                                        });
                                        !isInOutput && !removeIndices[i] && newOutput.push(outputType);
                                    });

                                    // Sort alpha
                                    newOutput.sort(sortAlpha);

                                    // Prepend the 'other' project types title header to the list
                                    newOutput && newOutput.length && newOutput.unshift({
                                        'text': 'Other',
                                        'disabled': true,
                                        'itemTitle': true,
                                        'class': 'sis-autocomplete-item-title'
                                    });


                                    if (projectTypes && projectTypes.length) {
                                        // Sort alpha
                                        projectTypes.sort(sortAlpha);

                                        // Prepend the 'suggested' project types title header to the list
                                        projectTypes.unshift({
                                            'text': 'Suggested Project Types',
                                            'itemTitle': true,
                                            'disabled': true,
                                            'class': 'sis-autocomplete-item-title'
                                        });
                                    }

                                    // Combine the arrays
                                    if (newOutput && projectTypes) {
                                        newOutput = projectTypes.concat(newOutput);
                                    }
                                    SIS.Utils.call(callback, undefined, newOutput);
                                });
                            }
                        }
                    });
                };

                $scope.removeSelection = function (index) {
                    $scope.data.splice(index, 1);
                    _$input.focus();
                    _modified();
                };

                $scope.openTypeList = function () {
                    $scope.$broadcast(SIS.BROADCAST_EVENTS.AUTOCOMPLETE_GET_RESULTS);
                };
                /********************
                 * PUBLIC VARIABLES
                 *********************/
                $scope.data = $scope.data || [];
                $scope.numberOfSelections = $scope.numberOfSelections || 3;
                $scope.required = $attrs.required !== undefined;

                /********************
                 * PRIVATE VARIABLES
                 *********************/
                var _$input = $element.find('input[type="text"]'),
                    _keys = SIS.Utils.getKeyMap();
                /********************
                 * EVENTS AND WATCHERS
                 *********************/
                $element.on('keydown', _handleKeyPress);
                $element.find('input[type="text"]').on('blur', function(){$scope.highlightedIndex = undefined});

                /********************
                 * INIT
                 *********************/
                var unwatch = $scope.$watch('data', function(n){
                    n && unwatch();
                    n && _init();
                });
            }
        };
    };
    namespace.directive.$inject = ['$timeout'];
})(SIS.Directives.MultiSelect);
