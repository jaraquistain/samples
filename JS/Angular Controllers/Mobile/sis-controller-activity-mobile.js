SIS.namespace("SIS.Controllers.Activity.Mobile").extend(SIS.Controllers.Activity);
(function (namespace) {
    namespace.controller = function ($scope, $location, $timeout, $alert) {
        /********************
         * PARENT CONTROLLER INIT
         *********************/
        SIS.Utils.call(namespace.parent().controller, undefined, $scope, $location, $timeout, $alert);

        /********************
         * PRIVATE VARS
         *********************/

        /********************
         * PUBLIC VARS
         *********************/

        /********************
         * PRIVATE METHODS
         *********************/
        var _init = function () {
            namespace.parent().init();
        };

        /********************
         * PUBLIC METHODS
         *********************/

        /******************************
         * EVENT HANDLERS AND WATCHERS
         ******************************/

        /******************************
         * INIT
         ******************************/
        _init();
    };

    namespace.controller.$inject = ['$scope', '$location', '$timeout', '$alert'];
})(SIS.Controllers.Activity.Mobile);
