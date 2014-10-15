//Create your namespace
SIS.namespace("SIS.Directives.ScrollingList");

//Define your namespace
(function (namespace) {
    namespace.directive = function ($timeout) {
        return {
            scope: {
                'data':      '=sisScrollingList',
                'threshold': '@sisScrollingListThreshold'
            },
            link:  function ($scope, $element, $attrs) {
                /********************
                 * PRIVATE METHODS
                 *********************/
                var _scrollDistance;
                var _init = function () {
                    $scope.threshold = !isNaN(parseInt($scope.threshold, 10)) ? parseInt($scope.threshold, 10): 0;
                };

                $scope.el = $element;
                var _handleScroll = function (e) {
                    var distanceRemaining = $element[0].scrollHeight - $element.outerHeight() - $element.scrollTop();
                    distanceRemaining <= $scope.threshold && $scope.data.hasMore && $timeout($scope.data.nextPage);
                };

                /********************
                 * PUBLIC METHODS
                 *********************/

                /********************
                 * PUBLIC VARIABLES
                 *********************/

                /********************
                 * PRIVATE VARIABLES
                 *********************/

                /********************
                 * EVENTS AND WATCHERS
                 *********************/
                $element.on('scroll', _handleScroll);

                /********************
                 * INIT
                 *********************/
                $timeout(_init);

            }
        };
    };
    namespace.directive.$inject = ['$timeout'];
})(SIS.Directives.ScrollingList);
