SIS.namespace("SIS.Controllers.Activity");
(function (namespace) {
    namespace.controller = function ($scope, $location, $timeout, $alert) {
        /********************
         * PRIVATE VARS
         *********************/
        var _requestingActivity = false,
            _scrolling = false,
            _$window = $(window),
            _windowHeight = _$window.height(),
            _$document = $(document),
            _documentHeight = _$document.height(),
            _$header = $('#sis-header-container'),
            _headerHeight = _$header.height(),
            _$shareBar = $('.sis-activity-share-bar-wrap'),
            _$viewNew = $('.sis-activity-view-new-wrap'),
            _shareBarHeight = _$shareBar.height(),
            _scrollBuffer = 400,
            _lastClearedShareUrl,
            _shareUrl,
            _$groups = {},
            _removeIds = [],

            _scrollTimeout,
            _scrollDelay = 1000,

        // CONSTANTS
            BUFFER_SIZE = 1,
            MIN_PREVIEW_IMAGE_SIZE = 200,
            SHARE_TEXT_THRESHOLD = 464,
            SHARE_TEXT_LIMIT = 500;

        /********************
         * PUBLIC VARS
         *********************/
        $scope.activity = [];
        $scope.entityMap = {
            'user':    {},
            'project': {},
            'company': {},
            'article': {},
            'award':   {}
        };
        $scope.followers = {
            'actor':  {
                'entityTOList': []
            },
            'object': {
                'entityTOList': []
            }
        };
        $scope.followees = {
            'actor':  {
                'entityTOList': []
            },
            'object': {
                'entityTOList': []
            }
        };
        $scope.members = {
            'actor':  {
                'entityTOList': []
            },
            'object': {
                'entityTOList': []
            }
        };
        $scope.shareTextLimit = SHARE_TEXT_LIMIT;
        $scope.shareTextThreshold = SHARE_TEXT_THRESHOLD;

        /********************
         * PRIVATE METHODS
         *********************/
        var _addFollowee = function (user) {
            if ($scope.followees && $scope.followees.data && $scope.followees.data.actor && $scope.followees.data.actor.entityTOList) {
                $scope.followees.data.actor.entityTOList.unshift({
                    'objectId':   user.id,
                    'objectType': 'user'
                });
            }
        };
        var _removeTempItems = function (activity) {
            var removeIndex,
                purgeList = [],
                removeId,
                group,
                item;


            // Loop through the remove list
            for (var i = 0; i < _removeIds.length; i++) {
                removeId = _removeIds[i];


                // Loop throught the activity to find the remove id
                for (var j = 0; j < activity.length; j++) {
                    item = activity[j];

                    // If there is a match, save it and break out of the group
                    if (item.id === removeId) {
                        removeIndex = j;
                        purgeList.push(removeId);
                        break;
                    }
                }

                // Remove the item if found and break out of the activity list
                if (typeof removeIndex === 'number') {
                    activity.splice(removeIndex, 1);
                    removeIndex = undefined;
                }
            }

            // Clear out the remove list
            for (var i = 0; i < purgeList.length; i++) {
                _removeIds.splice(_removeIds.indexOf(purgeList[i]), 1);
            }

            return activity;
        };
        var _removeItemFromActivity = function (id, type) {
            // Remove item from map
            if ($scope.entityMap[type] && $scope.entityMap[type][id]) {
                delete $scope.entityMap[type][id];
            }

            // Iterate through feed and mark all instances as removed
            var groupActivity, item, actor, object, shouldRemove;
            for (var i = 0; i < $scope.activity.length; i++) {
                groupActivity = $scope.activity[i].activity;
                for (var j = 0; j < groupActivity.length; j++) {
                    item = groupActivity[j];

                    // Actors
                    for (var k = 0; k < item.actor.entityTOList.length; k++) {
                        actor = item.actor.entityTOList[k];
                        if (actor.objectId === id) {
                            shouldRemove = true;
                            break;
                        }
                    }

                    // Objects
                    for (var k = 0; k < item.object.entityTOList.length; k++) {
                        object = item.object.entityTOList[k];
                        if (object.objectId === id) {
                            shouldRemove = true;
                            break;
                        }
                    }

                    // If the item was marked, break
                    if (shouldRemove) {
                        shouldRemove = false;
                        item.activityType = 'removed';
                        break;
                    }
                }
            }
        };
        var _onUnload = function (e) {
            e = e || window.event;
            var message = 'Your post has not been shared yet.';
            if (e) {
                e.returnValue = message;
            }

            return message;
        };
        var _getHistory = function () {
            var id = SIS.Utils.HistoryAPIHelper.getStateId();

            if (!id || !SIS.Utils.HistoryAPIHelper.getHistoryObject(id)) {
                SIS.Utils.HistoryAPIHelper.replaceState({
                    'id': SIS.Utils.HistoryAPIHelper.createNew()
                });
            }
            return typeof window.history.state === 'object' ? SIS.Utils.HistoryAPIHelper.getHistoryObject(window.history.state.id) : undefined;
        };
        var _setHistory = function () {
            var id = SIS.Utils.HistoryAPIHelper.getStateId();

            if (id) {
                SIS.Utils.HistoryAPIHelper.setHistoryObject(id, {
                    'activity':  $scope.activity,
                    'followers': $scope.followers,
                    'followees': $scope.followees,
                    'entityMap': $scope.entityMap,
                    'scrollTop': _$window.scrollTop()
                });
            }
            return SIS.Utils.HistoryAPIHelper.getHistoryObject(id);
        };
        var _isHidden = function ($group) {
            var scrollTop = _$window.scrollTop(),
                groupTop = $group.$element.offset().top - _headerHeight,
                groupBottom = groupTop + $group.$element.height(),
                visibleWindowTop = scrollTop - BUFFER_SIZE * _windowHeight >= _headerHeight ? scrollTop - BUFFER_SIZE * _windowHeight : _headerHeight,
                visibleWindowBottom = (scrollTop + _windowHeight) + BUFFER_SIZE * _windowHeight;


//             console.log('scrollTop', scrollTop);
//             console.log('groupTop', groupTop);
//             console.log('groupBottom', groupBottom);
//             console.log('windowHeight', _windowHeight);
//             console.log('_headerHeight', _headerHeight);
//             console.log('visibleWindowTop', visibleWindowTop);
//             console.log('visibleWindowBottom', visibleWindowBottom);


            return groupTop > visibleWindowBottom || groupBottom < visibleWindowTop;
        };
        var _updateGroups = function () {
            var $group;
            for (var i = 0; i < $scope.activity.length; i++) {
                // Save the group element if not already saved
                _$groups[$scope.activity[i].id] = _$groups[$scope.activity[i].id] || {'$element': $('#' + $scope.activity[i].id)};
                $group = _$groups[$scope.activity[i].id];

                // Set the height once - TODO this may have to change if comments are expanded, etc.
                $group.height = $group.height || $group.$element.outerHeight(true) + 20; // Take margin bottom into account

                // Set the metadata on the object for the template to use
                $scope.activity[i].height = $group.height;
                $scope.activity[i].hidden = _isHidden($group);

//                 console.group('updateGroups');
//                 console.log('id', $scope.activity[i].id);
//                 console.log('isHidden', $scope.activity[i].hidden);
//                 console.groupEnd();

                $scope.$apply();
            }
        };
        var _onScroll = function () {
            // Position view new button
            var scrollTop = _$window.scrollTop();
            if (scrollTop >= _shareBarHeight) {
                _$viewNew.addClass('fixed');
            } else {
                _$viewNew.removeClass('fixed');
            }

            // Hide/Show Groups
            if (!_requestingActivity) {

                if (_documentHeight - _$window.scrollTop() - _windowHeight < _scrollBuffer) {
                    $scope.requestSavedActivity();
                }


                // Update the activity group data
//                if (!_scrollTimeout) {
//                    console.log('updating groups');
//                    _updateGroups();
//                    _scrollTimeout = setTimeout(function () {
//                        _scrollTimeout = undefined;
//                    }, _scrollDelay);
//                }

            }
        };
        var _onResize = function () {
            _windowHeight = _$window.height();
        };
        var _handleUserStateChange = function ($event, currentUserState, initCallback) {
            $scope.isLoggedIn = SIS.Model.UserService.isUserLoggedIn();

            if (!$scope.isLoggedIn) {
                // TODO - remove this when there is an anonymous feed
                if (initCallback) {
                    SIS.Controllers.Login.redirectToLogin($location, SIS.Controllers.Login.returnChecks.SIS_IS_USER_LOGGED_IN);
                } else {
                    $location.path('/search/projects');
                }
            } else {
                $scope.currentUser = SIS.Model.UserService.getCurrentUser();
                $scope.entityMap.user[$scope.currentUser.id] = $scope.currentUser;
                SIS.Utils.call(initCallback);
            }
        };
        namespace.clearShare = function () {
            $scope.shareUrlPreview = undefined;
            $scope.shareText = undefined;
            _shareUrl = undefined;
            window.onbeforeunload = undefined;
        };
        var _getUrlDomain = function (url) {
            var domainMatch = url.match(/http[s]?:\/\/([^\/]+)\//);

            return domainMatch && domainMatch.length ? domainMatch[1] : url;
        };
        var _isValidImageType = function (src) {
            // Remove the query and hash and test the source for valid extensions (our cdn is valid)
            return  /shocasecdn/.test(src) || /[jpg|jpeg|png]+$/.test(src.replace(/(\?.+)$/, ''));
        };
        var _isValidImageSize = function (img) {
            return img.height >= MIN_PREVIEW_IMAGE_SIZE && img.width >= MIN_PREVIEW_IMAGE_SIZE;
        };
        var _loadImage = function (data, key, index) {
            if (!data || !data[key] || !data[key][index]) {
                return $.Deferred().fail().resolve();
            }

            var img = new Image(),
                deferred = $.Deferred(),
                src = data[key][index];

            // Before loading the image, check if it is a valid type
            if (!_isValidImageType(src)) {
                SIS.DEBUG_MODE && console.warn('invalid image', src);
                deferred.resolve();

                return deferred;
            }

            // Set the src
            img.src = src;

            // Handle the load events
            if (img.complete) {
                if (_isValidImageSize(img)) {
                    data.validImageUrls.push(img.src);
                } else {
                    SIS.DEBUG_MODE && console.warn('too small', {'src': img.src, 'height': img.height, 'width': img.width});
                }
                deferred.resolve();

            } else {
                img.onload = function () {
                    // Remove item if it is smaller than the min size
                    if (_isValidImageSize(this)) {
                        data.validImageUrls.push(img.src);
                        SIS.DEBUG_MODE && console.log('SUCCESS!', img.src);
                        $scope.$apply();
                    } else {
                        SIS.DEBUG_MODE && console.warn('too small', {'src': img.src, 'height': this.height, 'width': this.width});
                    }
                    deferred.resolve();
                };
                img.onerror = function () {
                    SIS.DEBUG_MODE && console.warn('on error', img.src);
                    deferred.resolve();
                };
            }


            return deferred;
        };
        var _setShareUrlPreview = function (response) {
            if (!response.imageUrls || !response.imageUrls.length || !response.title) {
                return;
            }

            var deferreds = [];
            response.validImageUrls = [];

            for (var i = 0; i < response.imageUrls.length; i++) {
                // Load the images
                deferreds.push(_loadImage(response, 'imageUrls', i));
            }

            // Set it to be shown
            $.when.apply(this, deferreds).done(function () {
                if (response.validImageUrls.length > 0) {
                    $scope.shareUrlPreview = $.extend(response, {
                        // Replace the html tags in the description
                        'description': response.description ? response.description.replace(/<[^>]*>/g, '') : '-',
                        'url':         _shareUrl,
                        'urlDomain':   _getUrlDomain(_shareUrl)
                    });
                    $scope.$apply();
                } else {
                    // Reset
                    _shareUrl = undefined;
                }
            });
        };
        var _parseForUrl = function () {
            // Timeout is necessary to allow the input val to update
            $timeout(function () {
                var text = $.trim($scope.shareText), urlMatches, matchedUrl;
                if (text) {
                    urlMatches = SIS.Directives.Validators.extractURL(text);

                    if (urlMatches) {
                        // Add http:// if missing
                        matchedUrl = /https?:\/\//.test(urlMatches[0]) ? urlMatches[0] : 'http://' + urlMatches[0];

                        // Check if matchedUrl is new and not the same as the last canceled one
                        if (matchedUrl !== _shareUrl && matchedUrl !== _lastClearedShareUrl) {
                            _shareUrl = matchedUrl;
                            SIS.Model.ArticleService.getUrlInfo({
                                'url':     matchedUrl,
                                'scope':   $scope,
                                'success': _setShareUrlPreview
                            })
                        }
                    }
                }
            })
        };
        // DEBUG
        var _updateActivityTypes = function () {
            $scope.isDebug = SIS.DEBUG_MODE;
            if (!$scope.isDebug) {
                return;
            }

            var expectedTypes = [
                    'user-liked-project',
                    'user-followed-user',
                    'user-joined_shocase-none',
                    'user-changed_profile_pic-none',
                    'user-new_job-company',
                    'user-created-project',
                    'user-changed_cover_image-project',
                    'user-add_asset-project',
                    'user-edited-project',
                    'user-liked-project',
                    'user-commented-project',
                    'user-joined-project',
                    'project-awarded-award',
                    'user-claimed-company',
                    'company-added-user',
                    'company-added-project',
                    'user-posted-article',
                    'user-liked-article',
                    'user-commented-article'
                ],
                actualTypes = {},
                group;

            $scope.activityTypes = $scope.activityTypes || {};
            $scope.missingTypes = {};
            for (var i = 0; i < $scope.activity.length; i++) {
                group = $scope.activity[i];
                for (var j = 0; j < group.activity.length; j++) {
                    actualTypes[group.activity[j].activityType] = group.activity[j].activityType;
                }
            }

            for (var i = 0; i < expectedTypes.length; i++) {
                if (!actualTypes[expectedTypes[i]]) {
                    $scope.missingTypes[expectedTypes[i]] = expectedTypes[i];
                }
            }
        };

        /********************
         * SCOPE METHODS
         *********************/
        $scope.handleActivityClick = function (e) {
            var serviceMap = {
                    'project': 'ProjectService',
                    'article': 'ArticleService'
                },
                idMap = {
                    'project': 'projectId'
                },
                $el = $(e.target),
                action = $el.attr('data-click-action'),
                targetId = $el.attr('data-click-id'),
                targetType = $el.attr('data-click-type'),
                targetActivityType = $el.attr('data-click-activity-type'),
                index = parseInt($el.attr('data-index'), 10) > -1 ? parseInt($el.attr('data-index'), 10) : 0,
                targetObj, targetActivity, opts;

            if (!(action && targetId && targetType)) {
                if (action || targetId || targetType) {
                    console.warn('Missing a required parameter to handle click:');
                    !action && console.warn('action');
                    !targetId && console.warn('targetId');
                    !targetType && console.warn('targetType');
                }
                return;
            }

            switch (action) {
                case 'like':
                    targetObj = $scope.entityMap[targetType] ? $scope.entityMap[targetType][targetId] : undefined;

                    opts = {
                        'id':      targetObj[idMap[targetType] || 'id'],
                        'success': function (response) {
                            // Call analytics
                            SISAX.trackEvent("activity_like_success", SISAX.cats.ACTIVITY, {
                                "type": targetType,
                                "id": targetId
                            });
                        },
                        'error':   function (xhr, status, response) {
                            targetObj.likedByCurrentUser = !targetObj.likedByCurrentUser;
                            targetObj.likedByCurrentUser ? targetObj.numLikes-- : targetObj.numLikes++;

                            if (response.errorCode === 1003) {
                                // Item has been removed
                                $alert.error('AE023', [targetType]);
                                _removeItemFromActivity(targetId, targetType);
                                $scope.$apply();
                            } else {
                                $alert.error('AE022', [targetType]);
                            }

                            // Call analytics
                            SISAX.trackEvent("activity_like_error", SISAX.cats.ACTIVITY, {
                                "type": targetType,
                                "id": targetId,
                                "response": response
                            });
                        },
                        'scope':   $scope
                    };

                    // Pass the obj to the model
                    // TOD - remove the action below in favor of the whole obj
                    opts[targetType] = targetObj;

                    opts.action = targetObj.likedByCurrentUser ? 'unlike' : 'like';
                    SIS.Model[serviceMap[targetType]].like(opts);
                    targetObj.likedByCurrentUser = !targetObj.likedByCurrentUser;

                    targetObj.numLikes = targetObj.numLikes || 0;
                    targetObj.likedByCurrentUser ? targetObj.numLikes++ : targetObj.numLikes--;
                    break;
                case 'follow':
                    targetObj = $scope.entityMap[targetType] ? $scope.entityMap[targetType][targetId] : undefined;
                    opts = {
                        'id':      targetObj.id,
                        'success': function (response) {
                            // Call analytics
                            SISAX.trackEvent("activity_follow_success", SISAX.cats.ACTIVITY, {
                                "type": targetType,
                                "id": targetId
                            });
                        },
                        'error':   function (response) {
                            targetObj.followedByCurrentUser = !targetObj.followedByCurrentUser;
                            $alert.error('AE020');

                            // Call analytics
                            SISAX.trackEvent("activity_follow_error", SISAX.cats.ACTIVITY, {
                                "type": targetType,
                                "id": targetId,
                                "response": response
                            });
                        },
                        'generateActivity': $el.attr('data-click-generate-activity') !== 'false',
                        'scope':   $scope
                    };

                    // Only able to follow
                    if (!targetObj.followedByCurrentUser) {
                        // Add the follower
                        SIS.Model.Activity.followUser(opts);

                        // Update the UI
                        targetObj.followedByCurrentUser = !targetObj.followedByCurrentUser;

                        // Add the followee to the list
                        _addFollowee(targetObj);
                    }

                    break;
                case 'delete':
                    if (targetType === 'article') {
                        $scope.entityMap.article[targetId].deleteConfirmationVisible = !$scope.entityMap.article[targetId].deleteConfirmationVisible;
                    }

                    break;
                case 'deleteConfirmation':
                    if (targetType === 'article') {
                        SIS.Model.ArticleService.deleteArticle({
                            'id':      targetId,
                            'scope':   $scope,
                            'success': function () {
                                _removeItemFromActivity(targetId, 'article');
                                $scope.$apply();

                                // Call analytics
                                SISAX.trackEvent("activity_delete_success", SISAX.cats.ACTIVITY, {
                                    "type": targetType,
                                    "id": targetId
                                });
                            },
                            'error':   function (xhr, status, response) {
                                $alert.error('AE021'); // Could not delete post. Please try again later.

                                // Call analytics
                                SISAX.trackEvent("activity_delete_error", SISAX.cats.ACTIVITY, {
                                    "type": targetType,
                                    "id": targetId,
                                    "response": response
                                });
                            }
                        })
                    }
                    break;
                case 'clickthrough':
                    // Call analytics
                    SISAX.trackEvent("activity_click_through", SISAX.cats.ACTIVITY, {
                        "type": targetType,
                        "id": targetId,
                        "activityType": targetActivityType
                    });
                    break;
            }
        };

        /********************
         * PUBLIC METHODS
         *********************/
        namespace.init = function () {
            _handleUserStateChange(null, null, function () {
                var h = _getHistory();

                // If the history contains activity, load it
                if (h && h.activity && h.entityMap) {
                    $scope.activity = h.activity;
                    $scope.entityMap = h.entityMap;
                    $scope.followers = h.followers;
                    $scope.followees = h.followees;

                    // In a timeout with delay for Firefox. Damn you Firefox!
                    $timeout(function () {
                        _$window.scrollTop(h.scrollTop || 0);
                    }, 250);
                } else {
                    $scope.requestNewActivity(true);
                }
            });

            // Debug
            $scope.$watchCollection('activity', _updateActivityTypes, true);
        };

        $scope.requestNewActivity = function (isInitting) {
            isInitting = typeof isInitting === 'boolean' ? isInitting : false;

            // Set flags
            _requestingActivity = true;
            $scope.loadingNewActivity = true;
            $scope.newActivityExists = false;

            // Scroll to the Top
            _$window.scrollTop(0);

            // Get the new results
            SIS.Model.Activity.requestNewActivity({
                'scope':      $scope,
                'isInitting': isInitting,
                'success':    function (response) {
                    // Remove any items that were added by post sharing
                    response.activity = _removeTempItems(response.activity);

                    // Add the new activity to the beginning of the activity array
                    $scope.activity.unshift({
                        'id':       SIS.Utils.generateGUID(16),
                        'activity': response.activity
                    });

                    // Extend the entity map
                    $.extend(true, $scope.entityMap, response.entityMap);

                    // Unset flags
                    _requestingActivity = false;
                    $scope.loadingNewActivity = false;

                    // Set people lists
                    $scope.followers = response.followers;
                    $scope.followees = response.followees;
                    $scope.members = response.members;
                    $scope.featuredUsers = response.featuredUsers;

                    // Only set the followers and poll etc if initting
                    if (isInitting) {


                        // Poll for new activity
                        SIS.Model.Activity.pollNewActivity({
                            'scope':   $scope,
                            'success': function (newActivityExists) {
                                $scope.newActivityExists = newActivityExists;
                            }
                        });
                    }

                    // Update the document height for the scroll calculation
                    $timeout(function () {
                        _documentHeight = _$document.height();
                    });

                },
                'error':      function (xhr, status, error) {
                    console.error(xhr, status, error);
                }
            })
        };
        $scope.requestSavedActivity = function () {

            if (!$scope.endSavedActivity && $scope.activity.length) {
                _requestingActivity = true;

                $scope.$apply(function () {
                    $scope.loadingSavedActivity = true;
                });

                var lastGroup = $scope.activity[$scope.activity.length - 1];

                if (!lastGroup.activity.length) {
                    return;
                }

                var lastItemId = lastGroup.activity[lastGroup.activity.length - 1].id;
                SIS.Model.Activity.requestSavedActivity({
                    'scope':      $scope,
                    'lastItemId': lastItemId,
                    'success':    function (response) {
                        // Either push the new activity, or set end of set
                        if (response.activity && response.activity.length) {
                            $scope.activity.push({
                                'id':       SIS.Utils.generateGUID(16),
                                'activity': response.activity
                            });
                        } else {
                            $scope.endSavedActivity = true;
                        }

                        // Extend the entity map
                        $.extend(true, $scope.entityMap, response.entityMap);

                        // Reset the flags
                        _requestingActivity = false;
                        $scope.loadingSavedActivity = false;

                        // Set the doc height
                        $timeout(function () {
                            _documentHeight = _$document.height();
                        });
                    },
                    'error':      function (xhr, status, error) {
                        console.error(xhr, status, error);
                    }
                });
            }
        };
        $scope.handleShareInput = function (e) {
            var keys = SIS.Utils.getKeyMap();

            if (e.type === 'paste') {
                _parseForUrl();
            } else if (e.type === 'keyup') {
                switch (e.which) {
                    case keys.enter:
                        if (!e.metaKey) {
                            _parseForUrl();
                        }
                        break;
                    case keys.space:
                    case keys.backspace:
                    case keys['delete']:
                        _parseForUrl();
                        break;
                    default:
                        break;
                }
            } else if (e.type === 'keydown') {
                switch (e.which) {
                    case keys.enter:
                        if (e.metaKey) {
                            // CMD+ENTER shortcut for share
                            $scope.share();
                            $scope.focusShareInput(e, true);
                            $timeout(function () {
                                $(e.target).blur();
                            })
                        }
                        break;
                    default:
                        break;
                }
            }
        };
        $scope.selectPreviewImage = function (e, isBack) {
            // Initialize the index if needed
            $scope.shareUrlPreview.selectedImage = $scope.shareUrlPreview.selectedImage || 0;

            // Increment selected
            $scope.shareUrlPreview.selectedImage = isBack ? $scope.shareUrlPreview.selectedImage - 1 : $scope.shareUrlPreview.selectedImage + 1;

            $scope.shareUrlPreview.imageTransform = {
                'left': '' + (-1 * $scope.shareUrlPreview.selectedImage * 180) + ''
            };
        };
        $scope.share = function (e) {
            if (!$.trim($scope.shareText).length) {
                return;
            }

            var data = {
                'userText': $scope.shareText
            };

            if ($scope.shareUrlPreview) {
                $.extend(data, {
                    'title':        $scope.shareUrlPreview.title,
                    'description':  $scope.shareUrlPreview.description,
                    'image_url':    $scope.shareUrlPreview.validImageUrls && $scope.shareUrlPreview.validImageUrls.length ? $scope.shareUrlPreview.validImageUrls[$scope.shareUrlPreview.selectedImage || 0] : undefined,
                    'article_url':  $scope.shareUrlPreview.url,
                    'get_activity': true // Gets the activity object to add to the feed
                });
            }

            $scope.sendingShareRequest = true;

            SIS.Model.ArticleService.pushArticle({
                'scope':   $scope,
                'data':    data,
                'success': function (response) {
                    namespace.clearShare();
                    $scope.sendingShareRequest = false;
                    // Add the activity to the top of the array as a preview temporarily
                    var id = response.activity.object.entityTOList[0].objectId;
                    $scope.entityMap.article[id] = response.activity.object.entityTOList[0].object;

                    response.activity && $scope.activity[0].activity.unshift(response.activity);
                    _removeIds.push(response.activity.id);
                },
                'error':   function (xhr, status, response) {
                    $alert.error('PE008'); // Error sharing article. Please try again later
                    console.error('Error sharing article', response);
                    $scope.sendingShareRequest = false;
                }
            })
        };
        $scope.clearSharePreview = function (e) {
            _lastClearedShareUrl = $scope.shareUrlPreview && $scope.shareUrlPreview.url;
            $scope.shareUrlPreview = undefined;
            _shareUrl = undefined;
        };
        $scope.focusShareInput = function (e, isBlur) {
            $scope.shareInputFocused = isBlur ? false : true;

            if (!$scope.shareInputFocused) {
                _lastClearedShareUrl = undefined;
            }
        };

        /******************************
         * EVENT HANDLERS AND WATCHERS
         ******************************/
        var _unbindUserStateChange = $scope.$on(SIS.Model.UserService.EVENT_USER_STATE_CHANGE, _handleUserStateChange);
        var _unbindLocationChange = $scope.$on('$locationChangeStart', _setHistory);
        $scope.$on('$destroy', function () {
            SIS.Model.Activity.clearPoll();
            _unbindOnScroll();
            _unbindLocationChange();
            _unbindUserStateChange();
        });
        var _unbindOnScroll = $scope.$on(SIS.BROADCAST_EVENTS.WINDOW_SCROLL, _onScroll);
        var _unbindOnResize = $scope.$on(SIS.BROADCAST_EVENTS.WINDOW_RESIZE, _onResize);

        $scope.$watch('shareText', function (n) {
            if ($scope.shareText || $scope.shareUrlPreview) {
                window.onbeforeunload = _onUnload;
            } else {
                window.onbeforeunload = undefined;
            }
        });
    };
})(SIS.Controllers.Activity);
