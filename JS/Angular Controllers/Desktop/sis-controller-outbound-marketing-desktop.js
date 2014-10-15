//Create your namespace
SIS.namespace('SIS.Controllers.OutboundMarketing.Desktop');

//Define your namespace
(function (namespace) {
    namespace.controller = function ($scope, $location) {
        /********************
         * PARENT CONTROLLER
         *********************/
        var _parent = namespace.parent();
        _parent.controller.call(this, $scope, $location);

        var _init = function(){
        };

        $scope.onTablet = SIS.SIS_BROWSER_INFO.tablet;

        _init();
    };
    namespace.controller.$inject = ['$scope', '$location'];
}(SIS.Controllers.OutboundMarketing.Desktop));
