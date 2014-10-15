//Create your namespace
SIS.namespace("SIS.Controllers.Project.Desktop").extend(SIS.Controllers.Project);

//Define your namespace
(function (namespace) {
    namespace.controller = function ($scope, $routeParams, $location, $compile, $timeout, $modal, $alert) {
        /********************
         * PARENT CONTROLLER
         *********************/
        var _parent = namespace.parent();
        _parent.controller.apply(this, arguments);

        /********************
         * PRIVATE VARS
         *********************/

        /********************
         * PUBLIC VARS
         *********************/
        $scope.newRole;
        /********************
         * PRIVATE METHODS
         *********************/
        var _addCollaboratorHandler = function () {
            // Parse the params into an array
            var paramPairs = decodeURIComponent($routeParams.collaboratorParams).split('|'),
                params = {};

            for (var i = 0; i < paramPairs.length; i++) {
                var paramArray = paramPairs[i].split('=');
                params[paramArray[0]] = paramArray[1];
            }

            // TODO: add links to user's profile etc. if needed to the alerts
            if (params.collaborator) {
                var collaborator = $scope.thisProject.getCollaborator(params.collaborator);

                if (collaborator && collaborator.user) {
                    $('#alert').alert('show', 'success', 'Successfully added ' + collaborator.user.firstName + ' ' + collaborator.user.lastName + ' as a team member.');
                } else {
                    $('#alert').alert('show', 'error', 'Could not add team member. Unknown error.');
                }
            } else if (params.errorMessage) {
                if (params.user) {
                    var userData;
                    SIS.Model.UserService.requestUser({
                        'id'     : params.user,
                        'success': function (data) {
                            user = SIS.Model.UserService.getUser(params.user);
                            if (user) {
                                $('#alert').alert('show', 'error', 'Could not add ' + user.firstName + ' ' + user.lastName + ' as a team member. Error: ' + params.errorMessage);
                            } else {
                                $('#alert').alert('show', 'error', 'Could not add team member. Error: ' + params.errorMessage);
                            }
                        },
                        'error'  : function (xhr, status, response) {
                            console.warn('Could not retrieve user: ', response);
                        }
                    });
                } else {
                    $('#alert').alert('show', 'error', 'Could not add team member. Error: ' + params.errorMessage);
                }
            }
        };

        // Currently not used, backup to viewContentLoaded
        var _checkFyre = function (selector, callback, timeout) {
            var $element = $(selector),
                interval = 100;

            timeout = typeof timeout === 'undefined' ? 5000 : timeout;

            if ($element.length > 0) {
                typeof callback === 'function' && callback.call($element);
            } else {
                if (timeout >= 0) {
                    setTimeout(function () {
                        _checkFyre(selector, callback, timeout - interval);
                    }, interval);
                }
            }
        };

        var _setupCollaborators = function () {
            var projectRoles = _parent.setupCollaborators();
            $scope.collabLength = $scope.collabs.length;
            if ($scope.isEditableByUser) {
                for (var role in $scope.thisProject.subRoles) {
                    var roleGroup = $scope.thisProject.subRoles[role],
                        defaultRole = roleGroup ? roleGroup.values[roleGroup.defaultValue] : 0;

                    if (!projectRoles[defaultRole]) {
                        $scope.collabs.push({
                            'type'          : 'suggested',
                            'role'          : defaultRole,
                            'roleGroup'     : role,
                            'joinedDateTime': new Date(new Date().getTime() + 86400),
                            'user'          : {}
                        });
                    }
                }
            };
            $scope.collabs = _parent.sortCollaborators($scope.collabs);
            $scope.$root.loading = false;
        };

        var _setupProject = function (project) {
            _parent.setupProject(project);
            var maxH = $(window).height() - (52 + 44 + 20); //header height + 2 * gutter + visible px of secondary assets
            $scope.maxPrimaryHeight = maxH > 500 ? maxH : 500;
            $scope.projectBackgroundUrl = SIS.Filters.IsValidImage.blurredFilter()($scope.thisProject.coverImage, 'tiny');
            //            $('body').on('masonryAssetsLoaded', function (e) {
            //                $scope.completeFinished = true;
            //            });
            if ($scope.thisProject.primaryAsset && !$scope.thisProject.coverImage) {
                $timeout(function () {
                    $scope.$broadcast(SIS.Model.MediaService.events.poll + $scope.thisProject.primaryAsset.id);
                });
            }

            if ($scope.thisProject) {
                // Initialize the project
                $scope.coverImage = $scope.thisProject.coverImage;

                //$scope.changeColumns(false);
                // If there is a collaborator confirmation, show an alert with the user info
                // or any error messages
                if ($routeParams.collaboratorParams) {
                    _addCollaboratorHandler();
                }

                // Show the collaborators dialog if new project
                if ($routeParams.isNewProject === 'true') {
                    SIS.Controllers.Collaborator.manageCollaborators($scope, $modal, $alert, $timeout, {
                        'project'  : $scope.thisProject,
                        'success'  : function (newCollabArray) {
                            $location.path('/project/' + $scope.thisProject.id).replace();

                            if (newCollabArray) {
                                $scope.thisProject.collaborators = newCollabArray;
                                _setupCollaborators();
                                $scope.$apply();
                            }

                        },
                        'afterHide': function () {
                            $location.search('isNewProject', null).replace();
                            $scope.$apply();
                        }
                    });
                }

                if ($routeParams.award) {

                    //$scope.tempAward = award;
                    $scope.addAward();
                }

                //$scope.maxPrimaryHeight = Math.floor($(window).height() * (3/4));
                !$scope.$$phase && $scope.$apply();

                // Get related projects - shhhhhhh
                // _getRelatedProjects();

            } else {
                $scope.$apply(function () {
                    $('#alert').alert('show', 'warning', 'The requested project was removed or not found.');
                    $location.path('/projects');
                });
            }
            _setupCollaborators();
        };

        var _getRelatedProjects = function () {
            var idMap = {}, idArray = [],
                collabProjectIdMap = {}, collabProjectArray = [],
                currUserProjects = [];
            $scope.thisProject.collaborators.forEach(function (c, i) {
                idMap[c.user.id] = c.user.id === SIS.Model.UserService.getCurrentUser().id ? 'currUser' : 'collaborator';
            });

            for (var id in idMap) {
                idArray.push(id);
            }

            // Get all of the collaborator projects
            SIS.Model.ProjectService.requestProjectsForUsers({
                'users'      : idArray,
                'maxProjects': 500,
                'success'    : function (data) {
                    for (var i = 0; i < data.length; i++) {
                        for (var j = 0; j < data[i].projects.length; j++) {

                            var id = data[i].projects[j].id;
                            if (collabProjectIdMap[data[i].projects[j].id]) {
                                collabProjectIdMap[data[i].projects[j].id].count = collabProjectIdMap[data[i].projects[j].id].count + 1;
                            } else {
                                collabProjectIdMap[data[i].projects[j].id] = data[i].projects[j];
                                collabProjectIdMap[data[i].projects[j].id].count = 0;
                            }
                        }
                    }

                    // Get all of the current user project ids
                    SIS.Model.ProjectService.requestProjects(SIS.Model.UserService.getCurrentUser(), function (projects) {
                        var requests = [];
                        for (var i = 0; i < projects.length; i++) {
                            // Remove any of the current user's projects
                            if (collabProjectIdMap[projects[i].id]) {
                                delete collabProjectIdMap[projects[i].id];
                            }
                        }

                        for (var id in collabProjectIdMap) {
                            collabProjectArray.push(collabProjectIdMap[id]);
                        }

                        collabProjectArray = collabProjectArray.slice(0, 6);
                        $scope.relatedProjects = collabProjectArray;
                        $scope.$apply();
                    });
                }
            });
        };

        var _init = function () {
            _parent.init(_setupProject);
            $timeout(function () {
                $('.sis-project-cover-thumb').off('reinitted').on('reinitted', function () {
                    console.log('initted called on cover thumb');
                    $timeout(function () {
                        var url = SIS.Filters.IsValidImage.blurredFilter()($scope.thisProject.coverImage, 'tiny'),
                            opacity = $scope.thisProject.coverImage.blurredCoverImages ? 0.999 : 0.0001;

                        $scope.projectBackgroundUrl = url;
                        $scope.projectBackgroundOpacity = opacity;

                    });
                });
            });
        };

        /********************
         * PUBLIC METHODS
         *********************/
        $scope.like = function () {
            _parent.like();
        };

        $scope.requestProject = function (id, callback) {
            _parent.requestProject(id, callback);
        };

        $scope.showProfile = function (id) {
            var path = '/user/' + id;
            $location.path(path);
        };

        $scope.requestCollaborator = function () {
            $scope.newCollaborator = {};
            $scope.modal = $modal($scope, {
                template           : $('#sis-request-collaborator-template').html(),
                title              : "Request to Join Project",
                subtitle           : "Did you contribute to this project? Become a team member to gain full access to this project.",
                preventInitialFocus: true,
                afterShow          : function () {
                    SISAX.trackEvent("requestCollaborator_start", SISAX.cats.PROJECT, {
                        "project": $scope.thisProject.id
                    });
                },
                afterHide          : function () {
                    SISAX.trackEvent("requestCollaborator_end", SISAX.cats.PROJECT, {
                        "project": $scope.thisProject.id
                    });
                },
                buttons            : [
                    {
                        'text'      : 'Send Request',
                        'class'     : 'sis-button-primary',
                        'submitText': 'Sending',
                        'click'     : function () {

                            if ($scope.joinProjectForm.$invalid) {
                                $timeout(function () {
                                    $scope.showInvalid = true;
                                    SISAX.trackEvent("requestCollaborator_error", SISAX.cats.PROJECT, {
                                        "project": $scope.thisProject.id,
                                        "error"  : "invalidFormError"
                                    });
                                });
                                return false;
                            } else {
                                $scope.requestCollaboratorSubmit();
                            }
                        }
                    },
                    {
                        'text' : 'CANCEL',
                        'class': 'sis-button-link',
                        'click': function (e) {
                            e.preventDefault();

                            $scope.newCollaborator = {};
                            SISAX.trackEvent("requestCollaborator_cancel", SISAX.cats.PROJECT, {
                                "project": $scope.thisProject.id
                            });
                            $scope.$apply();
                            $(this).trigger('hide');
                        }
                    }
                ]
            }).show();
        };
        // Collaborator/Role Autocomplete for request collaborator
        $scope.requestCollaboratorSubmit = function () {
            SISAX.trackEvent("requestCollaborator_submit", SISAX.cats.PROJECT, {
                "project"     : $scope.thisProject.id,
                "collaborator": $scope.newCollaborator.id,
                "role"        : $scope.newCollaborator.role
            });
            SIS.Model.CollaboratorService.requestCollaborator({
                projectID: $scope.thisProject.id,
                userID   : $scope.newCollaborator.id,
                role     : $scope.newCollaborator.role,
                success  : function (data) {
                    $scope.modal.hide();
                    $('#alert').alert('show', 'success', 'Your request to join this project has been sent.');
                    SISAX.trackEvent("requestCollaborator_success", SISAX.cats.PROJECT, {
                        "project"     : $scope.thisProject.id,
                        "collaborator": $scope.newCollaborator.id,
                        "role"        : $scope.newCollaborator.role
                    });
                    $scope.$apply();
                },
                error    : function (response) {
                    SISAX.trackEvent("requestCollaborator_error", SISAX.cats.PROJECT, {
                        "project"     : $scope.thisProject.id,
                        "collaborator": $scope.newCollaborator.id,
                        "role"        : $scope.newCollaborator.role,
                        "error"       : response
                    });
                    $('#alert').alert('show', 'error', 'Could not invite team member. Error: ' + response.errorMsg || response.errorCode);
                }
            });

        };
        $scope.requestCollaboratorCancel = function ($event) {
            $scope.modal.hide();
        };
        $scope.requestCollaboratorChanged = function () {
            // Remove the id that the collaborator is validated on. The ID will be
            // set by autocomplete - MS-667
            $scope.newCollaborator.id = '';
        };

        $scope.getCollaborators = function (value, callback) {
            var data = [];

            if ($scope.thisProject.collaborators.length === 0)  return data;

            $scope.thisProject.collaborators.forEach(function (c) {
                var c = $.extend(true, {}, c);
                data.push($.extend(c, {
                    'type'           : 'people',
                    'text'           : c.user.firstName + ' ' + c.user.lastName,
                    'firstName'      : c.user.firstName,
                    'lastName'       : c.user.lastName,
                    'currentTitle'   : c.role,
                    'profileImageUrl': SIS.Filters.IsValidImage.filter()(c.user.profileImage, 'small','img/no-profile-image.jpg')
                }));
            });

            SIS.Utils.call(callback, undefined, data);
        };

        $scope.setCollaborator = function (item) {
            if (item) {
                $scope.newCollaborator.name = item.text;
                $scope.newCollaborator.id = item.user.id;
                $timeout(function () {
                    $scope.joinProjectForm.collaboratorNameWrap.inner.collaboratorName.$setViewValue(item.text);
                    $scope.joinProjectForm.collaboratorIDWrap.inner.collaboratorID.$setViewValue(item.user.id);
                });
            }
        };

        $scope.addCollaborators = function () {
            SIS.Controllers.Collaborator.addCollaborators($scope.thisProject, $scope, $modal, $timeout, function () {
                _setupCollaborators();
                $scope.$apply();
            });
        };
        $scope.manageCollaborators = function (role) {

            // Modal Method
            SIS.Controllers.Collaborator.manageCollaborators($scope, $modal, $alert, $timeout, {
                'project'    : $scope.thisProject,
                'success'    : function (newCollabArray) {

                    if (newCollabArray) {
                        $scope.thisProject.collaborators = newCollabArray;
                        _setupCollaborators();
                        $scope.$apply();
                    }
                },
                'defaultRole': role
            });
        };

        $scope.updateRole = function ($element) {

            SIS.Model.ProjectService.updateRole({
                projectID     : $scope.thisProject.id,
                collaboratorID: $element.scope().$parent.person.id,
                role          : $element.scope().$parent.person.role,
                success       : function (data) {
                    $element.trigger('success');
                },
                error         : function (response) {
                    $('#alert').alert('show', 'error', 'Could not update role. Error: ' + response.errorMsg || response.errorCode);
                }
            });

        };

        $scope.isEmbed = SIS.Model.MediaService.getEmbedVendor;
        $scope.isPDF = SIS.Model.MediaService.isPDF;

        // $scope.generateEmbed = function(asset) {
        //     if (asset && $scope.isEmbed(asset)) {
        //         var template = SIS.Model.MediaService.vendors[asset.assetContentType].template;
        //         return template;
        //     }
        // };

        $scope.editProject = function () {
            SISAX.trackEvent("editProject_start", SISAX.cats.PROJECT, {
                "project": $scope.thisProject.id
            });
            // $location.path('/user/' + $scope.currentUser.id + '/edit-project/' + $scope.thisProject.id);
            $location.path('/user/' + $scope.currentUser.id).search({
                'view'     : 'edit-project',
                'projectId': $scope.thisProject.id
            });
        };

        var _createSlideshowModal = function () {
            SIS.Model.MediaService.lightboxModal = $modal($scope, {
                template    : $('#sis-asset-lightbox-template').html(),
                theme       : 'lightbox',
                overlayClose: true,
                afterHide   : function () {
                    var data = $scope.slideshowData[$scope.currentAssetIndex];
                    $(this).find('.sis-lightbox').trigger('unbindcontrols');
                    if (data && $scope.isEmbed(data)) {
                        var selector = '.sis-lightbox-slide[data-index=' + $scope.currentAssetIndex + '] iframe';
                        $(selector).attr('src', '');
                    }
                    $location.search('lightbox', null);
                    $scope.currentAssetIndex = null;
                    SIS.Model.MediaService.lightboxModal = undefined;
                    $scope.$apply();
                },
                beforeShow  : function () {
                   this.$element.find('.sis-lightbox').trigger('bindcontrols');
                }
            });
        };

        var _showAssetSlideshow = function (index) {
            index = index || 0;
            $timeout(function () {
                SIS.Model.MediaService.lightboxModal.show();
                SIS.Model.MediaService.lightboxModal.$element.trigger('resize');
                $(document).scrollTop($scope.scrollDistance);
            });
        };

        /********************
         * EVENT HANDLING
         ********************/
        var _viewContentLoadedHandler = function (e) {
            var requestProject = true;
            // Load a new project if the ids are different
            if ($scope.thisProject && $scope.thisProject.id !== $routeParams.projectId) {

                $scope.$root.loading = true;
                requestProject = false;
                _parent.requestProject($routeParams.projectId);
            }

            $scope.completeFinished && $timeout(function () {
                //                if ($routeParams.assetIndex !== undefined) {
                //                    $scope.currentAssetIndex = $routeParams.assetIndex;
                //                    if (!SIS.Model.MediaService.lightboxModal || $scope.modal) {
                //                        _createSlideshowModal();
                //
                //                    }
                //                    _showAssetSlideshow($scope.currentAssetIndex);
                //                } else if (SIS.Model.MediaService.lightboxModal) {
                //                    SIS.Model.MediaService.lightboxModal.hide();
                //                }
            });

            $scope.scrollDistance = $scope.scrollDistance || 0;
            $(document).scrollTop($scope.scrollDistance);
        };

        var _unbindViewContentLoaded = $scope.$on("$viewContentLoaded", _viewContentLoadedHandler);

        $scope.$on('$destroy', function ($event) {
            _unbindViewContentLoaded();
            delete SIS.Model.MediaService.lightboxModal;
        });

        $scope.showAllUsers = function (action) {
            var opts = {
                'scope'  : $scope,
                'success': function (response) {
                    $scope.$apply(function () {
                        $scope.userList = response[$scope.action + 'rs'];

                    });
                },
                'error'  : function (response) {
                    console.warn('error fetching user list', response);
                }
            };

            if (action === 'like') {
                $scope.action = 'like';
                $scope.thisProject.getLikers(opts);
            } else if (action === 'love') {
                $scope.action = 'love';
                $scope.thisProject.getLovers(opts);
            }
            $scope.userModal = $modal($scope, {
                template           : $('#sis-user-list-template').html(),
                theme              : 'minimal',
                preventInitialFocus: true,
                onHide             : function () {
                    $scope.action = undefined;
                }
            });
            $timeout(function () {
                $scope.userModal.show();
            });
        };

        $scope.closeUserModal = function () {
            $scope.userModal.hide();
        };

        $scope.$on('$routeUpdate', function () {
            $scope.completeFinished && $timeout(function () {
                if ($routeParams.assetIndex !== undefined) {
                    $scope.currentAssetIndex = $routeParams.assetIndex;
                    if (!SIS.Model.MediaService.lightboxModal || $scope.modal) {
                        _createSlideshowModal();
                    }
                    _showAssetSlideshow($scope.currentAssetIndex);
                } else if ($routeParams.assetIndex === undefined) {
                    SIS.Model.MediaService.lightboxModal && SIS.Model.MediaService.lightboxModal.hide();
                }
            });
        });

        $scope.editRole = function (e) {
            e.preventDefault();
            $scope.editRoleModal = $modal($scope, {
                template  : $('#sis-edit-role-template').html(),
                title     : "How did you contribute?",
                beforeShow: function () {
                    $scope.newRole = $scope.myCollab.role;
                },
                afterShow : function () {

                },
                afterHide : function () {
                    $scope.showInvalid = false;
                },
                buttons   : [
                    {
                        'text'      : 'UPDATE ROLE',
                        'class'     : 'sis-button-primary float-right',
                        'submitText': 'Updating',
                        'click'     : function () {
                            if ($scope.roleForm.$pristine) {
                                $scope.editRoleModal.hide();
                                return false;
                            } else if ($scope.roleForm.$invalid) {
                                $scope.showInvalid = true;
                                $scope.$apply();
                                return false;
                            } else {
                                SIS.Model.ProjectService.updateRole({
                                    projectID     : $scope.thisProject.id,
                                    collaboratorID: $scope.myCollab.id,
                                    roles          : [$scope.newRole].join(","),
                                    success       : function (data) {
                                        $scope.myCollab.role = $scope.newRole;
                                        $scope.newRole = '';
                                        $scope.editRoleModal.hide();
                                        $scope.$apply();
                                    },
                                    error         : function (xhr, status, response) {
                                        $('#alert').alert('show', 'error', 'Could not update your role.');
                                        console.log("update role failed:", response);
                                        $(this).trigger('hide');
                                    }
                                });

                            }
                        }
                    },
                    {
                        'text' : 'CANCEL',
                        'class': 'sis-button-link float-right',
                        'click': function (e) {
                            e.preventDefault();
                            $scope.newRole = '';
                            $(this).trigger('hide');
                        }
                    }
                ]
            }).show();
        };

        var _setAwardUploadListeners = function () {
            if ($(this).data("awardUploadListeners")) {
                return;
            }
            $(this).on("allfilesprocessed", _loadListener);
            $(this).find("[asset]").on("reinitted", _loadListener);
            $(this).data("awardUploadListeners", true);
        };

        var _removeAwardUploadListeners = function () {
            $scope.tempAward = {
                institution    : "",
                category       : "",
                level          : "",
                year           : "",
                mediaSet       : false,
                logoMediaObject: {}
            };
            $(this).off("allfilesprocessed", _loadListener);
            $(this).find("[asset]").off("reinitted", _loadListener).attr("data-id", "");
            $scope.$apply();
        }

        var _loadListener = function (e) {
            var mediaId = $scope.tempAward.logoMediaObject.id;
            //$scope.tempAward.mediaSet = true;

            $timeout(function () {
                $("#sis-add-award-logo-input").trigger("change");
            });
        }

        $scope.filterInstitutions = function (value, callback) {
            SIS.Model.AwardService.filterInstitutions({
                'value'  : value,
                'success': function (data) {
                    SIS.Utils.call(callback, undefined, data);
                }
            });
        };
        $scope.setRole = function(item) {
            $scope.newRole = item.text;
            $scope.roleForm.$setDirty();
        };

        $scope.setInstitution = function (item, callback) {
            var val = typeof item === "string" ? item : item.text
            $scope.tempAward.institution = val;
            if (!$scope.tempAward.mediaSet) {
                SIS.Model.AwardService.getLogoFromInstitution($scope.tempAward.institution, function (logoMediaObject) {
                    $scope.tempAward.logoMediaObject = logoMediaObject;
                    !$scope.$$phase && $scope.$apply();
                    SIS.Utils.call(callback);
                });
            } else {
                SIS.Utils.call(callback);
            }
        };

        $scope.setLogo = function () {
            if (!$scope.tempAward.mediaSet && $scope.tempAward.institution) {
                //$scope.tempAward.logoMediaObject = SIS.Model.AwardService.getLogoFromInstitution($scope.tempAward.institution);
                SIS.Model.AwardService.getLogoFromInstitution($scope.tempAward.institution, function (logoMediaObject) {
                    $scope.tempAward.logoMediaObject = logoMediaObject;
                    $timeout(function () {
                        $("#sis-add-award-logo-input").trigger("change");
                    });
                });

            } else if (!$scope.tempAward.institution) {
                $scope.tempAward.logoMediaObject = null;
            }
        }

        $scope.filterCategories = function (value, callback) {
            SIS.Model.AwardService.filterCategories({
                'institution': $scope.tempAward.institution,
                'value'      : value,
                'success'    : function (data) {
                    SIS.Utils.call(callback, undefined, data);
                }
            });
        };

        $scope.setCategory = function (item) {
            $scope.tempAward.category = item.text;
            $timeout(function(){
                $scope.addAwardForm.categoryWrap.inner.category.$setViewValue(item.text);
            });
        };

        $scope.filterLevels = function (value, callback) {
            SIS.Model.AwardService.filterLevels({
                'institution': $scope.tempAward.institution,
                'value'      : value,
                'success'    : function (data) {
                    SIS.Utils.call(callback, undefined, data);
                }
            });
        };

        $scope.setLevel = function (item) {
            console.log('set level called:', item);
            $scope.tempAward.level = item.text;
        };

        $scope.addAward = function () {
            var errorUpdating = false;
            $scope.addAwardModal = $modal($scope, {
                template  : $('#sis-add-award-template').html(),
                title     : "Add an Award",
                subtitle  : "This project deserves an award!",
                beforeShow: function () {
                    //$scope.newRole = $scope.myCollab.role;

                    $scope.tempAward = {
                        institution    : "",
                        category       : "",
                        level          : "",
                        year           : "",
                        mediaSet       : false,
                        logoMediaObject: {}
                    }

                    _setAwardUploadListeners.call(this.$element.find(".sis-add-award-logo-upload")[0]);
                    if ($routeParams.award) {
                        var award = JSON.parse(decodeURI($routeParams.award));
                        $scope.tempAward = $.extend($scope.tempAward, award);
                        $scope.setInstitution($scope.tempAward.institution, function () {
                            $("#sis-add-award-logo-input").trigger("change");
                        });
                        $timeout(function () {
                            $(".sis-modal-form .sis-input").trigger("change");
                        });

                    }
                    !$scope.$$phase && $scope.$apply();
                },
                afterShow : function () {
                    $scope.tempAward.mediaSet = false;
                    !$scope.$$phase && $scope.$apply();
                },
                beforeHide: function () {
                    _removeAwardUploadListeners.call($(this.$element).find(".sis-add-award-logo-upload")[0]);
                },
                afterHide : function () {
                    _removeAwardUploadListeners.call($(this.$element).find(".sis-add-award-logo-upload")[0]);
                    if (errorUpdating) {
                        $('#alert').alert('show', 'error', 'Could not add an award. Please try again soon.');
                    }
                    $scope.showInvalid = false;
                    $scope.$apply();
                },
                buttons   : [
                    {
                        'text'      : 'Add Award',
                        'class'     : 'sis-button-primary float-right',
                        'submitText': 'Adding Award',
                        'click'     : function () {

                            if ($scope.addAwardForm.$invalid) {
                                $scope.showInvalid = true;
                                $scope.$apply();
                                return false;
                            } else {
                                /*
                                 $scope.tempAward.id = SIS.Utils.generateGUID(16);
                                 $scope.thisProject.awards.push($.extend({},$scope.tempAward));
                                 $scope.$apply();
                                 $scope.addAwardModal.hide();
                                 return;
                                 */
                                SIS.Model.AwardService.addAward({
                                    projectId: $scope.thisProject.id,
                                    award    : $scope.tempAward,
                                    success  : function (data) {
                                        $scope.thisProject.awards = data;
                                        $location.search("award", null).replace();

                                        $scope.$apply();
                                        $scope.addAwardModal.hide();
                                        SIS.Model.AwardService.getInstitutions();

                                    },
                                    error    : function (xhr, status, response) {
                                        //console.log("add award failed:", arguments);
                                        if (xhr.errorCode === 3101) {
                                            $("#alert").alert("show", "error", "Award already exists! If you're not seeing it, please refresh the page (one of your peers may have uploaded it already).");
                                        } else {
                                            $("#alert").alert("show", "error", xhr.errorMsg);
                                        }

                                        $scope.addAwardModal.hide();
                                    }
                                });

                            }
                        }
                    },
                    {
                        'text' : 'CANCEL',
                        'class': 'sis-button-link float-right',
                        'click': function (e) {
                            e.preventDefault();
                            $scope.addAwardModal.hide();
                        }
                    }
                ]
            }).show();
        }

        $scope.requestAward = function () {
            var errorUpdating = false;
            var requestSuccess = false;
            $scope.addAwardModal = $modal($scope, {
                template  : $('#sis-add-award-template').html(),
                title     : "Request an Award",
                subtitle  : "Did this project win an award? Request to have it added!",
                beforeShow: function () {
                    //$scope.newRole = $scope.myCollab.role;
                    $scope.tempAward = {
                        institution    : "",
                        category       : "",
                        level          : "",
                        year           : "",
                        logoMediaObject: {}
                    };
                    //_setUploadListeners.call($(this).find(".sis-add-award-logo-upload")[0]);
                },
                afterShow : function () {

                },
                afterHide : function () {
                    if (errorUpdating) {
                        $('#alert').alert('show', 'error', 'Oops! Could not request an award. Please try again soon.');
                    } else if (requestSuccess) {
                        $("#alert").alert('show', 'success', 'You have successfully requested an award to be added to your project.');
                    }
                },
                buttons   : [
                    {
                        'text'      : 'Request Award',
                        'class'     : 'sis-button-primary float-right',
                        'submitText': 'Requesting Award',
                        'click'     : function () {

                            var $form = $('.sis-modal-form');

                            if ($form.is('.validator-pristine')) {
                                $scope.addAwardModal.hide();
                                return false;
                            }
                            else if ($form.is('.validator-invalid')) {
                                $form.addClass('show-invalid');
                                return false;
                            } else {
                                SIS.Model.AwardService.requestAward({
                                    award  : $scope.tempAward,
                                    user   : $scope.currentUser,
                                    project: $scope.thisProject,
                                    success: function (data) {

                                        requestSuccess = true;
                                        $scope.addAwardModal.hide();
                                    },
                                    error  : function (xhr, status, response) {

                                        errorUpdating = true;
                                        $scope.addAwardModal.hide();
                                    }
                                });

                                SIS.Model.AwardService.addInstitution($scope.tempAward.institution);
                                SIS.Model.AwardService.addCategory($scope.tempAward.institution, $scope.tempAward.category);
                                SIS.Model.AwardService.addLevel($scope.tempAward.institution, $scope.tempAward.level);
                            }
                        }
                    },
                    {
                        'text' : 'CANCEL',
                        'class': 'sis-button-link float-right',
                        'click': function (e) {
                            e.preventDefault();
                            $scope.addAwardModal.hide();
                        }
                    }
                ]
            }).show();
        };

        $scope.removeAward = function (award, index) {
            /*
             console.log(award,index);
             $scope.thisProject.awards.splice(index,1);
             return;
             */
            award.removing = true;
            award.removeAward({
                projectId: $scope.thisProject.id,
                award    : award,
                success  : function (data) {
                    $scope.thisProject.awards = data || {awards: []};

                    $scope.$apply();

                },
                error    : function (xhr, status, response) {
                    console.log("remove award failed:", arguments);
                    $("#alert").alert("show", "error", "Deleting award failed (" + status + ")");
                    //award.removing = false;
                    $scope.$apply();
                }
            });
        };

        /********************
         * INIT
         *********************/
        _init();
    };

    namespace.controller.$inject = ['$scope', '$routeParams', '$location', '$compile', '$timeout', '$modal', '$alert'];
})(SIS.Controllers.Project.Desktop);
