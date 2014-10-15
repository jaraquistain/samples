//Create your namespace
SIS.namespace("SIS.Controllers.Project");

//Define your namespace
(function (namespace) {
    namespace.controller = function ($scope, $routeParams, $location, $compile, $timeout, $modal) {
        /********************
         * PRIVATE VARS
         *********************/
        var _projectDataMap = {
            'newRole': 'roles'
        };

        /********************
         * PUBLIC VARS
         *********************/
        $scope.$root.loading = true;
        /********************
         * PRIVATE METHODS
         *********************/

        /********************
         * PUBLIC METHODS
         *********************/
        namespace.handleUserStateChange = function () {
            $scope.isUserLoggedIn = SIS.Model.UserService.isUserLoggedIn();
            $scope.currentUser = SIS.Model.UserService.getCurrentUser();

            $scope.isEditableByUser = $scope.thisProject && $scope.thisProject.isEditor();
        };
        namespace.init = function (callback) {
            $scope.theme = 'dark';

            //Handle User log ins/Log Outs
            $scope.$on(SIS.Model.UserService.EVENT_USER_STATE_CHANGE, namespace.handleUserStateChange);
            namespace.handleUserStateChange();

            //$scope.currentUser.isAdmin = SIS.Model.UserService.isAdmin();
            if ($routeParams && $routeParams.projectId) {
                namespace.requestProject($routeParams.projectId, callback);
            } else {
                $location.path('/projects');
            }
        };

        namespace.setupProject = function (project) {
            var match;
            $scope.thisProject = project;

            $scope.imageProject = $.inArray(project.primaryAsset.assetContentType, ['image/jpg', 'image/jpeg', 'image/png', 'image/gif']) >= 0 ? 'pointer' : false;
            $scope.project = project;
            if (!$scope.thisProject.awardsArray) $scope.thisProject.awardsArray = [];

            $scope.$watchCollection(function () {
                return $scope.thisProject.awards;
            },function(n,o){
                if ($scope.thisProject && $scope.thisProject.awards && $scope.thisProject.awards.awards) {
                    $scope.thisProject.awardsArray = [];
                    for (var i = 0; i < $scope.thisProject.awards.awards.length; i++) {
                        $scope.thisProject.awardsArray[i] = SIS.Model.AwardService.createAward($scope.thisProject.awards.awards[i], $scope.thisProject.awards.media);
                    }
                }
            });

            //Set lightbox data
            $scope.lightboxData = $scope.thisProject.secondaryAssets ? [$scope.thisProject.primaryAsset].concat($scope.thisProject.secondaryAssets) : [$scope.thisProject.primaryAsset];

            //Set release Year
            match = $scope.thisProject.releaseDate ? $scope.thisProject.releaseDate.match(/\/([1-9][0-9][0-9][0-9])/) : undefined;
            $scope.thisProject.releaseYear = match && match[1] ? match[1] : undefined;

            //Set blurred cover image URL if it exists
            $scope.projectBackgroundOpacity = $scope.thisProject.coverImage.blurredCoverImages ? 0.999 : 0.0001;

            //Calculate and set the project theme (light or dark)
            var keyColor = $scope.thisProject.coverImage ? $scope.thisProject.coverImage.keyColors : undefined;
            keyColor = keyColor && $.isArray(keyColor) ? keyColor[0] : keyColor;
            keyColor = keyColor || {
                red: 0,
                green: 0,
                blue: 0
            };

            var red = 0.2989 * keyColor.red,
                green = 0.5870 * keyColor.green,
                blue = 0.1140 * keyColor.blue;

            $scope.theme = (red + green + blue) > 122 ? 'light' : 'dark';
        };

        namespace.requestProject = function (id, callback) {
            SIS.Model.ProjectService.requestProject({
                'id': id,
                'queryParams': {
                    'numLikers': 16
                },
                'success': function (response, status, xhr) {
                    $scope.$apply(function () {
                        typeof callback === "function" && callback.call(this, response);
                    });
                },
                'error': function (xhr, status, response) {
                    $location.path('/projects');
                    $scope.$apply();
                }
            });
        };

        //Take a collaborator array and sort it by date added to the project with current user at top
        namespace.sortCollaborators = function (collabArray) {
            var userId = $scope.currentUser ? $scope.currentUser.id : undefined;
            if (collabArray) {
                collabArray.sort(function (a, b) {
                    var aDate = a.joinedDateTime ? new Date(a.joinedDateTime) : new Date(),
                        bDate = b.joinedDateTime ? new Date(b.joinedDateTime) : new Date();

                    return aDate - bDate;
                });

                if (userId) {
                    for (var i = 0; i < collabArray.length; i++) {
                        collabArray[i].user.profileImage = collabArray[i].user.profileImage || {};
                        if (collabArray[i].user && collabArray[i].user.id && userId === collabArray[i].user.id) {
                                var myUser = collabArray[i];
                                collabArray.splice(i, 1);
                                collabArray.unshift(myUser);
                        } else {
                            if (!collabArray[i].user) {
                                console.warn("Collaborator array contains an invalid User Object!", collabArray[i]);
                            }
                        }
                    }
                }

                return collabArray;
            }
        };

        namespace.setupCollaborators = function () {
            //Set up collaborators
            var projectRoles = {};
            $scope.isEditableByUser = $scope.thisProject.isEditableByUser;
            $scope.thisProject.collaborators = namespace.sortCollaborators($scope.thisProject.collaborators);
            $scope.collabs = [];
            $scope.pendingCollabs = [];
            // Assemble temp collabs for display
            $scope.thisProject.collaborators.forEach(function (c, i) {
                projectRoles[c.role] = projectRoles[c.role] ? projectRoles[c.role]++ : 1;
                if ($scope.currentUser && (c.user.id === $scope.currentUser.id)) {
                    $scope.myCollab = c;
                }

                if (c.joinedDateTime) {
                    // Used in the ng-switch in the template
                    c.type = 'valid';
                    $scope.collabs.push(c);
                } else {
                    $scope.pendingCollabs.push(c);
                }


            });

            return projectRoles;
        };

        namespace.like = function () {

            var opts = {
                'scope': $scope,
                'success': function (response) {
                    if (!response.errorCode) {
                        $scope.liking = false;
                        response.likers = response.likers || [];
                        $.extend($scope.thisProject, response);
                        $scope.$apply();
                    } else {
                        opts.error(response);
                    }
                },
                'error': function (response) {
                    console.error('liking project failed', response);
                    $scope.liking = false
                }
            };
            if (!$scope.liking) {
                $scope.liking = true;
                $scope.thisProject.like(opts);
            }
        };

        $scope.setLightboxUrl = function (id) {
            $scope.scrollDistance = $(document).scrollTop();
            id && $location.search('lightbox', id).replace();
        };
        /********************
         * EVENT HANDLING
         ********************/

        /********************
         * INIT
         *********************/
    };
})(SIS.Controllers.Project);
