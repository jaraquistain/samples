//Create your namespace
SIS.namespace("SIS.Directives.Validators");

(function (namespace) {
    var PASSWORD_REGEXP = /^.{6,20}$/,
        EMAIL_REGEXP = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i,
        INVALID_CHARS = ['/','\\',':',';','{','}','(',')','<','>','^','=','[',']','|','*'],

        // Best tested URL regex from http://daringfireball.net/2010/07/improved_regex_for_matching_urls
        // URL_REGEXP = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi,
        // Simpler version
        URL_REGEXP = /(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi,
        URL_REGEXP_STRICT = /(https?:\/\/)(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi,

        NAME_REGEXP = new RegExp('^[^\\' + INVALID_CHARS.join('\\') + ']+$');

    namespace.messages = {
        'password':            'Password must be between 6 and 20 characters.',
        'email':               'Not a valid email',
        'match':               'Does not match.',
        'unique':              'This email is already registered on Shocase.',
        'uniqueVerifyError':   'Unable to verify if email is unique. Please try again later',
        'name':                'Name must not contain the following characters: ' + INVALID_CHARS.join(''),
        'nameLength':          'Name must be 40 characters or less.',
        'year':                'Year must be in format YYYY',
        'yearUnder':           'Below the minimum allowable year',
        'charLimit':           'Exceeds maximum allowable characters',
        'siblingExists':       'Required sibling model value does not exist',
        'dateRangeStart':      'Start date is invalid',
        'dateRangeEnd':        'End date is invalid',
        'dateRangeStartMonth': 'Start month must be selected',
        'dateRangeStartYear':  'Start year must be entered',
        'dateRangeEndMonth':   'End month must be selected',
        'dateRangeEndYear':    'End year must be entered',
        'dateRangeOrder':      'End date must be later than start date.',
        'dateRangeFuture':     'Dates in the future are not allowed.',
        'populatedArray':      'Must select at least one',
        'subscribed':          'That user has opted out of recieving this kind of communication',
        'subscribedVerifyError':'Unable to verify. Please try again later.'
    };


    namespace.validationOverride = false;

    namespace.required = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            link:     function ($scope, $element, $attrs, $controller) {
                var validityFunction = function (viewValue) {
                    $controller.$setValidity('required', viewValue && viewValue.trim().length > 0);
                    //viewValue = viewValue === '' ? undefined : viewValue;
                    return viewValue;
                };
                $controller.$parsers.unshift(validityFunction);
                $controller.$formatters.unshift(validityFunction);
            }
        };
    };

    namespace.asset = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            link:     function ($scope, $element, $attrs, $controller) {
                var validityFunction = function (viewValue) {
                    var value = JSON.stringify(viewValue);
                    $controller.$setValidity('asset', !viewValue || (value.indexOf('id') > 0 && value.indexOf('image/temp') === -1));
                    viewValue = viewValue === '' ? undefined : viewValue;
                    return viewValue;
                };
                $controller.$parsers.unshift(validityFunction);
                $controller.$formatters.unshift(validityFunction);
            }
        };
    };
    namespace.populatedArray = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            link:     function ($scope, $element, $attrs, $controller) {
                var validityFunction = function (viewValue) {
                    $controller.$setValidity('required', $.isArray(viewValue) && viewValue.length > 0);
                    viewValue = viewValue === [] ? undefined : viewValue;
                    return viewValue;
                };
                $controller.$parsers.unshift(validityFunction);
                $controller.$formatters.unshift(validityFunction);
            }
        };
    };

    namespace.charLimit = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            link:     function ($scope, $element, $attrs, $controller) {
                var validityFunction = function (viewValue) {
                    $controller.$setValidity('charLimit', !viewValue || viewValue.length <= $scope.charLimit);
                    //viewValue = viewValue === '' ? undefined : viewValue;
                    return viewValue;
                };
                $scope.charLimit = $.isNumeric(parseInt($attrs.validatorCharacterLimit)) ? parseInt($attrs.validatorCharacterLimit) : undefined;
                $controller.$parsers.unshift(validityFunction);
                $controller.$formatters.unshift(validityFunction);
            }
        };
    };

    /**
     * DATE RANGE CRITERIA
     *
     * Jobs:
     * - startMonth and endMonth are optional
     * - startYear and endYear are required
     * - endYear must be after startYear
     * - neither startYear nor endYear can be in the future
     *
     * Education:
     * - startMonth, endMonth, startYear, endYear are optional
     * - endYear must be after startYear
     * - future dates are ok
     **/
    var dateRangeLink = function (monthsOptional, yearsOptional, allowFuture) {
        allowFuture = !!allowFuture;
        return function ($scope, $element, $attrs, $controller) {
            $scope.$watch(function () {
                return {
                    'startMonth': $scope.data.startMonth,
                    'startYear':  $scope.data.startYear,
                    'endMonth':   $scope.data.endMonth,
                    'endYear':    $scope.data.endYear
                };
            }, function (newVal, oldVal) {
                if (newVal === oldVal) {
                    return;
                }

                var startMonth = monthsOptional ? $scope.data.startMonth || 'January' : $scope.data.startMonth,
                    startYear = yearsOptional ? $scope.data.startYear || new Date().getFullYear() : $scope.data.startYear,
                    endMonth = monthsOptional ? $scope.data.endMonth || 'January' : $scope.data.endMonth,
                    endYear = yearsOptional ? $scope.data.endYear || new Date().getFullYear() : $scope.data.endYear,

                    startDateString = startYear && _isYYYY(startYear) ? startYear + '/' + SIS.Utils.getMonthNumber(startMonth) + '/1' : '', // Need day for IE (http://dygraphs.com/date-formats.html)
                    endDateString = endYear && _isYYYY(endYear) ? endYear + '/' + SIS.Utils.getMonthNumber(endMonth) + '/1' : '',

                    currentDate = new Date().getTime(),
                    startDate = startMonth !== 'Present' ? new Date(startDateString).getTime() : currentDate,
                    endDate = endMonth !== 'Present' ? new Date(endDateString).getTime() : currentDate,

                    // Valid date has a valid start/end, end is greater than start
                    startOk = !isNaN(startDate),
                    endOk = !isNaN(endDate),
                    startMonthOk = !!startMonth,
                    startYearOk = !!startYear && _isYYYY(startYear),
                    endMonthOk = !!endMonth,
                    endYearOk = endMonth === 'Present' ? true : (!!endYear && _isYYYY(endYear)),
                    orderOk = endDate >= startDate,
                    futureOk = (!allowFuture ? endDate <= currentDate : true);

                /* Debug
                 console.group('Date Validation');
                 console.log('startMonth', startMonth);
                 console.log('startYear', startYear);
                 console.log('endMonth', endMonth);
                 console.log('endYear', endYear);
                 console.log('startDateString', startDateString);
                 console.log('endDateString', endDateString);
                 console.log('startDate', startDate);
                 console.log('endDate', endDate);
                 console.log('--------');
                 console.log('startOk', startOk);
                 console.log('endOk', endOk);
                 console.log('startMonthOk', startMonthOk);
                 console.log('startYearOk', startYearOk);
                 console.log('endMonthOk', endMonthOk);
                 console.log('endYearOk', endYearOk);
                 console.log('orderOk', orderOk);
                 console.log('futureOk', futureOk);
                 console.groupEnd();
                 */

                $controller.$setValidity('dateRangeStart', startOk);
                $controller.$setValidity('dateRangeEnd', endOk);
                $controller.$setValidity('dateRangeStartMonth', startMonthOk);
                $controller.$setValidity('dateRangeStartYear', startYearOk);
                $controller.$setValidity('dateRangeEndMonth', endMonthOk);
                $controller.$setValidity('dateRangeEndYear', endYearOk);
                $controller.$setValidity('dateRangeOrder', startOk && endOk ? orderOk : true);
                $controller.$setValidity('dateRangeFuture', startOk && endOk ? futureOk : true);
            }, true);
        };
    };
    namespace.dateRangeJob = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            scope:    {
                'data': '=validatorDateRangeJob'
            },
            link:     dateRangeLink(true)
        };
    };
    namespace.dateRangeSchool = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            scope:    {
                'data': '=validatorDateRangeSchool'
            },
            link:     dateRangeLink(true, true, true)
        };
    };

    namespace.name = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            link:     function ($scope, $element, $attrs, $controller) {
                var validityFunction = function (viewValue) {
                    $controller.$setValidity('name', !viewValue || NAME_REGEXP.test(viewValue));
                    $controller.$setValidity('nameLength', !viewValue || viewValue.length <= 40);
                    viewValue = viewValue === '' ? undefined : viewValue;
                    return viewValue;
                };
                $controller.$parsers.unshift(validityFunction);
                $controller.$formatters.unshift(validityFunction);
            }
        };
    };

    var _isYYYY = function (value, min) {
        var pattern = /[1-9][0-9][0-9][0-9]/;
        return pattern.test(value) && $.trim(value).length === 4;
    };
    namespace.yyyy = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            link:     function ($scope, $element, $attrs, $controller) {
                var validityFunction = function (viewValue) {
                    var yearOk = _isYYYY(viewValue);
                    $controller.$setValidity('year', !viewValue || yearOk);
                    $controller.$setValidity('yearUnder', !viewValue || !yearOk || viewValue >= _min);
                    viewValue = viewValue === '' ? undefined : viewValue;
                    return viewValue;
                };

                var _min = parseInt($attrs.validatorYyyy);
                _min = $.isNumeric(_min) ? _min : 0;

                $controller.$parsers.unshift(validityFunction);
                $controller.$formatters.unshift(validityFunction);
            }
        };
    };

    namespace.password = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            link:     function ($scope, $element, $attrs, $controller) {
                var validityFunction = function (viewValue) {
                    var validity = !viewValue || (viewValue && viewValue.length > 5 && PASSWORD_REGEXP.test(viewValue));
                    $controller.$setValidity('password', validity);
                    viewValue = viewValue === '' ? undefined : viewValue;
                    return viewValue;
                };
                $controller.$parsers.unshift(validityFunction);
                $controller.$formatters.unshift(validityFunction);
            }
        };
    };

    namespace.match = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            scope:    {
                'comparate': '=validatorMatch'
            },
            link:     function ($scope, $element, $attrs, $controller) {
                $scope.$watch(function () {
                    var watchValue = $scope.comparate || $controller.$viewValue ? $scope.comparate + '-' + $controller.$viewValue : undefined;
                    return watchValue;
                }, function (newVal, oldVal) {
                    if (newVal === oldVal) return;
                    var match = $controller.$viewValue && $controller.$viewValue === $scope.comparate;
                    $controller.$setValidity('match', match);
                });
            }
        };
    };

    namespace.siblingExists = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            scope:    {
                'sibling': '=validatorSiblingExists'
            },
            link:     function ($scope, $element, $attrs, $controller) {
                $scope.$watch(function () {
                    var watchValue = $scope.sibling || $controller.$viewValue ? $scope.sibling + '-' + $controller.$viewValue : undefined;
                    return watchValue;
                }, function (newVal, oldVal) {
                    if (newVal === oldVal) return;
                    $controller.$setValidity('siblingExists', ($scope.sibling && $scope.sibling.length > 0));
                });
            }
        };
    };

    namespace.email = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            link:     function ($scope, $element, $attrs, $controller) {
                var validityFunction = function (viewValue) {
                    var validity = !viewValue || namespace.testEmail(viewValue);
                    $controller.$setValidity('email', validity);
                    viewValue = viewValue === '' ? undefined : viewValue;
                    return viewValue;
                };
                $controller.$parsers.unshift(validityFunction);
                $controller.$formatters.unshift(validityFunction);
            }
        };
    };

    namespace.uniqueEmail = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            link:     function ($scope, $element, $attrs, $controller) {
                $scope.$watch(function () {
                    return $controller.$viewValue;
                }, function (newVal, oldVal) {
                    if (newVal === oldVal) return;
                    if (EMAIL_REGEXP.test(newVal)) {
                        $controller.$setValidity('email', true);
                        $controller.$setValidity('ajax', false);
                        window.clearTimeout($scope.verifyUniqueTimeout);
                        $scope.verifyUniqueTimeout = window.setTimeout(function () {
                            $controller.$setValidity('ajaxCheck', false);
                            $controller.$setValidity('ajax', true);
                            SIS.Model.ajax({
                                'scope':       $scope,
                                'type':        'GET',
                                'relativeURL': '/validate/email?value=' + newVal,
                                'success':     function (response, status, xhr) {
                                    $controller.$setValidity('unique', !response.exists);
                                },
                                'error':       function (xhr, status, response) {
                                    $('#alert').alert('show', 'error', 'Could not validate email, please try again later.');
                                    //$controller.$setValidity('unique', false);
                                    $controller.$setValidity('uniqueVerifyError', false);
                                },
                                'complete':    function (xhr, status) {
                                    $controller.$setValidity('ajaxCheck', true);
                                }
                            });
                        }, 300);
                    } else {
                        $controller.$setValidity('email', false);
                    }
                });
            }
        };

    };

    namespace.subscribed = function () {
        return {
            restrict: 'A',
            require:  'ngModel',
            link:     function ($scope, $element, $attrs, $controller) {
                $scope.$watch(function () {
                    return $controller.$viewValue;
                }, function (newVal, oldVal) {
                    if (newVal === oldVal) return;
                    $controller.$setValidity('ajax', false);
                    window.clearTimeout($scope.verifySubscribedTimeout);
                    $scope.verifySubscribedTimeout = window.setTimeout(function () {
                        $controller.$setValidity('ajaxCheck', false);
                        $controller.$setValidity('ajax', true);
                        SIS.Model.ajax({
                            'scope':       $scope,
                            'type':        'GET',
                            'relativeURL': '/unsubscribe/check?id=' + newVal + '&emailType=' + $attrs.validatorSubscribed,
                            'success':     function (response, status, xhr) {
                                $controller.$setValidity('subscribed', !response.onUnsubscribeList);
                            },
                            'error':       function (xhr, status, response) {
                                $('#alert').alert('show', 'error', 'Could not verify subscription, please try again later.');
                                $controller.$setValidity('subscribeVerifyError', false);
                            },
                            'complete':    function (xhr, status) {
                                $controller.$setValidity('ajaxCheck', true);
                            }
                        });
                    }, 300);
                });
            }
        };

    };

    //UTIL FUNCTIONS
    namespace.testEmail = function (input) {
        return EMAIL_REGEXP.test(input);
    };

    namespace.testURL = function (input, isStrict) {
        return (isStrict ? URL_REGEXP_STRICT : URL_REGEXP).test(input);
    };

    namespace.extractURL = function (input, isStrict) {
        return input.match(isStrict ? URL_REGEXP_STRICT : URL_REGEXP);
    };

    namespace.getURLRegexp = function (isStrict) {
        return isStrict ? URL_REGEXP_STRICT : URL_REGEXP;
    }
})(SIS.Directives.Validators);