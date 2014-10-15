//Create your namespace
SIS.namespace("SIS.Controllers.ProjectEdit");

//Define your namespace
(function (namespace) {
    namespace.controller = function ($scope, $routeParams, $location, $modal, $timeout, $alert) {
        $scope.$root.loading = true;
        /********************
         * PRIVATE VARS
         *********************/
        var _projectDataMap = {
                'role':         'roles',
                'projectType':  'types',
                'category':     'categories',
                'releaseMonth': 'months',
                'brand':        'brands',
                'company':      'companies'
            },
            _projectEmbedTemplates = {
                'primary':   '<div class="embed-modal"><div e-meta-data-callback="assignPrimaryAssetMetaData" e-event-proxy=".edit-project-embed-primary-asset-button" e-submit-proxy=".embed-primary-asset-modal-submit-button" embed="project.primaryAsset"></div></div>',
                'secondary': '<div class="embed-modal"><div e-meta-data-callback="assignSecondaryAssetMetaData" e-event-proxy=".edit-project-embed-secondary-asset-button" e-submit-proxy=".embed-secondary-asset-modal-submit-button" embed="project.secondaryAssets" e-target-is-array="true"></div></div>'
            },
            _populated = false,
            _currentUser = SIS.Model.UserService.getCurrentUser(),
            _$form = $('#sis-edit-project-form'),
            _$embedModal,
            _myCollaboratorId,
            MEDIA_UPDATE_TIMEOUT = 2000,
            _keys = SIS.Utils.getKeyMap();

        /********************
         * PUBLIC VARS
         *********************/
        $scope.leaveButtonText = 'Remove';
        $scope.leaveHeaderText = 'Remove Project';
        $scope.leaveCopyText = 'Remove this project from your profile. This project will still be visible on your team member\'s profiles.';
        $scope.projectChanged = false;
        $scope.nonPendingCollaborators = [];
        $scope.isUserLoggedIn = SIS.Model.UserService.isUserLoggedIn();

        /********************
         * PRIVATE METHODS
         *********************/
        var _handleInvalid = function(e){
            $('#alert').alert('show', 'error', e.reasons[0].message);
        };

        var _init = function () {
            _handleUserStateChange(true);
            $scope.$on(SIS.Model.UserService.EVENT_USER_STATE_CHANGE, function () {
                _handleUserStateChange();
            });

            var _unbindChangeStart = $scope.$on('$locationChangeStart', function (e, next, current) {
                if ($scope.projectChanged) {
                    e.preventDefault();
                    // In the case of other profile paths, $location.path() was returning the current path, 
                    // not the new one. We need to rely on the supplied arguments to construct this.
                    var nextPath = next.match(/#([\/\w-]*)/)[1];
                    $scope.confirmLeaving(nextPath, $location.search());
                    window.onbeforeunload = undefined;
                }
                $scope.processingTimeout && window.clearTimeout($scope.processingTimeout);
            });

            $scope.$on('$destroy', function (e) {
                _unbindChangeStart();
            });

            $('.new-project-release-year').attr('max', parseInt(new Date().getFullYear()) + 1);

            //add the primary asset embed handlers
            $('.edit-project-embed-primary-asset-button').off('preview cleared').on('preview cleared', function (e) {
                _$embedModal && _$embedModal.resize()
            });
            $('.edit-project-embed-primary-asset-button, .edit-project-embed-secondary-asset-button').off('embedded').on('embedded', function (e) {
                _$embedModal && _$embedModal.hide();
                $scope.modelChanged();
                $scope.$apply();
            });
            $('.edit-project-upload-cover-button').off('recropprocessed').on('recropprocessed', function (e) {
                $timeout(function () {
                    $scope.modelChanged();
                });
            });

            $('.edit-project-upload-primary-asset-button, .edit-project-upload-cover-button, .edit-project-upload-secondary-asset-button').off('allfilesprocessed invalid').on('allfilesprocessed', $scope.modelChanged).on('invalid', _handleInvalid);

            $scope.$on(SIS.BROADCAST_EVENTS.TAGS_MODIFIED, function () {
                _populated && $scope.editProjectForm.$setDirty();
                $scope.modelChanged();
            });

            $scope.$on(SIS.BROADCAST_EVENTS.TAGS_MODIFIED, function () {
                _populated && $scope.editProjectForm.$setDirty();
                $scope.modelChanged();
            });

            // Make sure the tags input does not submit the form if there is text in it to be added as a tag
            $('.add-project-tags').on('keydown', 'input', function (e) {
                if (e.which === _keys.enter && $.trim($(this).val().length) > 0) return false;
            });

            SIS.Model.ProjectService.requestProject({
                'id':           $routeParams.projectId,
                'forceRequest': true,
                'success':      function (response) {
                    if (response && response.id) {
                        _populate(response);
                    }
                },
                'error':        function (response) {
                    $('#alert').alert('show', 'error', 'Error fetching project data.');
                    $location.path("/project/" + $routeParams.projectId);
                }
            });
        };
        var _onRouteChange = function (e) {
            if ($routeParams.view === 'edit-project' && $routeParams.projectId) {
                $scope.editMode = true;
                _init();
            }
        };
        var _handleUserStateChange = function (showLoginModal) {
            $scope.isLoggedIn = SIS.Model.UserService.isUserLoggedIn();

            if (!$scope.isLoggedIn) {
                if (typeof showLoginModal === 'boolean' && showLoginModal) {
                    SIS.Controllers.Login.redirectToLogin($location, SIS.Controllers.Login.returnChecks.SIS_IS_USER_LOGGED_IN);
                } else {
                    $location.path('user/' + $routeParams.userId).search({}).replace();
                }
            }
        };

        var _populate = function (data) {
            //Fill the model with the project data
            $scope.project = data;

            //Create blank tags array if none exists
            $scope.project.tags = $scope.project.tags || [];
            $scope.project.projectTypeList = $scope.project.projectTypeList || [];

            //Populate the date
            $scope.project.releaseMonth = 1;
            if (data.releaseDate) {
                var date = data.releaseDate.split('/'),
                    m = parseInt(date[0]) - 1,
                    y = parseInt(date[1]);
                $scope.project.releaseMonth = SIS.Utils.getMonths()[m];
                $scope.project.releaseYear = y;
                delete data.releaseDate;
            }

            //Use Collaborator list to populate the role
            if (data.collaborators && data.collaborators.length > 0) {
                var myId = $routeParams.userId;
                for (var i = 0; i < data.collaborators.length; i++) {
                    if (data.collaborators[i].joinedDateTime) {
                        $scope.nonPendingCollaborators.push(data.collaborators[i]);
                    }
                    if (myId === data.collaborators[i].user.id) {
                        _myCollaboratorId = data.collaborators[i].id;
                        $scope.project.role = data.collaborators[i].role;
                        $scope.originalRole = $scope.project.role;
                    }
                }

                $scope.project.company = $scope.project.agencyList && $scope.project.agencyList.length ? $scope.project.agencyList[0] : undefined;

                $scope.project.role = $scope.currentUser && $scope.currentUser.profile && $scope.currentUser.profile.currentTitle && !$scope.project.role ? $scope.currentUser.profile.currentTitle : $scope.project.role;

                $scope.project.collaborators = data.collaborators;

                //Change the text on the button if you are not the only collaborator.
                $scope.leaveButtonText = $scope.nonPendingCollaborators.length > 1 ? $scope.leaveButtonText : 'Remove';
                $scope.leaveHeaderText = $scope.nonPendingCollaborators.length > 1 ? $scope.leaveHeaderText : 'Remove project';
                $scope.leaveCopyText = $scope.nonPendingCollaborators.length > 1 ? $scope.leaveCopyText : 'Remove this project from your profile.';
                $('.edit-project-upload-button').on('invalid', function(e){
                    var msg = '';
                    e.reasons.forEach(function(reason,i){
                        msg += reason.message;
                        msg = i > e.reasons.length -1 ? msg + ',' : msg;
                    });
                    console.log('msg:', msg);
                    $alert.error('AE018', [msg])
                });
            }

            //Rip any break tags out of the description
            data.description = data.description ? data.description.replace(/(<br \/>|<br\/>|<br>)/g, '\r\n') : '';

            if ($scope.$root) {
                $scope.$root.loading = false;
            }
            $scope.$apply();
            //$('.validator-input').trigger('change');
            _populated = true;


        };

        var _updateRole = function (callback) {
            SIS.Model.ProjectService.updateRole({
                projectID:      $routeParams.projectId,
                collaboratorID: _myCollaboratorId,
                roles:           [$scope.project.role].join(','),
                success:        function (data) {
                    typeof callback === 'function' && callback(data);
                },
                error:          function (xhr, status, response) {
                    $('#alert').alert('show', 'error', 'Could not update project: role update failed.');
                    console.error("update role failed:", response);
                }
            });
        };

        var _confirmNavigation = function (e) {
            e = e || window.event;
            var message = 'Your changes have not been published to the project yet.';
            if (e) {
                e.returnValue = message;
            }

            return message;
        };

        /********************
         * PUBLIC METHODS
         *********************/
        $scope.reCrop = function () {
            $('.edit-project-upload-cover-button').trigger('recrop');
        };

        $scope.modelChanged = function () {
            if (_populated) {
                window.onbeforeunload = _confirmNavigation;
                $scope.editProjectForm.$setDirty();
                $scope.projectChanged = true;
            }
        };

        $scope.saveProject = function () {
            var saveFunction = function (projectData) {
                if (!_$form.is('.ng-pristine') && !_$form.is('.ng-invalid')) {
                    SISAX.trackEvent('editProject_submit', SISAX.cats.PROJECT, {
                        'project': $routeParams.projectId
                    });
                    var opts = {
                        'data':    projectData,
                        'scope': $scope,
                        'success': function (response, status, xhr) {
                            SISAX.trackEvent('editProject_submit_success', SISAX.cats.PROJECT, {
                                "project": response.id
                            });
                            $alert.success('PS008'); // Your project was successfully updated
                            SIS.Model.ProjectService.addProject(response);
                            $scope.projectChanged = false;
                            window.onbeforeunload = undefined;
                            $location.path("/project/" + response.id).search({});
                            $scope.saving = false;
                        },
                        'error':   function (xhr, status, error) {
                            $('#alert').alert('show', 'error', 'Could not submit project. Error: ' + error);
                            $scope.saving = false;
                            SISAX.trackEvent("createProject_submit_error", SISAX.cats.PROJECT, {
                                "time":  new Date().getTime(),
                                "error": error
                            });
                        }
                    };

                    if ($scope.originalRole !== $scope.project.role) {
                        _updateRole(function (response) {
                            SIS.Model.ProjectService.updateProject(opts);
                        });
                    } else {
                        SIS.Model.ProjectService.updateProject(opts);
                    }
                } else {
                    SISAX.trackEvent('editProject_submit_invalid', SISAX.cats.PROJECT, {
                        'reasons': 'notTrackedYet',
                        'project': $routeParams.projectId
                    });
                    _$form.addClass('show-invalid');
                    var $errorEls = $('.sis-input-wrap.ng-invalid, .sis-input-wrap.ng-required.ng-pristine');
                    if ($errorEls.length > 0) {
                        $('html, body').animate({
                            scrollTop: $('.sis-input-wrap.ng-invalid, .sis-input-wrap.ng-required.ng-pristine').offset().top - 100
                        }, 1000);
                    }

                }
            };

            //TODO: fix this;
            //$('.add-project-tags').trigger('submitTagManually');
            if ($scope.projectChanged && !$scope.saving) {
                //TODO: this should eventually be replaced and we shouldn't need a filter.
                var filteredProject = SIS.Model.ProjectService.putFilter($.extend(true, {}, $scope.project)),
                    uploadingAssets = 0,
                    thisCounter;

                //Figure out if there are any uploads going on.
                $('[files-uploading]').each(function () {
                    thisCounter = parseInt($(this).attr('files-uploading'));
                    uploadingAssets += thisCounter;
                });

                if (uploadingAssets > 0) {

                    var verb = uploadingAssets > 1 ? 'are' : 'is',
                        fileWord = uploadingAssets > 1 ? 'files' : 'file';

                    $('#alert').alert('show', 'warning', uploadingAssets + ' ' + fileWord + ' ' + verb + ' ' + 'still uploading');
                } else {
                    $scope.saving = true;
                    saveFunction(filteredProject);
                }

            } else if (!_$form.is('.ng-invalid')) {
                _$form.addClass('show-invalid');
                var $errorEls = $('.sis-input-wrap.ng-invalid, .sis-input-wrap.ng-required.ng-pristine');
                if ($errorEls.length > 0) {
                    $('html, body').animate({
                        scrollTop: $('.sis-input-wrap.ng-invalid, .sis-input-wrap.ng-required.ng-pristine').offset().top - 100
                    }, 1000);
                }
            } else {
                $location.path('/project/' + $routeParams.projectId).search({});
            }

        };

        $scope.cancelChanges = function () {
            if ($scope.projectChanged) {
                $scope.confirmLeaving('/project/' + $routeParams.projectId);
            } else {
                $location.path('/project/' + $routeParams.projectId).search({});
            }
        };
        $scope.setEditAutocomplete = function (modelName, controllerName) {
            return function (item) {
                if (item) {
                    $scope.project[modelName] = item.text;
                    $timeout(function () {
                        $scope.editProjectForm[controllerName + 'Wrap'].inner[controllerName].$setViewValue(item.text);
                    });
                    $scope.modelChanged()

                }
            };

        };

        $scope.showEmbedModal = function (target) {
            _$embedModal = $modal($scope, {
                'template': _projectEmbedTemplates[target] || 'there is no template specified for target: ' + target,
                'title':    'Embed a Project File',
                'subtitle': 'Add a URL for YouTube or Vimeo video, Slideshare slideshow or Soundcloud sound.',
                'buttons':  [
                    {
                        'text':       'EMBED',
                        'submitText': "EMBEDDING",
                        'class':      'sis-button-primary embed-' + target + '-asset-modal-submit-button float-right',
                        'click':      function (e) {

                        }
                    },
                    {
                        'text':  'Cancel',
                        'class': 'sis-button-link float-right',
                        'click': function (e) {
                            _$embedModal.hide();
                        }
                    }
                ]
            }).resize().show();
        };

        $scope.addCollaborators = function () {
            SIS.Controllers.Collaborator.manageCollaborators($scope, $modal, $alert, $timeout, {
                'project': $scope.project
            });
        };

        $scope.removeCollaborator = function () {
            var isLastUser = $scope.nonPendingCollaborators.length === 1,
                id;
            // Check if current user is the last non-pending user
            if (isLastUser) {
                $scope.confirmation = 'Are you sure you want to remove yourself? Removing yourself from the project removes the project from your profile.';
            } else {
                $scope.confirmation = 'Are you sure you want to remove yourself? Removing yourself as a team member removes this project from your profile.';
            }

            // Get the collaborator ID of the current user
            $scope.project.collaborators.forEach(function (collaborator, i) {
                if (collaborator.user.id === $scope.thisUser.id) {
                    id = collaborator.id;
                    return;
                }
            });

            SISAX.trackEvent("removeCollaboratorFromProject_start", SISAX.cats.PROJECT, {
                "project":      $scope.project.id,
                "collaborator": id
            });

            isLastUser && SISAX.trackEvent("removeProject_start", SISAX.cats.PROJECT, {
                "project":      $scope.project.id,
                "collaborator": id
            });

            var _$removeCollabModal = $modal($scope, {
                template: $('#sis-confirmation-template').html(),
                title:    $scope.leaveButtonText,
                buttons:  [
                    {
                        'text':  'Yes',
                        'class': 'sis-button-primary',
                        'click': function (e) {
                            e.preventDefault();

                            var $button = $(this);
                            SIS.Model.CollaboratorService.removeCollaborator({
                                projectID:      $scope.project.id,
                                collaboratorID: id,
                                success:        function () {
                                    // Remove the project from the cache so it is reloaded fresh
                                    SIS.Model.ProjectService.deleteProject($scope.project.id);

                                    SISAX.trackEvent("removeCollaboratorFromProject_success", SISAX.cats.PROJECT, {
                                        "project":      $scope.project.id,
                                        "collaborator": id
                                    });

                                    // Update the path to the project
                                    $scope.projectChanged = false;
                                    if (isLastUser) {
                                        SISAX.trackEvent("removeProject_success", SISAX.cats.PROJECT, {
                                            "project":      $scope.project,
                                            "collaborator": id
                                        });
                                        $location.search('view', null);
                                        $location.search('projectId', null);
                                        $location.search('refreshProjects', 'true');
                                    } else {
                                        $location.path('/project/' + $scope.project.id);
                                    }
                                    $scope.$apply();

                                    // Hide the modal
                                    $button.trigger('hide');
                                },
                                error:          function (response) {
                                    $('#alert').alert('show', 'error', 'Could not remove team member. Error: ' + response.errorMsg || response.errorCode);
                                    SISAX.trackEvent("removeCollaboratorFromProject_error", SISAX.cats.PROJECT, {
                                        "project":      $scope.project.id,
                                        "collaborator": id,
                                        "error":        response
                                    });
                                    isLastUser && SISAX.trackEvent("removeProject_error", SISAX.cats.PROJECT, {
                                        "project":      $scope.project.id,
                                        "collaborator": id,
                                        "error":        response
                                    });
                                }
                            });
                        }
                    },
                    {
                        'text':  'No',
                        'class': 'sis-button-secondary',
                        'click': function (e) {
                            e.preventDefault();
                            SISAX.trackEvent("removeCollaboratorFromProject_cancel", SISAX.cats.PROJECT, {
                                "project":      $scope.project.id,
                                "collaborator": id
                            });
                            $(this).trigger('hide');
                        }
                    }
                ]
            }).resize().show();
        };

        $scope.confirmLeaving = function (nextPath, nextSearch, message) {
            message = message || 'Your changes have not been published to the project. Are you sure you want to continue?';

            $scope.modal = $modal($scope, {
                template: '<div class="sis-unsaved-changes-text">' + message + '</div>',
                title:    "Unsaved Changes",
                buttons:  [
                    {
                        'text':  'YES',
                        'class': 'sis-button-primary',
                        'click': function (e) {
                            e.preventDefault();
                            $scope.projectChanged = false;
                            window.onbeforeunload = undefined;
                            $location.path(nextPath);
                            $location.search(nextSearch ? nextSearch : {});
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
                            $(this).trigger('hide');
                        }
                    }
                ]
            }).show();

        };

        $scope.assignPrimaryAssetMetaData = function (metaData) {
        };

        $scope.assignSecondaryAssetMetaData = function (metaData) {
        };

        $scope.requestAward = function () {
            var errorUpdating = false;
            var requestSuccess = false;
            $scope.addAwardModal = $modal($scope, {
                template:   $('#sis-add-award-template').html(),
                title:      "Request an Award",
                subtitle:   "Did this project win an award? Request to have it added!",
                beforeShow: function () {
                    //$scope.newRole = $scope.myCollab.role;
                    $scope.tempAward = {
                        institution:     "",
                        cateogry:        "",
                        level:           "",
                        year:            "",
                        logoMediaObject: {}
                    };
                    //_setUploadListeners.call($(this).find(".sis-add-award-logo-upload")[0]);
                },
                afterShow:  function () {

                },
                afterHide:  function () {
                    if (errorUpdating) {
                        $('#alert').alert('show', 'error', 'Oops! Could not request an award. Please try again soon.');
                    } else if (requestSuccess) {
                        $("#alert").alert('show', 'success', 'You have successfully requested an award to be added to your project.');
                    }
                },
                buttons:    [
                    {
                        'text':       'Request Award',
                        'class':      'sis-button-primary float-right',
                        'submitText': 'Requesting Award',
                        'click':      function () {

                            var $form = $('.sis-modal-form');

                            if ($form.is('.ng-pristine')) {
                                $scope.addAwardModal.hide();
                                return false;
                            }
                            else if ($form.is('.ng-invalid')) {
                                $form.addClass('show-invalid');
                                return false;
                            } else {
                                SIS.Model.AwardService.requestAward({
                                    award:   $scope.tempAward,
                                    user:    $scope.currentUser,
                                    project: $scope.project,
                                    success: function (data) {

                                        requestSuccess = true;
                                        $scope.addAwardModal.hide();
                                    },
                                    error:   function (xhr, status, response) {

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
                        'text':  'CANCEL',
                        'class': 'sis-button-link float-right',
                        'click': function (e) {
                            e.preventDefault();
                            $scope.addAwardModal.hide();
                        }
                    }
                ]
            }).show();
        };

        $scope.filterInstitutions = function (value, callback) {

            SIS.Model.AwardService.filterInstitutions({
                'value':   value,
                'success': function (data) {
                    SIS.Utils.call(callback, undefined, data);
                }
            });
        };

        $scope.setInstitution = function (item, callback) {
            $scope.tempAward.institution = typeof item === "string" ? item : item.text;
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
                'value':       value,
                'success':     function (data) {
                    SIS.Utils.call(callback, undefined, data);
                }
            });
        };

        $scope.setCategory = function (item) {
            $scope.tempAward.category = item.text;
        };

        $scope.filterLevels = function (value, callback) {

            SIS.Model.AwardService.filterLevels({
                'institution': $scope.tempAward.institution,
                'value':       value,
                'success':     function (data) {
                    SIS.Utils.call(callback, undefined, data);
                }
            });
        };

        $scope.setLevel = function (item) {
            $scope.tempAward.level = item.text;
        };

        $scope.removeAward = function (award, index) {
            /*
             $scope.thisProject.awards.splice(index,1);
             return;
             */
            award.removing = true;
            award.removeAward({
                projectId: $scope.thisProject.id,
                award:     award,
                success:   function (data) {
                    $scope.thisProject.awards = data || {awards: []};

                    $scope.$apply();

                },
                error:     function (xhr, status, response) {
                    console.error("remove award failed:", arguments);
                    $("#alert").alert("show", "error", "Deleting award failed (" + status + ")");
                    //award.removing = false;
                    $scope.$apply();
                }
            });
        };

        //TODO: fix this because it doesn't work
        $scope.removeSecondaryAsset = function (index) {
            $scope.project.secondaryAssets.splice(index, 1);
            $scope.modelChanged();

        };

        /********************
         * EVENTS & WATCHERS
         *********************/
        $scope.$on('$routeUpdate', _onRouteChange);
        $scope.$on('$routeChangeSuccess', _onRouteChange);

    };
    namespace.controller.$inject = ['$scope', '$routeParams', '$location', '$modal', '$timeout', '$alert'];
})(SIS.Controllers.ProjectEdit);
