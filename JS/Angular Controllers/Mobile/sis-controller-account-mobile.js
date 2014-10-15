//Create your namespace
SIS.namespace('SIS.Controllers.Account.Mobile').extend(SIS.Controllers.Account);

//Define your namespace
(function(namespace) {
    namespace.controller = function($scope, $routeParams, $location, $timeout) {
        /********************
         * PARENT CONTROLLER
         *********************/
        namespace.parent().controller.call(this, $scope, $routeParams, $location);

        /********************
         * PRIVATE VARS
         *********************/

        /********************
         * PUBLIC VARS
         *********************/

        /********************
         * PRIVATE METHODS
         *********************/

        /********************
         * PUBLIC METHODS
         *********************/

        /********************
         * INIT
         *********************/
    };
    namespace.controller.$inject = ['$scope', '$routeParams', '$location', '$timeout'];
})(SIS.Controllers.Account.Mobile);