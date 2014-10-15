//Create your namespace
SIS.namespace("SIS.Directives.AddProject");

//Define your namespace
(function (namespace) {
    namespace.directive = function ($modal, $socket, $timeout, $compile, $location) {
        return {
            scope: true,
            link:  function ($scope, $element, $attrs) {
                /********************
                 * PRIVATE METHODS
                 *********************/
                var _handleUserStateChange = function () {
                    $scope.currentUser = SIS.Model.UserService.getCurrentUser();
                    // Watcher for the profile
                    $scope.$watch('currentUser.profile.currentTitle', function (n) {
                        if ($scope.currentUser && $scope.currentUser.profile) {
                            _currentRole = $scope.currentUser.profile.currentTitle || _currentRole;
                        }
                    });
                };

                var _init = function () {
                    // Scope Variables
                    $scope.projectPrefill = $scope[$attrs.addProjectPrefill];
                    $scope.newProject = $scope.projectPrefill || {};

                    $scope.step = 'asset';
                    // Event Binding
                    $element.on('click', _showAddProjectModal);

                    // Handling Login/out
                    $scope.isUserLoggedIn = SIS.Model.UserService.isUserLoggedIn();
                    _handleUserStateChange();
                    $scope.$on(SIS.Model.UserService.EVENT_USER_STATE_CHANGE, _handleUserStateChange);
                };

                var _assetAdded = function (e) {
                    $scope.addProjectModal.changeTitle("Tell Us About Your Project");
                    $('.add-project-asset-preview .sis-asset').remove();
                    $('.add-project-asset-preview').append($compile('<div asset="newProject.primaryAsset" preview asset-size="tiny" asset-max-height="200"></div>')($scope));
                    $timeout(function () {
                        $scope.newProject.primaryAsset && $scope.addProjectModal.showButtons(['Back', 'Publish', 'Cancel']).hideButtons('Next', true).resize().reinitInputs(true);
                        $scope.step = 'info';
                        $timeout(function () {
                            var $title = $('input[name="addProjectName"]'),
                                $type = $('input[name="addProjectType"]');

                            if ($title.val() && $title.val().length > 0) {
                                $type.focus();
                            } else {
                                $title.focus();
                            }
                            $scope.newProject.primaryAsset && $scope.addProjectModal.setSubmitButton('Publish');
                        });
                    }, 50);
                };

                var _createAddProjectModal = function () {
                    $scope.addProjectModal = $modal($scope, {
                        template:   $('#sis-add-project-modal-template').html(),
                        title:      'Upload or Embed a Project File',
                        buttons:    [
                            {
                                'text':       'Publish',
                                'submitText': 'Publishing',
                                'class':      'sis-button-primary sis-add-project-publish right',
                                'click':      function (e) {
                                    if ($scope.publishing) return false;
                                    $scope.publishing = true;

                                    if ($scope.addProjectForm && $scope.addProjectForm.$valid) {
                                        $timeout(function () {
                                            console.log('should publish project');
                                            _publishProject(e);
                                        });
                                    } else {
                                        $scope.publishing = false;
                                        $timeout(function () {
                                            $scope.showErrors = true;
                                        });
                                        return false;
                                    }
                                }

                            },
                            {
                                'text':  'Back',
                                'class': 'sis-button-secondary left',
                                'click': _reset
                            },
                            {
                                'text':  'Cancel',
                                'class': 'sis-button-link',
                                'click': function (e) {
                                    $(this).trigger('hide');
                                    $scope.step = 'asset';
                                }
                            },
                            {
                                'text':  'Next',
                                'class': 'sis-button-primary embed-next-button right'
                            }
                        ],
                        beforeShow: function () {
                            var $modal = $('.add-project-modal');
                            $scope.addProjectModal.resize().hideButtons().hideButtons('Next', true);
                            $modal.on('embedded filesuccess', _assetAdded)
                                .on('preview cleared', function (e) {
                                    $timeout(function () {
                                        $scope.addProjectModal.resize();
                                        if (e.type === 'preview') {
                                            $scope.addProjectModal.showButtons('Next');
                                            $('.embed-next-button').focus();
                                        } else if (e.type === 'cleared') {
                                            $scope.addProjectModal.hideButtons('Next');
                                        }
                                    });
                                })
                                .on('cancel', _reset)
                                .on('invalid', function (e) {
                                    $scope.step = 'error';
                                    $scope.addProjectModal.showButtons('Back');
                                    $scope.errorReasons = e.reasons || [];
                                });
                        },
                        afterShow:  function () {
                            $scope.addProjectModal.resize().hideButtons().hideButtons('Next', true);
                        },
                        afterHide:  function () {
                            $('.add-project-modal').off('embedded filesuccess').off('preview cleared').off('cancel');
                            _reset();
                        }
                    });

                    SISAX.trackEvent('addProject_show', SISAX.cats.PROJECT);
                    return $scope.addProjectModal;
                };

                var _reset = function (e) {
                    $timeout(function () {
                        var $modalForm = $scope.addProjectModal.$form;
                        $scope.method = undefined;
                        $('.add-project-asset-preview .sis-asset').remove();
                        $('.add-project-asset-progress').removeClass('sis-asset-state-processing').attr('data-id', '');
                        $scope.newProject = $scope.projectPrefill || {};
                        $scope.addProjectModal.hideButtons().hideButtons('Next', true).changeTitle("Upload a Project File");
                        $modalForm.removeClass('show-invalid');
                        $modalForm.trigger('setpristine');
                        $scope.step = 'asset';
                        $('.add-project-modal').trigger('clear');
                    });
                };

                var _showAddProjectModal = function (e) {
                    _createAddProjectModal();
                    //Timeout so it waits until it can actually read the right data before trying to center
                    $timeout(function () {
                        if ($attrs.addProjectCompany && $attrs.addProjectCompany.length) {
                            $scope.newProject.company = $attrs.addProjectCompany;
                        }
                        $scope.addProjectModal.resize().show();
                    });
                    e.stopPropagation();
                };

                var _publishProject = function (e) {
                    $scope.newProject.role = _currentRole;
                    var project = SIS.Model.ProjectService.putFilter($.extend(true, {}, $scope.newProject)),
                        opts = {
                            'data':    project,
                            'success': function (response, status, xhr) {
                                _reset();

                                if ($location.search().view === 'resume') {
                                    $location.search('view', null);
                                }
                                $scope.$apply(function () {
                                    $scope.publishing = false;
                                    $location.path("/project/" + response.id).search('isNewProject', 'true');
                                });
                                SISAX.trackEvent('addProject_submit', SISAX.cats.PROJECT, {
                                    'project': response.id
                                });
                            },
                            'error':   function (xhr, status, error) {
                                $('#alert').alert('show', 'error', 'Could not create project. Error: ' + error);
                                console.error("publish project error:", error);
                                $(e.target).trigger('error');
                                SISAX.trackEvent('addProject_error', SISAX.cats.PROJECT, {
                                    'error': error
                                });
                            }
                        };
                    SIS.Model.ProjectService.pushProject(opts);
                };

                /********************
                 * PUBLIC METHODS
                 *********************/
                $scope.handleEmbed = function (vendor) {
                    $scope.method = 'embed';
                    $timeout(function () {
                        $scope.addProjectModal.changeTitle('Embed a Project File').changeSubtitle('Add a URL for YouTube or Vimeo video, Slideshare slideshow or Soundcloud sound.');
                        $('.add-project-embed input').focus();
                        $scope.addProjectModal.showButtons('Back').resize();
                    });
                };

                $scope.assignMetaData = function (metaData) {

                    if (metaData.tags) {
                        $scope.newProject.tags = metaData.tags;
                    }
                    if (metaData.description) {
                        $scope.newProject.description = metaData.description;
                    }
                    if (metaData.title) {
                        $scope.newProject.projectName = metaData.title;
                        $timeout(function () {
                            $('input[name="addProjectName"]').change();
                        });
                    }
                };

                $scope.setType = function (item) {
                    $scope.newProject.projectType = item.text;
                    $timeout(function () {
                        $scope.addProjectForm.addProjectTypeWrap.inner.addProjectType.$setViewValue(item.text);
                    });
                };

                /********************
                 * PUBLIC VARIABLES
                 *********************/
                $scope.isUserLoggedIn = SIS.Model.UserService.isUserLoggedIn();

                /********************
                 * PRIVATE VARIABLES
                 *********************/
                var _$eventTarget = $('.add-project-step.select'),
                SLIDE_WIDTH = 625,
                _projectDataMap = {
                    'projectType': 'types'
                },
                _currentRole = 'Other';

                /********************
                 * EVENTS AND WATCHERS
                 *********************/
                $scope.$on(SIS.Model.UserService.EVENT_USER_STATE_CHANGE, _handleUserStateChange);

                /********************
                 * INIT
                 *********************/
                _init();
            }
        };
    };
    namespace.directive.$inject = ['$modal', '$socket', '$timeout', '$compile', '$location'];
})(SIS.Directives.AddProject);
