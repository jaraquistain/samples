//Create your namespace
SIS.namespace('SIS.Controllers.Account');

//Define your namespace
(function (namespace) {
    namespace.controller = function ($scope, $routeParams, $location) {
        /********************
         * PRIVATE VARS
         *********************/
        $scope.$root.loading = true;
        var _handleUserStateChange = function ($event, currentUserState, showLogin) {
            $scope.isLoggedIn = SIS.Model.UserService.isUserLoggedIn();
            $scope.currentUser = SIS.Model.UserService.getCurrentUser();

            if (!$scope.isLoggedIn) {
                if (showLogin) {
                    SIS.Controllers.Login.redirectToLogin($location, SIS.Controllers.Login.returnChecks.SIS_IS_USER_LOGGED_IN);
                } else {
                    $location.path('/').search('current', null);
                }
            }
        };
        var _init = function () {
            _handleUserStateChange(undefined, undefined, true);

            $scope.$root.loading = false;
        };

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
         * EVENTS & WATCHERS
         *********************/
        $scope.$on(SIS.Model.UserService.EVENT_USER_STATE_CHANGE, _handleUserStateChange);

        /********************
         * INIT
         *********************/
        _init();
    };
})
(SIS.Controllers.Account);