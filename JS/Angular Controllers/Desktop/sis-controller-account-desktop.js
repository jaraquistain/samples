//Create your namespace
SIS.namespace('SIS.Controllers.Account.Desktop').extend(SIS.Controllers.Account);

//Define your namespace
(function (namespace) {
    namespace.controller = function ($scope, $routeParams, $location, $modal, $timeout, $alert, $rootScope) {
        /********************
         * PARENT CONTROLLER
         *********************/
        namespace.parent().controller.call(this, $scope, $routeParams, $location);

        /********************
         * PRIVATE VARS
         *********************/
        var _currentUser = SIS.Model.UserService.getCurrentUser();
        var EMAIL_REGEX = /^[ \\t]*([a-zA-Z0-9_\.\-])+@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+[ \\t]*$/;
        var DOMAIN_REGEX = /^(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+[ \\t]*$/;

        /********************
         * PUBLIC VARS
         *********************/
        $scope.currentUser = _currentUser;
        $scope.emailTypes = {
            'Collaborator':      'Team Member',
            'Comments':          'Comments',
            'Likes':             'Likes',
            'CompanyAdmin':      'Company Admin',
            'OutboundMarketing': 'Messages via ' + SIS.PRODUCT_NAME
        };
        $scope.options = ['a', 'b', 'c', 'd'];
        $scope.inviteSortType = '-time';

        /********************
         * PRIVATE METHODS
         *********************/
        var _init = function () {
            //var testForm = angular.element('#test-form').length > 0 ? angular.element('#test-form').scope().testForm : undefined;
            // $scope.testFormData = $scope.testFormData || {};
            // $scope.testFormData.first = 'Jonathan';
            // $scope.testFormData.email = 'jon@jon.com';
            $scope.showLinkedInTest = $location.search().linkedInTest && $location.search().linkedInTest !== 'false' && $location.search().linkedInTest !== '0' ? true : false;

            _revertForms();
            _initAdmin();
            _updateContactStatus();

            $rootScope.loading = false;
        };

        var _initAdmin = function () {
            SIS.Utils.getCookie('bootstrapLivefyre') && $('.sis-bootstrap-livefyre').attr('disabled', 'disabled');
            SIS.Utils.getCookie('bootstrapUsers') && $('.sis-bootstrap-users').attr('disabled', 'disabled');

            // Admin only settings
            if ($scope.currentUser && $scope.$root.checkRole('livefyre')) {
                SIS.Model.LiveFyre.registerLFUser(function () {
                    $scope.livefyreAdminHref = 'http://admin.' + (this.network || 'socialinsoma.fyre.co') + '/admin/content?lftoken=' + this.token;
                    $scope.$apply();
                });

                $scope.isCurrentUserAdmin = true;
            }
        };

        var _getNotificationStatus = function () {
            var opts = {
                    'scope':   $scope,
                    'success': function (response) {
                        var i = 0,
                            l = response.emailTypes.length;
                        $scope.tempEmailPrefs = $scope.tempEmailPrefs || {};
                        for (i; i < l; i++) {
                            $scope.tempEmailPrefs[response.emailTypes[i].type] = response.emailTypes[i];
                        }
                    },
                    'error':   function () {
                        console.error('error fetching email preferences');
                    }
                },
                email = $scope.currentUser ? $scope.currentUser.contactDetails.primaryEmail.email : undefined;

            $scope.currentUser && SIS.Model.UserService.retrieveNotificationStatus(email, null, opts);
        };
        var _revertForms = function (formName) {
            var userCopy = $.extend({}, _currentUser),
                resets = {
                    'name':     {
                        'key':   'tempNames',
                        'value': {
                            'firstName': userCopy.firstName,
                            'lastName':  userCopy.lastName
                        }
                    },
                    'password': {
                        'key':   'tempPassword',
                        'value': {
                            'old':     '',
                            'new':     '',
                            'confirm': ''
                        }
                    },
                    'email':    {
                        'key':   'tempContactDetails',
                        'value': {
                            'primaryEmail':    userCopy.contactDetails.primaryEmail,
                            'secondaryEmails': userCopy.contactDetails.secondaryEmails || [],
                            'newEmail':        ''
                        }
                    }
                };
            $timeout(function () {
                for (var reset in resets) {
                    if (!formName || formName === reset) {
                        $scope[resets[reset].key] = resets[reset].value;
                        $("[name='" + reset + "SettingsForm']").trigger('setpristine').removeClass('show-invalid');
                        if (formName) break;
                    }
                }
            });
        };

        var _setNavItem = function (current) {
            if (current) {
                $location.search('current', current);
            } else {
                switch ($location.search().current) {
                    case 'email':
                        $scope.currentNavItem = $location.search().current;
                        _getNotificationStatus();
                        break;
                    case 'createUser':
                        var groups = ['ADMIN', 'CONCIERGE', 'ALPHA', 'USER'],
                            i = $.inArray($scope.currentUser.group, groups);
                        $timeout(function () {
                            $scope.availableGroups = groups.slice(i);
                            $scope.newUser = {
                                'group': 'USER'
                            };
                        });

                        $scope.currentNavItem = $location.search().current;
                        break;
                    case 'password':
                    case 'name':
                    case 'livefyre':
                    case 'bootstrap':
                    case 'company':
                    case 'addressBook':
                    case 'manageGroups':
                        $scope.currentNavItem = $location.search().current;
                        break;
                    case 'claimContent':
                        var user = {};
                        $scope.currentNavItem = $location.search().current;
                        if ($location.search().cpids && $location.search().cpd) {
                            var data = {};
                            data.domain = $location.search().cpd;
                            data.projects = $location.search().cpids.split(',');
                            $scope.claimContentData = data;
                        }
                        if ($location.search().claimContentId) user.id = $location.search().claimContentId;
                        if ($location.search().claimContentName) {
                            var name = $location.search().claimContentName.split(' ');
                            user.firstName = name[0];
                            user.lastName = name[1];
                            $scope.scrapedUserName = $location.search().claimContentName;
                        }
                        user.email = $location.search().claimContentEmail;
                        user.password = $location.search().claimContentPassword;

                        $location.search().claimContentId && $scope.setUserToScrape(user);
                        !$location.search().claimContentId && $scope.claimContentData && claimModal();
                        break;

                    case 'approveInvite':
                        $scope.filterType = 'all';
                        $scope.filterTypeOption = 'invite';
                        $scope.getInvitedUserList();
                        $scope.currentNavItem = $location.search().current;
                        break;
                    case 'carousel':
                        $scope.currentNavItem = $location.search().current;
                        break;
                    default:
                        $scope.currentNavItem = 'email';
                        _getNotificationStatus();
                }
            }
        };

        var _handleInviteSuccess = function (response) {
            $scope.inviteResults = _formatInviteResponse(response);
            $scope.queried = true;
            $scope.$apply();
        };

        var _handleInviteError = function (xhr, status, response) {
            console.error('error fetching invites');
        };

        var _formatInviteResponse = function (rawInviteData) {
            if (!rawInviteData.pendingInvitesTOList) return [];
            var temp = rawInviteData.pendingInvitesTOList,
                i = 0,
                l = rawInviteData.pendingInvitesTOList.length,
                thisInvite, names;
            for (i; i < l; i++) {
                thisInvite = temp[i];
                names = thisInvite.recipientName ? thisInvite.recipientName.split(' ') : [];
                if (!EMAIL_REGEX.test(names[0])) thisInvite.firstName = names[0];
                if (names[1] && names[1] !== 'UNKNOWN') thisInvite.lastName = names[1];
                if (thisInvite.senders) {
                    var sendersArray = thisInvite.senders.split('|'),
                        si = 0,
                        sl = sendersArray.length,
                        tempArray;
                    for (si; si < sl; si++) {
                        tempArray = sendersArray[si].split(',');
                        sendersArray[si] = {
                            'email':       tempArray[0],
                            'name':        tempArray[1],
                            'timeInvited': tempArray[2]
                        };
                    }
                    thisInvite.formattedSenders = sendersArray;
                }
                thisInvite.time = new Date(thisInvite.createTS).getTime();
            }
            return temp;
        };

        var _toggleCompanyRemoving = function (id) {
            $scope.companyReviewList.forEach(function (company, i) {
                if (company.id === id) {
                    $timeout(function () {
                        company.removing = !company.removing;
                    });
                }
            });
        };

        var _updateContactStatus = function () {
            $timeout(function () {
                $scope.connectedServices = SIS.Model.UserService.getCurrentUser().getConnectedServices();
            });
        };


        /********************
         * PUBLIC METHODS
         *********************/
        $scope.createNewUser = function ($event) {
            $scope.showCreateFormErrors = $('#create-user-form').is('.ng-invalid');
            if (!$scope.showCreateFormErrors) {
                $scope.submitting = true;
                SIS.Model.UserService.createNewUser({
                    'data':    $scope.newUser,
                    'success': function (response) {
                        //$alert.success('AS010', [$scope.newUser.email_address], [response.id], true);
                        $location.search().current = null;
                        $scope.$apply();
                        window.location = '/#/user/' + response.id;
                        window.location.reload();
                        $scope.newUser = {
                            'group': 'USER'
                        };
                        $scope.submitting = false;
                    },
                    'error':   function (response) {
                        console.error('error creating user');
                        $scope.submitting = false;
                        $alert.error('AE010');
                    },
                    'scope':   $scope
                });
            }
        };

        $scope.checkBox = function (name, $event) {
            $scope.tempEmailPrefs[name].unsubscribed = !$scope.tempEmailPrefs[name].unsubscribed;
        };

        $scope.saveEmailPreferences = function () {
            var data = {};
            for (var key in $scope.tempEmailPrefs) {
                data[key] = $scope.tempEmailPrefs[key].unsubscribed;
            }
            SIS.Model.Unsubscribe.saveSettingsJSON({
                'data':    {
                    'emailTypes':    data,
                    "email_address": $scope.currentUser.contactDetails.primaryEmail.email
                },
                'success': function (response) {
                    $alert.success('PS001');
                },
                'error':   function (xhr, status, response) {
                    $alert.error('PE001');
                    console.error('error:', xhr, status, response);
                },
                'scope':   $scope
            });
        };

        $scope.pushModel = function (type) {
            var $form = $('form[name="' + type + 'SettingsForm"]'),
                data;

            if ($form.length <= 0) return;
            if ($form.hasClass('validator-invalid') || $form.hasClass('validator-pristine') || $form.hasClass('ng-invalid') || $form.hasClass('ng-pristine')) {
                $form.addClass('show-invalid');
            } else if (($form.hasClass('validator-valid') || $form.hasClass('ng-valid')) && typeof $scope[type + 'Update'] === 'function') {
                $scope[type + 'Update']();
            } else {
                console.warn("This form has not been validated or its handler cannot be found");
            }
        };

        $scope.nameUpdate = function () {
            $scope.capitalizeName();

            var opts = {
                'data':    {
                    'firstName': $scope.tempNames.firstName,
                    'lastName':  $scope.tempNames.lastName
                },
                'success': function (response, status, xhr) {
                    _currentUser.firstName = response.firstName;
                    _currentUser.lastName = response.lastName;
                    $alert.success('PS002');//'Name change successful!'
                    _revertForms('name');
                },
                'error':   function (xhr, status, response) {
                    $alert.error('PE002'); //'error changing name. Please try again later'
                    _revertForms('name');
                }
            };
            _currentUser.updateMe(opts);
        };

        $scope.emailUpdate = function (ignoreNew, successCode, errorCode) {
            var newEmail = $scope.tempContactDetails.newEmail.trim(),
                contactDetails = $.extend({}, $scope.tempContactDetails),
                sCode = successCode || 'PS005',
                eCode = errorCode || 'PE005';

            delete contactDetails.newEmail;

            var updateContactDetails = function (details) {
                var opts = {
                    'type':    'PUT',
                    'data':    {
                        'contactDetails': angular.toJson(details)
                    },
                    'success': function (response, status, xhr) {
                        _currentUser.contactDetails = details;
                        !ignoreNew && _revertForms('email');
                        $alert.success(sCode);
                    },
                    'error':   function (xhr, status, response) {
                        _revertForms('email');
                        $alert.error(eCode);
                    }
                };
                _currentUser.updateMe(opts);
            };

            if (ignoreNew) {
                updateContactDetails(contactDetails);
            } else {
                SIS.Model.ajax({
                    'type':        'GET',
                    'relativeURL': '/validate/email?value=' + newEmail,
                    'success':     function (response, status, xhr) {
                        if (response.exists) {
                            $alert.error('W002');//'That email is already in use'
                        } else {
                            contactDetails.secondaryEmails.push({
                                'email': newEmail
                            });
                            updateContactDetails(contactDetails);
                        }
                    },
                    'error':       function (xhr, status, response) {
                        $alert.error('GE005'); //'Could not validate email, please try again later.'
                    }
                });
            }
        };

        $scope.makePrimary = function (index) {
            var newPrimary = $scope.tempContactDetails.secondaryEmails[index];
            $scope.tempContactDetails.secondaryEmails[index] = $scope.tempContactDetails.primaryEmail;
            $scope.tempContactDetails.primaryEmail = newPrimary;
            $scope.emailUpdate(true, 'PS003', 'PE003'); //'Primary Email successfully changed!', 'error changing primary email. Please try again later'
        };

        $scope.removeEmail = function (index) {
            var removedEmail = $scope.tempContactDetails.secondaryEmails[index].email;
            var confirmModal = $modal($scope, {
                'template':   'Are you sure you want to remove <b>' + removedEmail + '</b>?',
                'title':      'Remove Email',
                'buttons':    [
                    {
                        'text':  'Remove',
                        'class': 'sis-button-primary',
                        'click': function (e) {
                            $scope.tempContactDetails.secondaryEmails.splice(index, 1);
                            $scope.emailUpdate(true, 'PS004', 'PE004');
                            confirmModal.hide();
                        }
                    },
                    {
                        'text':  'Cancel',
                        'class': 'sis-button-link',
                        'click': function (e) {
                            confirmModal.hide();
                        }
                    }
                ],
                'beforeHide': function () {
                    $location.search('claimContentId', null);
                    $location.search('claimContentName', null);
                    $scope.scrapedUserName = '';
                    $scope.scrapedUser = null;
                    $scope.adminEmail = null;
                    $scope.adminPassword = null;
                    $scope.$apply();
                }
            }).show();

            if (true) {
                //'Email removed successfully!', 'error removing primary email. Please try again later'

            }
        };

        $scope.passwordUpdate = function () {
            var opts = {
                'data':    {
                    'password':     $scope.tempPassword.confirm,
                    'old_password': $scope.tempPassword.old
                },
                'success': function (response, status, xhr) {
                    _revertForms('password');
                    $alert.success('PS006'); //'Password successfully changed'
                },
                'error':   function (xhr, status, error) {
                    var msg = error.errorCode || 'PE006'; //'Error changing password. Please try again later'
                    $alert.error(msg);
                }
            };
            _currentUser.updateMe(opts);
        };

        $scope.capitalizeName = function () {
            var firstOk = $scope.tempNames && $scope.tempNames.firstName && $scope.tempNames.firstName.length > 0,
                lastOk = $scope.tempNames && $scope.tempNames.lastName && $scope.tempNames.lastName.length > 0;

            if (firstOk) {
                $scope.tempNames.firstName = $scope.tempNames.firstName.charAt(0).toUpperCase() + $scope.tempNames.firstName.slice(1);
            }
            if (lastOk) {
                $scope.tempNames.lastName = $scope.tempNames.lastName.charAt(0).toUpperCase() + $scope.tempNames.lastName.slice(1);
            }
        };

        $scope.bootstrapUsers = function ($event) {
            var $button = $($event.target).attr('disabled', 'disabled');
            // Setting a cookie as the process may take a long time
            document.cookie = "bootstrapUsers=true; Path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT";
            SIS.Model.UserService.bootstrap({
                'success': function (response) {
                    $button.removeAttr('disabled');
                    document.cookie = 'bootstrapUsers=';
                    $alert.success('AS001'); //'Successfully bootstrapped users.'
                }
            });
        };

        $scope.bootstrapLivefyre = function ($event) {
            var $button = $($event.target).attr('disabled', 'disabled');
            // Setting a cookie as the process may take a long time
            document.cookie = "bootstrapLivefyre=true; Path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT";
            SIS.Model.LiveFyre.bootstrap({
                'success': function (response) {
                    $button.removeAttr('disabled');
                    document.cookie = 'bootstrapLivefyre=';
                    $alert.success('AS002'); //'Successfully bootstrapped livefyre.'
                }
            });
        };

        $scope.verifyEmail = function (email, event) {
            var data = {
                'recipients':         email,
                'firstName':          _currentUser.firstName,
                'lastName':           _currentUser.lastName,
                'email_request_type': 'SecondaryEmailConfirmation',
                'primary_email':      _currentUser.contactDetails.primaryEmail.email
            };

            SIS.Model.ajax({
                'relativeURL': '/emails/template',
                'contentType': 'application/json; charset=UTF-8',
                'type':        'POST',
                'data':        data,
                'success':     function (response) {
                    $alert.success('AS003', [email]); //'Verification email sent to: {0}. Check that email and follow the instructions provided.'
                    event && $(event.target).remove();
                },
                'error':       function (xhr, status, response) {
                    $alert.error('AE003', [email]); //'Error sending verification to: {0}. Please try again later.'
                }
            });
        };

        $scope.checkIsolateScopeAndTrimEmail = function () {
            var targetScope = (this != $scope) ? this : $scope;
            if (targetScope.tempContactDetails && targetScope.tempContactDetails.newEmail) {
                targetScope.tempContactDetails.newEmail = targetScope.tempContactDetails.newEmail ? targetScope.tempContactDetails.newEmail.trim() : targetScope.tempContactDetails.newEmail;
                $scope.tempContactDetails.newEmail = targetScope.tempContactDetails.newEmail;
            }
        };

        $scope.unclaimCompany = function (id) {
            _toggleCompanyRemoving(id);
            SIS.Model.CompanyService.unclaim({
                'id':      id,
                'success': $scope.getCompanyReviewList,
                'error':   function (error) {
                    console.error(error);
                    _toggleCompanyRemoving(id);
                }
            });
        };
        $scope.acceptCompanyClaim = function (id) {
            _toggleCompanyRemoving(id);
            SIS.Model.CompanyService.acceptClaim({
                'id':      id,
                'success': $scope.getCompanyReviewList,
                'error':   function (error) {
                    console.error(error);
                    _toggleCompanyRemoving(id);
                }
            });
        };
        $scope.selectUserToManage = function (user) {
            SIS.Model.UserService.requestUser({
                'id':      user.id,
                'scope':   $scope,
                'success': function (response) {
                    $scope.userToManage = response;
                    $scope.userToManageName = $scope.userToManage.firstName + ' ' + $scope.userToManage.lastName;
                },
                'error':   function (response) {
                    console.error('error fetching user data');
                }
            })
        };

        $scope.saveUserGroup = function () {
            if (!$scope.userToManage) return;
            $scope.userToManage.changeGroup({
                'data':    {
                    'group': $scope.userToManage.group
                },
                'scope':   $scope,
                'success': function (response) {
                    //alert success
                    $scope.userToManage = undefined;
                },
                'error':   function (xhr, status, response) {
                    //alert error
                }
            });
        };
        var claimModal = function (user) {
            user = user || {};
            $scope.userToScrape = user;
            $scope.claimContentModal = $modal($scope, {
                'template':   '<div claim-content="userToScrape" claim-content-data="claimContentData"></div>',
                'title':      'Claim Content',
                'subtitle':   user.firstName ? 'You are claiming content on behalf of ' + user.firstName + ' ' + user.lastName : undefined,
                'buttons':    [
                    {
                        'text':  'Done',
                        'class': 'sis-button-primary',
                        'click': function (e) {
                            //console.log('email before copy:', $scope.adminEmail);
                            console.log('password before copy:', $scope.adminPassword);
                            this.disabled = true; // May be this some ng- specific way to do this that is "better"?
                            SIS.Model.ProjectService.copySelectedProjects({/*email: $scope.adminEmail,*/password: $scope.adminPassword}, $scope.scrapedUser, $scope.claimContentModal);
                            //$scope.claimContentModal.hide();
                        }
                    }
                ],
                'beforeHide': function () {
                    delete SIS.Model.ProjectService.selectedProjects;  // Pretty horrible place to do this, but we have to ensure that abandoned runs don't leave state for later runs. -HRS
                    $location.search('claimContentId', null);
                    $location.search('claimContentName', null);
                    $scope.scrapedUserName = '';
                    $scope.scrapedUser = null;
                    //$scope.adminEmail = null;
                    $scope.adminPassword = null;
                    $scope.$apply();
                }
            });
            $scope.claimContentModal.resize().show();
        };

        $scope.setUserToScrape = function (user) {
            var userData;
            SIS.Model.UserService.requestUser({
                'id':      user.id,
                'success': function (response) {
                    userData = response;
                    userData.profile = {};
                    SIS.Model.ProfileService.requestProfile({
                        'id':      userData.id,
                        'success': function (response, status, xhr) {
                            $.extend(userData.profile, response);
                            $scope.userToScrape = userData;
                            claimModal(userData);
                        },
                        'error':   function (xhr, status, response) {
                            console.error('error fetching profile to scrape', xhr, status, response);
                        }
                    });

                },
                'error':   function (response) {
                    console.error('error fetching user data');
                }
            });
        };
        $scope.autoCompleteScrapedUser = function (user) {
            $scope.scrapedUser = user;
            $scope.scrapedUserName = user.text;
        };

        $scope.selectUser = function () {
            $location.search('claimContentName', $scope.scrapedUser.text);
            $location.search('claimContentId', $scope.scrapedUser.id);
        };

        $scope.setFilterType = function (type) {
            $scope.filterType = type;
        };

        $scope.getCompanyReviewList = function () {
            SIS.Model.CompanyService.requestReviewList({
                'success': function (list) {
                    $scope.companyReviewList = list;
                    $scope.$apply();
                }
            });
        };

        $scope.getInvitedUserList = function () {
            var url, networkMap = {
                'linkedin': 'LinkedIn'
            };

            switch ($scope.filterType) {
                case 'all':
                    url = '/pendingInvites';
                    break;
                case 'email':
                    var inputVal = $('.approve-invite-email-input').val(),
                        isEmail = EMAIL_REGEX.test(inputVal),
                        isDomain = !isEmail && DOMAIN_REGEX.test(inputVal),
                        isNetwork = SIS.Model.Oauth.networkNames.indexOf(inputVal.toLowerCase()) > -1;

                    if (isEmail || isDomain || isNetwork) {
                        url = isEmail ? '/pendingInvites/byRecipientEmail?recipientEmail=' + inputVal : isDomain ? '/pendingInvites/byRecipientEmailDomain?recipientEmailDomain=' + inputVal : '/pendingInvites/byRecipientNetworkName?recipientNetworkName=' + networkMap[inputVal.toLowerCase()];
                    } else {
                        $alert.error('W003');
                        return;
                    }
                    break;
                case 'type':
                    var type = $('.approve-invite-type-select').val();
                    url = '/pendingInvites/byInviteType?inviteType=' + type;
                    break;
            }
            SIS.Model.ajax({
                'method':      'GET',
                'relativeURL': url,
                'success':     _handleInviteSuccess,
                'error':       _handleInviteError
            });
        };
        var _getSenderName = function (invite) {
            var senderName;
            for (var i = 0; i < invite.formattedSenders.length; i++) {
                senderName = senderName || invite.formattedSenders[i].name;
            }

            return senderName;
        };
        var _getDefaultMessage = function (invite) {
            var senderName = _getSenderName(invite);
            console.log(invite, senderName);
            var defaultMessageMap = {
                'collaborate': senderName ? 'I\'ve added you as a team member' + (invite.projectName ? ' to ' + invite.projectName : '') + ' on Shocase.\n\n-' + senderName : 'You\'ve been added as a team member on Shocase.\n\n',
                'invite':      senderName ? 'I\'d like to add you as a connection on Shocase.\n\n-' + senderName : 'You\'ve been added as a connection on Shocase.'
            };

            return defaultMessageMap[invite.inviteType];
        };
        var _getTemplateMessage = function (invite) {
            var senderName = _getSenderName(invite);
            console.log(invite, senderName);
            var templateMessageMap = {
                'collaborate': 'Hi,\n\nI credited you on Shocase' + (invite.projectName ? ' for your work on:\n\n\t' + invite.projectName : '') + '\n\nShocase is the first network for marketing professionals.\n\nI encourage you to join Shocase to get recognition for your best work.' + (senderName ? '\n\n' + senderName : ''),
                'invite':      'Hi' + (invite.recipientName && $.trim(invite.recipientName).length ? ' ' + invite.recipientName.toTitleCase() : '') + ',\n\nI\'d like to invite you to join Shocase, the new network for marketers. It provides greater visibility for your work and experiences.\n\nJoin today to start uploading and discovering some of greatest work in marketing.' + (senderName ? '\n\n' + senderName : '')
            };

            return templateMessageMap[invite.inviteType];
        };
        var _sendPendingInvite = function (options) {

            if (!options || !options.invite) {
                console.error('_sendPendingInvite requires options and options.invite');
                return;
            }

            SIS.Model.ajax({
                'relativeURL': '/pendingInvites/send',
                'type':        'PUT',
                'data':        angular.toJson($.extend(options.invite, {
                    'custom_email_message_body': $scope.sendInviteMessage === _getDefaultMessage(options.invite) ? _getTemplateMessage(options.invite) : $scope.sendInviteMessage
                })),
                'success':     function (response) {
                    SIS.Utils.call(options.success, undefined, response);
                    $alert.success('AS004', [options.invite.recipientEmail || options.invite.recipientName]); //'You have successfully invited {0}'

                    // Refresh the table
                    $scope.getInvitedUserList();
                },
                'error':       function (xhr, status, response) {
                    SIS.Utils.call(options.error, undefined, response);
                    $alert.error('AE004'); //'There was an error sending invite. Try again Later.'
                }
            });
        };
        $scope.sendInvite = function (invite) {
            if (invite.inviteType === 'invite') {
                invite.senders = "postmaster@shocase.com,,"
            } else if (invite.inviteType === 'request') {
                // Don't show the modal, just send the request
                _sendPendingInvite({
                    'invite': invite
                });
                return;
            }

            $scope.sendInviteMessage = _getDefaultMessage(invite);

            var modalOptions = {
                'title':    'Send Invite',
                'subtitle': 'Add a custom message.',
                'template': $('#sis-send-invites-modal-template').html(),
                'buttons':  [
                    {
                        'text':       'Send',
                        'class':      'sis-button-primary',
                        'submitText': 'Sending',
                        'click':      function () {
                            if ($scope.sendInviteForm.$valid) {
                                _sendPendingInvite({
                                    'invite':  invite,
                                    'success': function (response) {
                                        $.extend(invite, response.pendingInvitesTOList ? response.pendingInvitesTOList[0] : {});
                                        invite.sent = true;
                                        $scope.inviteModal.hide();
                                        $scope.$apply();
                                    }
                                });
                            } else {
                                $scope.showInvalid = true;
                                $scope.$apply();
                                return false;
                            }
                        }
                    },
                    {
                        'text':  'Cancel',
                        'class': 'sis-button-link',
                        'click': function () {
                            $scope.inviteModal.hide();
                        }
                    }
                ]
            };
            $scope.inviteModal = $modal($scope, modalOptions).show();
        };

        $scope.removeInvite = function (invite) {
            var params = {
                'inviteType': invite.inviteType
            };

            if (invite.recipientEmail) {
                params.recipientEmail = invite.recipientEmail;
            }

            if (invite.networkName && invite.networkUserId) {
                params.networkName = invite.networkName;
                params.networkUserId = invite.networkUserId;
            }

            var url = '/pendingInvites?' + $.param(params);

            SIS.Model.ajax({
                'relativeURL': url,
                'type':        'DELETE',
                'success':     function (response) {
                    $alert.success('AS005', [invite.recipientEmail || invite.recipientName]); //'You have successfully deleted {0}\'s invite'
                    $scope.getInvitedUserList();
                },
                'error':       function () {
                    $alert.error('AE005'); //'There was an error deleting invite. Try again Later.'
                }
            });
        };

        $scope.showAddressBookModal = function () {
            SIS.Controllers.AddressBook.showImportModal($scope, $modal, $timeout, $alert);
        };

        /********************
         * INIT
         *********************/
        if ($scope.isLoggedIn) {
            $scope.$on('$viewContentLoaded', function (e) {
                _setNavItem();
            });
            $scope.$on('$locationChangeSuccess', function (e) {
                _setNavItem();
                $scope.showLinkedInTest = $location.search().linkedInTest && $location.search().linkedInTest !== 'false' && $location.search().linkedInTest !== '0' ? true : false;
            });

            $rootScope.loading = true;
            _init();
        }
    };
    namespace.controller.$inject = ['$scope', '$routeParams', '$location', '$modal', '$timeout', '$alert', '$rootScope'];
})(SIS.Controllers.Account.Desktop);
