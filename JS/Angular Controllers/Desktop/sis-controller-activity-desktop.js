SIS.namespace("SIS.Controllers.Activity.Desktop").extend(SIS.Controllers.Activity);
(function (namespace) {
    namespace.controller = function ($scope, $location, $timeout, $modal, $alert, $BSModal) {

        /********************
         * PARENT CONTROLLER INIT
         *********************/
        SIS.Utils.call(namespace.parent().controller, undefined, $scope, $location, $timeout, $alert, $BSModal);

        /********************
         * PRIVATE VARS
         *********************/
        var _onLocationChangeStart = function (e, next) {
            if ($scope.shareText || $scope.shareUrlPreview) {
                var nextPathMatch = next.match(/#([\/\w-]*)/),
                    nextPath = nextPathMatch ? nextPathMatch[1] : '/',
                    nextSearch = $location.search(),
                    message = "Your post has not been shared yet. Are you sure you want to continue?";

                if (nextSearch && nextSearch.isNewProject) {
                    // Don't show the modal if we are redirecting to the newly created project, just move on
                } else {
                    e.preventDefault();
                    $scope.modal = $modal($scope, {
                        template: '<div class="sis-unsaved-changes-text">' + message + '</div>',
                        title:    "Unshared Post",
                        buttons:  [
                            {
                                'text':  'YES',
                                'class': 'sis-button-primary',
                                'click': function (e) {
                                    e.preventDefault();
                                    namespace.parent().clearShare();
                                    window.onbeforeunload = undefined;
                                    $location.path(nextPath);
                                    $location.search(nextSearch);
                                    $scope.modal.hide();
                                    $scope.$apply();
                                }
                            },
                            {
                                'text':  'NO',
                                'class': 'sis-button-secondary',
                                'click': function (e) {
                                    e.preventDefault();
                                    $scope.$apply();
                                    $scope.modal.hide();
                                }
                            }
                        ]
                    }).show();
                }
            }
        };
        var _init = function () {
            namespace.parent().init();
        };

        /********************
         * PUBLIC VARS
         *********************/
        $scope.onTablet = SIS.SIS_BROWSER_INFO.tablet;
        $scope.noLeftCol = true;

        /********************
         * PRIVATE METHODS
         *********************/

        /********************
         * PUBLIC METHODS
         *********************/
        if (SIS.Model.UserService.isUserLoggedIn()) {
            $scope.showFollowers = function () {
                $scope.myFollowers = SIS.Model.Activity.getFollowers({'scope': $scope});
                _showUserListModal($scope.myFollowers, 'followers', $scope.entityMap.user);
            };

            $scope.showFollowees = function () {
                $scope.myFollowees = SIS.Model.Activity.getFollowees({'scope': $scope});
                _showUserListModal($scope.myFollowees, 'followees', $scope.entityMap.user);
            };

            $scope.showTeamMembers = function () {
                $scope.myTeamMembers = SIS.Model.UserService.getCurrentUser().getCollaborators({'scope': $scope});
                _showUserListModal($scope.myTeamMembers, 'collaborators', $scope.entityMap.user);
            };

            var _showUserListModal = function (data, type, map) {
                var modalInstance = $BSModal.open({
                    templateUrl: 'user-list-modal-template',
                    controller:  'UserListModalController',
                    resolve:     {
                        'data': function () {
                            return data;
                        },
                        'type': function () {
                            return type;
                        },
                        'map':  function () {
                            return map;
                        }
                    }
                });
            };
        }

        /******************************
         * EVENT HANDLERS AND WATCHERS
         ******************************/
        var _unbindLocationChange = $scope.$on('$locationChangeStart', _onLocationChangeStart);
        $scope.$on('$destroy', function () {
            _unbindLocationChange();
        });

        /********************
         * INIT
         *********************/
        _init();
    };
    namespace.controller.$inject = ['$scope', '$location', '$timeout', '$modal', '$alert', '$BSModal'];
})(SIS.Controllers.Activity.Desktop);
