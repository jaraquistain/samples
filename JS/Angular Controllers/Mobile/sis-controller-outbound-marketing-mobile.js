//Create your namespace
SIS.namespace('SIS.Controllers.OutboundMarketing.Mobile');

//Define your namespace
(function (namespace) {
    namespace.controller = function ($scope, $location) {
        /********************
         * PARENT CONTROLLER
         *********************/
        var _parent = namespace.parent();
        _parent.controller.call(this, $scope, $location);

        var _init = function(){
            console.log('outbound marketing mobile controller initted');
            $scope.$root.loading = false;
        };

        _init();
    };
    namespace.controller.$inject = ['$scope', '$location'];
}(SIS.Controllers.OutboundMarketing.Mobile));