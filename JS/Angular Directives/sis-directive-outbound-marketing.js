//Create your namespace
SIS.namespace("SIS.Directives.OutboundMarketing");

//Define your namespace
(function (namespace) {
    namespace.directive = function ($modal, $timeout, $location, $alert) {
        /********************
         * SETUP
         *********************/
        return {
            'scope': {
                'seededProject': '=outboundMarketingProject'
            },
            'link':  function ($scope, $element) {
                //TODO: fix bug if you open, then immediatly close, then open again
                /********************
                 * VARIABLES
                 *********************/
                $scope.maxMessageLength = 2000; //characters
                $scope.maxProjects = 4;
                $scope.contacts = [];
                var _pageOrder = ['send', 'select', 'preview', 'ready', 'confirmation'],
                    _pageInfo = {
                        'send':         {
                            'buttons':  ['cancel', 'send'],
                            'title':    'Send a Message',
                            'subtitle': 'Include projects you want to share with team members and contacts',
                            'submit':   'send'
                        },
                        'select':       {
                            'buttons':  ['back', 'next'],
                            'title':    'Select Projects to Include',
                            'subtitle': 'Click to select up to ' + $scope.maxProjects + ' to share.',
                            'submit':   'next'
                        },
                        'preview':      {
                            'buttons':  ['back', 'next'],
                            'title':    'Preview',
                            'subtitle': 'Drag and drop to re-order',
                            'submit':   'next'
                        },
                        'ready':        {
                            'buttons':  ['back', 'cancel', 'send'],
                            'title':    'Send a Message',
                            'subtitle': 'Include projects you want to share with team members and contacts',
                            'submit':   'send'
                        },
                        'confirmation': {
                            'buttons':  ['send another'],
                            'title':    'Successfully Sent!',
                            'subtitle': 'You will receive a copy of this message and a follow-up notification when your Folio has been viewed',
                            'submit':   'send another'
                        }
                    },
                    _serviceMap = {
                        'google': 'email'
                    },
                    _pageWatcher, _errorWatcher, _debouncer, _baseSearch, _defaultSubject;
                /********************
                 * PRIVATE METHODS
                 *********************/

                var _changePage = function (page) {
                    if (page === undefined || !$scope.isUserLoggedIn || !$scope.modal) return;
                    //Set the buttons
                    $timeout(function () {
                        $scope.modal.hideButtons(undefined, true).resize();
                        _pageInfo[page].buttons && $scope.modal.showButtons(_pageInfo[page].buttons);

                        //Set the title and subtitle
                        $scope.modal.changeTitle(_pageInfo[page].title);
                        $scope.modal.changeSubtitle(_pageInfo[page].subtitle);
                        page === 'confirmation' && !$scope.message.projects.length && $scope.modal.changeSubtitle('');

                        //Set submit button
                        $scope.modal.setSubmitButton(_pageInfo[page].submit);
                    });
                };

                var _init = function () {
                    $scope.user = SIS.Model.UserService.getCurrentUser();
                    if ($scope.seededProject) {
                        $scope.seededProject.collaborators = SIS.Model.CollaboratorService.sortCollaborators($scope.seededProject.collaborators, $scope.user.id, null, true);
                    }
                    _defaultSubject = $scope.user.firstName + ' ' + $scope.user.lastName + ' has sent you a message via Shocase';
                    _pageWatcher = $scope.$watch('currentPage', function (n) {
                        $timeout(function () {
                            _changePage(n)
                        })
                    });
                    _errorWatcher = $scope.$watch(function () {
                        return $scope.outboundMarketingForm && $scope.outboundMarketingForm.recipientId && $scope.outboundMarketingForm.recipientId.$error && $scope.outboundMarketingForm.recipientId.$error.subscribed;
                    }, function (n) {
                        if (n) {
                            $scope.message.recipient = null;
                        }
                    });
                };

                var _unInit = function () {
                    _reset();
                    _pageWatcher && _pageWatcher();
                    _errorWatcher && _errorWatcher();
                };

                var _handleUserStateChange = function () {
                    $scope.isUserLoggedIn = SIS.Model.UserService.isUserLoggedIn();
                    $scope.isUserLoggedIn ? _init() : _unInit();
                };

                var _searchProjectFromProjectData = function (data) {
                    var seedData;
                    if (data) {
                        seedData = {
                            'id':            data.id,
                            'projectData':   data,
                            'coverImageUrl': SIS.Filters.IsValidImage.filter()(data.coverImage, 'small'),
                            'selected':      true,
                            'choiceNumber':  1
                        };
                    }
                    return seedData;
                };
                var _goBack = function () {
                    if ($scope.currentPage === 'select' && !$scope.previewed) {
                        $scope.message.projects = $scope.seededProject && $scope.seededProject.id ? [_searchProjectFromProjectData($scope.seededProject)] : [];
                        $timeout(function () {
                            $scope.isUserLoggedIn && $scope.filterProjects('', true);
                        });

                    } else if ($scope.currentPage === 'ready' && $scope.message.projects.length <= 1) {
                        $scope.currentPage = 'select';
                        return;
                    }
                    $scope.previewed = $scope.currentPage === 'preview' ? false : $scope.previewed;

                    $scope.currentPage = _pageOrder[$.inArray($scope.currentPage, _pageOrder) - 1];
                };

                var _next = function () {
                    var me = this;

                    $scope.currentPage !== 'select' && $(me).trigger('success');

                    switch ($scope.currentPage) {
                        case 'select':
                            if ($scope.message.projects.length === 0) {
                                $scope.currentPage = 'send';
                            } else {
                                if ($scope.loadingProjectData) return;
                                $scope.loadingProjectData = true;
                                var projectArray = [];

                                $scope.message.projects.forEach(function (project) {
                                    projectArray.push(project.id);
                                });

                                SIS.Model.ProjectService.batchRequestProjects({
                                    'scope':    $scope,
                                    'projects': projectArray,
                                    'success':  function (response) {
                                        $scope.loadingProjectData = false;
                                        $.isArray(response) && response.forEach(function (projectData) {
                                            projectData.collaborators = SIS.Model.CollaboratorService.sortCollaborators(projectData.collaborators, $scope.user.id, null, true);
                                            $scope.message.projects.forEach(function (selectedProject) {
                                                if (selectedProject.id === projectData.id) {
                                                    selectedProject.projectData = projectData;
                                                }
                                            });
                                        });
                                        $(me).trigger('success');
                                        if ($scope.message.projects.length === 1) {
                                            $scope.currentPage = 'ready';
                                            $scope.previewed = true;
                                        } else {
                                            $scope.currentPage = 'preview';
                                            $timeout(function () {
                                                $('.sis-outbound-marketing-preview-project-list').sortable({
                                                    'tolerance':   'pointer',
                                                    'cursor':      'move',
                                                    'scroll':      false,
                                                    'update':      _handleSort,
                                                    'cancel':      '.first',
                                                    'start':       function () {
                                                        $scope.sorting = true;
                                                        $scope.$apply();
                                                    },
                                                    'stop':        function () {
                                                        $scope.sorting = false;
                                                        $scope.$apply();
                                                    },
                                                    'placeholder': {
                                                        element: function ($el, ui) {
                                                            $el = $el.clone();
                                                            $el.find('.sis-outbound-marketing-modal-preview-project-title').remove();
                                                            return $('<li class="ui-sortable-placeholder sis-outbound-marketing-preview-project">' + $el[0].innerHTML + '</li>');
                                                        },
                                                        update:  function (e, ui) {
                                                        }
                                                    }
                                                }).disableSelection();
                                            });
                                        }
                                    },
                                    'error':    function () {
                                        console.warn('error loading projects');
                                        $scope.loadingProjectData = false;
                                        $(me).trigger('success');
                                        $scope.currentPage = 'send';
                                    }
                                });
                            }
                            break;
                        case 'ready':
                            $scope.currentPage = 'select';
                            break;
                        default:
                            $scope.currentPage = _pageOrder[$.inArray($scope.currentPage, _pageOrder) + 1];
                            break;
                    }
                };

                var _handleSort = function () {
                    var $list = $('.sis-outbound-marketing-preview-project').attr('style', ''),
                        ids = Array.prototype.slice.call($list.map(function () {
                            return $(this).attr('data-id');
                        })),
                        reOrderedProjects = [],
                        l = $scope.message.projects.length,
                        i;

                    ids.forEach(function (id) {
                        for (i = 0; i < l; i++) {
                            if ($scope.message.projects[i].id === id) {
                                reOrderedProjects.push($scope.message.projects[i]);
                                break;
                            }
                        }
                    });
                    $scope.message.projects = reOrderedProjects;
                    $scope.message.projects.forEach(function (project, index) {
                        project.choiceNumber = index + 1;
                    });
                    $scope.$apply();
                };

                var _sendMessage = function () {
                    var me = this,
                        message = $.extend({}, $scope.message),
                        opts = {
                            'scope':   $scope,
                            'message': message,
                            'success': function (response) {
                                $scope.sending = false;
                                $(me).trigger('success');
                                $scope.currentPage = 'confirmation';
                            },
                            'error':   function () {
                                console.warn('sending message failed');
                                $scope.sending = false;
                                $alert.error('AE017');
                                $(me).trigger('success');
                            }
                        }, projects = [];
                    message.projects.forEach(function (project) {
                        projects.push(project.id)
                    });
                    message.projects = projects;

                    $scope.user.sendOutboundMarketing(opts);

                };

                var _reset = function (seedProject) {
                    var _default = {
                        'projects': seedProject ? [seedProject] : [],
                        'message':  '',
                        'subject':  _defaultSubject
                    };
                    $scope.currentPage = 'send';
                    $scope.recipientText = null;
                    $scope.showErrors = false;
                    $scope.message = _default;
                    $scope.projectList = [];
                    _baseSearch = null;
                    $scope.isUserLoggedIn && $scope.filterProjects('', true);
                    _changePage($scope.currentPage);
                    $scope.outboundMarketingForm && $scope.outboundMarketingForm.$setPristine();

                };
                var _resetProjectList = function () {
                    var match;
                    $.isArray($scope.projectList) && $scope.projectList.forEach(function (project) {
                        match = false;
                        $scope.message.projects.forEach(function (selectedProject) {
                            match = match || selectedProject.id === project.id;
                        });
                        if (!match) {
                            delete project.selected;
                            delete project.choiceNumber;
                            delete project.forced;
                        }
                    });
                };
                var _showOutboundMarketingModal = function () {
                    if (!$scope.seededProject || ($scope.seededProject && $scope.seededProject.coverImage.state !== 'processing')) {
                        $scope.modal = $modal($scope, {
                            'template':            $('#sis-outbound-marketing-modal-template').html(),
                            'buttons':             [
                                {
                                    'text':  'back',
                                    'class': 'sis-button-link sis-outbound-marketing-back-button float-left',
                                    'click': function () {
                                        _goBack();
                                        $scope.$apply();
                                    }
                                },
                                {
                                    'text':  'cancel',
                                    'class': 'sis-button-link float-left',
                                    'click': function () {
                                        $scope.modal.hide();
                                    }
                                },
                                {
                                    'text':  'close',
                                    'class': 'sis-button-link',
                                    'click': function () {
                                        $scope.modal.hide();
                                    }
                                },
                                {
                                    'text':       'send',
                                    'submitText': 'Sending',
                                    'class':      'sis-button-primary sis-outbound-marketing-send-button right',
                                    'click':      function () {
                                        var me = this;
                                        if ($scope.outboundMarketingForm.$valid && !$scope.sending) {
                                            $timeout(function () {
                                                $scope.sending = true;
                                                _sendMessage.call(me);
                                            });
                                        } else {
                                            $timeout(function () {
                                                $scope.showErrors = true;
                                            });
                                            return false;
                                        }
                                    }
                                },
                                {
                                    'text':       'next',
                                    'submitText': 'Loading',
                                    'class':      'sis-button-primary sis-outbound-marketing-next-button right',
                                    'click':      function () {
                                        var me = this;
                                        $timeout(function () {
                                            _next.call(me);
                                        });
                                    }
                                },
                                {
                                    'text':  'send another',
                                    'class': 'sis-button-primary sis-outbound-marketing-send-another-button right',
                                    'click': function () {
                                        $timeout(function () {
                                            _reset();
                                        });
                                    }
                                }
                            ],
                            'beforeShow':          function () {
                                // In case the modal has changed
                                $scope.modal = this;

                                $scope.isUserLoggedIn && $scope.user.getAllCollaborators({
                                    'scope':   $scope,
                                    'success': function (response) {
                                        $scope.contacts = $scope.contacts.concat(response);
                                        $scope.contacts.forEach(function (contact) {
                                            contact.text = contact.firstName + ' ' + contact.lastName;
                                            contact.type = 'people';
                                            contact.service = 'user';
                                            contact.itemId = contact.id;
                                            contact.profileImageUrl = SIS.Filters.IsValidImage.filter()(contact.profileImage, 'tiny', SIS.Model.MediaService.getPlaceholderImage('no-profile-image.jpg'));
                                        });
                                    },
                                    'error':   function () {
                                        console.warn('error fetching first degree collaborators');
                                    }
                                });
                                $timeout(function () {
                                    $scope.currentPage = null;
                                    _reset(_searchProjectFromProjectData($scope.seededProject));
                                });
                            }
                        }).show();
                    } else {
                        console.log('should error');
                        $alert.error('W004');
                    }

                };

                /********************
                 * PUBLIC METHODS
                 *********************/
                $scope.next = _next;
                var _remainingSpacesArray = [];
                $scope.getRemainingSpacesArray = function () {
                    var message = $scope.message || {},
                        projects = message.projects || [],
                        i = 0,
                        l = $scope.maxProjects - projects.length;
                    _remainingSpacesArray.splice(l, _remainingSpacesArray.length);
                    for (i; i < l; i++) {
                        _remainingSpacesArray.push(Math.random());
                    }
                    return _remainingSpacesArray;
                };

                $scope.getNumber = function () {
                    return $scope.message.projects.length >= $scope.maxProjects ? $scope.maxProjects : $scope.message.projects.length + 1;
                };

                $scope.removeProject = function (index) {
                    delete $scope.message.projects[index].selected;
                    delete $scope.message.projects[index].forced;
                    $scope.message.projects.splice(index, 1);
                    $scope.previewed = $scope.message.projects.length === 0 ? false : $scope.previewed;
                };

                $scope.filterProjects = function (query, force) {
                    if (query === undefined && !force) return;
                    var callback = function (data) {
                        //Don't execute callback unless we're currently loading;
                        if (!$scope.loadingProjects) return;
                        $scope.loadingProjects = false;

                        //Set the base search if it doesn't exist
                        if (query === '' && !_baseSearch) {
                            _baseSearch = $.extend({}, data);
                        }

                        //Process the data
                        var forcedProjects = [];
                        $scope.message.projects.forEach(function (p, i) {
                            var index = data.itemsMap[p.id] > -1 ? data.itemsMap[p.id] : -1;
                            if (index > -1) {
                                data.itemsArray[index].selected = true;
                                data.itemsArray[index].choiceNumber = i + 1;

                            } else {
                                p.forced = true;
                                forcedProjects.push(p);
                            }
                        });
                        $timeout(function () {
                            $scope.projectList = forcedProjects.concat(data.itemsArray);
                            _resetProjectList();
                        });
                    };

                    $scope.loadingProjects = true;

                    if (_baseSearch && query === '') {
                        callback(_baseSearch);
                    } else {
                        var search = {
                            'category':       'project',
                            'keywords':       query,
                            'facetMap':       {
                                'collaborators': [$scope.user.id]
                            },
                            'resultsPerPage': 300
                        };
                        _debouncer && window.clearTimeout(_debouncer);
                        _debouncer = window.setTimeout(function () {
                            _debouncer = null;
                            SIS.Model.SearchService.requestSearchResults(search, callback);
                        }, 1000);
                    }
                };

                $scope.handleProjectClick = function (project) {
                    var projects = $scope.message.projects,
                        index = -1,
                        pIndex = -1,
                        i = 0,
                        l = $scope.projectList.length;

                    projects.forEach(function (selectedProject, i) {
                        index = project.id === selectedProject.id ? i : index;
                    });

                    //if (projects.length >= $scope.maxProjects && index === -1) return;

                    if (project.selected && index > -1) {
                        projects.splice(index, 1);
                        delete project.selected;
                        delete project.choiceNumber;
                        if (project.forced) {
                            for (i; i < l; i++) {
                                if ($scope.projectList[i].id === project.id) {
                                    pIndex = i;
                                    break;
                                }
                            }
                            $scope.projectList.splice(pIndex, 1);
                            delete project.forced;
                        }
                    } else {
                        if (projects.length >= $scope.maxProjects) {
                            var old = projects.pop();
                            delete old.selected;
                            delete old.forced;
                        }
                        project.selected = true;
                        projects.push(project);
                    }
                    //Re calculate the numbers of the projects after changes
                    projects.forEach(function (project, index) {
                        project.choiceNumber = index + 1;
                    });
                    _resetProjectList();
                };
                $scope.viewMessage = function () {
                    var search, projects = [];
                    $scope.message.projects.forEach(function (project) {
                        projects.push(project.id);
                    });
                    search = {
                        'sender':   $scope.user.id,
                        'projects': projects.join(',')
                    };
                    $scope.modal.hide();
                    $location.search($.extend($location.search(), search));
                    $location.path('/outboundMarketing');
                };

                $scope.getContacts = function (value, callback) {
                    var filteredContacts = SIS.Model.Autocomplete.filterItems($scope.contacts, value);

                    // Send the filtered contacts to autocomplete
                    SIS.Utils.call(callback, undefined, filteredContacts);

                    // Cache the filtered contacts
                    SIS.Model.Autocomplete.cacheItems({
                        'type':  'contacts',
                        'value': value,
                        'items': filteredContacts
                    });

                    SIS.Model.Autocomplete.getItems({
                        'type':     'contacts',
                        'value':    value,
                        'callback': callback
                    });
                };

                $scope.setRecipient = function (item) {
                    item.service = _serviceMap[item.service] || item.service;
                    $scope.message.recipientId = item.itemId;
                    $scope.message.recipientType = item.service;
                    $scope.message.recipient = item;
                    $scope.recipientText = item.text;
                };

                // Contact Import
                $scope.showContactFooterItem = function (category, type) {
                    return SIS.Model.UserService.getCurrentUser() && !SIS.Model.UserService.getCurrentUser().hasConnectedService(type);
                };
                // $scope.importAddressBook = function () {
                // SIS.Controllers.AddressBook.showImportModal($scope, $modal, true);
                // };
                $scope.importContacts = function (type) {
                    // SIS.Controllers.AddressBook.showImportModal($scope, $modal, true);
                    SIS.Model.Oauth.startOauth({
                        'type':       type,
                        'forceOauth': true,
                        'success':    function (data, preventAlert) {
                            // Alert the user
                            !preventAlert && $alert.success('AS011', [type.toTitleCase()]); // You have successfully imported your {0} contacts.
                            console.log(data, type);
                            SIS.Model.Contacts.getContactData(type).requestContacts();
                            SIS.Model.Autocomplete.clearCache();
                        },
                        'error':      function (preventAlert) {
                            !preventAlert && $alert.error('AE012'); // 'Your contacts cannot be imported at this time. Please try again later.'
                        }
                    });
                };

                $scope.removeRecipient = function (skipText) {
                    $scope.message.recipient = null;
                    $scope.recipientText = skipText ? $scope.recipientText : null;
                    $scope.message.recipientId = null;
                    $scope.message.recipientType = null;
                };

                $scope.checkIfEmail = function () {
                    var isEmail = SIS.Directives.Validators.testEmail($scope.recipientText);
                    if (!isEmail) return;
                    $scope.message.recipientId = $scope.recipientText;
                    $scope.message.recipientType = 'email';
                    $scope.message.recipient = {
                        'recipientId':     $scope.recipientText,
                        'recipientType':   'email',
                        'text':            $scope.recipientText,
                        'profileImageUrl': SIS.Model.MediaService.getPlaceholderImage('no-profile-image.jpg')
                    };

                };

                $scope.submitRecipient = function (e) {
                    var keyMap = SIS.Utils.getKeyMap();
                    switch (e.keyCode) {
                        case keyMap.enter:
                            e.preventDefault();
                            $timeout(function () {
                                $('textarea').focus();
                            });
                            break;
                    }
                };

                $scope.Math = window.Math;
                $scope.projectHeight = 124;
                $scope.projectWidth = 205;

                /********************
                 * PUBLIC PAGES STUFF
                 *********************/
                $scope.isUserLoggedIn = SIS.Model.UserService.isUserLoggedIn();
                $scope.$on(SIS.Model.UserService.EVENT_USER_STATE_CHANGE, _handleUserStateChange);
                _handleUserStateChange();

                /********************
                 * INIT
                 *********************/
                $element.on('click', _showOutboundMarketingModal);
            }
        }
    };
    namespace.directive.$inject = ['$modal', '$timeout', '$location', '$alert'];
})(SIS.Directives.OutboundMarketing);
