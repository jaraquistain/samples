//Create your namespace
SIS.namespace("SIS.Directives.ActivityBlock.Desktop");

(function (namespace) {
    /*
     DIFFERENT BLOCK TYPES
     ---------------------
     'unknown'
     'header-s'
     'header-l'
     'project-s'
     'project-m'
     'project-l'
     'company-s'
     'company-l'
     'person-s'
     'person-l'
     'article-s'
     'article-l'
     'hero'
     'carousel'
     'engage-bar'
     'action-bar'
     'comments'
     'person-list'
     'award'
     */

    //////////////////////////////
    // Header
    //////////////////////////////
    namespace.header = function () {
        return {
            'restrict': 'A',
            'scope':    {
                'data':   '=sisActivityBlockHeader',
                'size':   '@blockSize',
                'source': '@blockSource',
                'map':    '=blockEntityMap'
            },
            'template': $('#sis-activity-block-header-template').html(),
            'link':     function ($scope, $element, $attrs) {
                /* PRIVATE VARIABLES */

                /* PRIVATE METHODS */
                var _mediaMap = {
                    'user':    'profileImage',
                    'company': 'logoMedia',
                    'project': 'coverImage'
                };
                var _placeholderMap = {
                    'user':    SIS.Model.MediaService.getPlaceholderImage('no-profile-image.jpg'),
                    'company': SIS.Model.MediaService.getPlaceholderImage('placeholder-company.png')
                };
                var _noReasonMap = [
                    'object_creator'
                ];
                var _init = function () {
                    $scope.currentUser = SIS.Model.UserService.getCurrentUser();

                    // Default to actor/object unless object is passed in as the source
                    $scope.actorData = $scope.source && $scope.data[$scope.source] ? $scope.data[$scope.source] : $scope.data.actor;
                    $scope.objectData = $scope.source && $scope.source === 'object' ? $scope.data.actor : $scope.data['object'];

                    // Set item flags/data
                    $scope.actorType = $scope.actorData.entityTOList[0].objectType;
                    $scope.objectType = $scope.objectData ? $scope.objectData.entityTOList[0].objectType : 'none';

                    // Determine if this is a self block (notifications)
                    $scope.isSelf = typeof $attrs.blockIsSelf === 'string';

                    // Determine if there is no display reason
                    $scope.noReason = !$scope.data.meta || _noReasonMap.indexOf($scope.data.meta.reason) >= 0;

                    // If there is a following relationship, determine who you are following
                    if (!$scope.noReason && ($scope.data.meta.reason === 'actor_follower' || $scope.data.meta.reason === 'object_follower')) {
                        var followingList;
                        switch ($scope.data.meta.reason) {
                            case('actor_follower'):
                                followingList = $scope.actorData.entityTOList.slice(0);
                                break;
                            case('object_follower'):
                                followingList = $scope.objectData.entityTOList.slice(0);
                                break;
                            default:
                                followingList = [];
                                break;
                        }

                        // Sort to make sure the followers are first
                        followingList.sort(function (a, b) {
                            return $scope.map[a.objectType][a.objectId].followedByCurrentUser ? $scope.map[b.objectType][b.objectId].followedByCurrentUser ? 0 : 1 : -1;
                        });

                        for (var i = 0; i < followingList.length; i++) {
                            if (followingList[i].objectType === 'user' && $scope.map.user[followingList[i].objectId].followedByCurrentUser) {
                                $scope.followee = $scope.map.user[followingList[i].objectId];
                                break;
                            }
                        }

                        if ($scope.data.meta.reason === 'actor_follower') {
                            $scope.actorData.entityTOList = followingList;
                        } else if ($scope.data.meta.reason === 'obect_follower') {
                            $scope.objectData.entityTOList = followingList;
                        }

                        if (($scope.data.meta.reason === 'actor_follower' || $scope.data.meta.reason === 'object_follower') && !$scope.followee) {
                            $scope.noReason = true;
                        }
                    }

                    // Determine if the project is the current user's
                    if ($scope.objectType === 'project' && $scope.objectData && $scope.objectData.entityTOList && $scope.objectData.entityTOList[0]) {
                        $scope.currentUserIsCollaborator = $scope.map.project[$scope.objectData.entityTOList[0].objectId].currentUserIsCollaborator;
                    }

                    // Set up header media
                    $scope.headerMedia = $scope.map[$scope.actorType][$scope.actorData.entityTOList[0].objectId][_mediaMap[$scope.actorType]];
                    $scope.headerMediaHref = '#/' + $scope.actorType + '/' + $scope.actorData.entityTOList[0].objectId;
                    $scope.headerMediaPlaceholder = _placeholderMap[$scope.actorType];

                    // Type specific data manipulation
                    switch ($scope.data.activityType) {
                        case 'project-awarded-award':
                            if ($scope.isSelf) {
                                // TODO add awarder
                            } else {
                                var project = $scope.map.project[$scope.actorData.entityTOList[0].objectId];

                                $scope.projectCreator = $scope.map.user[project.creatorId];
                                if ($scope.projectCreator) {
                                    $scope.headerMedia = $scope.projectCreator.profileImage;
                                    $scope.headerMediaHref = '#/user/' + $scope.projectCreator.id;
                                    $scope.headerMediaPlaceholder = _placeholderMap['user'];
                                } else {
                                    $scope.noImage = true;
                                }
                            }
                            break;
                        case 'user-commented-article':
                        case 'user-liked-article':
                        case 'user-posted-article':
                            $scope.article = $scope.map.article[$scope.objectData.entityTOList[0].objectId];
                            if ($scope.article) {
                                var creator = $scope.article.creator;
                                $scope.map.user[creator.id] = $scope.map.user[creator.id] || creator;
                                $scope.articleCreator = {
                                    'objectId':   creator.id,
                                    'objectType': 'user'
                                };
                                $scope.isCurrentUserCreator = creator.id === $scope.currentUser.id;
                                $scope.isActorCreator = creator.id === $scope.actorData.entityTOList[0].objectId;
                            }
                            break;
                        case 'user-joined-project':
                            var inviter = $scope.map.user[$scope.actorData.entityTOList[0].meta.inviterUserId];
                            if (inviter && inviter.followedByCurrentUser) {
                                $scope.inviter = inviter;
                                $scope.invitee = $scope.actorData.entityTOList[0];
                                $scope.actorData = {
                                    'entityTOList': [
                                        {
                                            'objectId':   $scope.inviter.id,
                                            'objectType': 'user'
                                        }
                                    ]
                                };
                                $scope.headerMedia = $scope.inviter.profileImage;
                                $scope.headerMediaHref = '#/user/' + $scope.inviter.id;
                                $scope.headerMediaPlaceholder = _placeholderMap['user'];
                                $scope.followee = $scope.inviter;
                                $scope.noReason = false;
                            }
                            break;
                        case 'removed':
                            $scope.noImage = true;
                            break;
                        default:
                            break;
                    }

                    // Get the media to show in the image section
                    /*
                     console.group('header media');
                     console.log($scope.map);
                     console.log($scope.map[$scope.actorType]);
                     console.log($scope.map[$scope.actorType][$scope.actorData.entityTOList[0].objectId]);
                     console.log($scope.map[$scope.actorType][$scope.actorData.entityTOList[0].objectId][_mediaMap[$scope.actorType]]);
                     console.groupEnd();
                     */

                    $scope.isDebug = SIS.DEBUG_MODE;

                    if ($scope.noReason) {
                        // Log analytics if no reason is set
                        SISAX.trackEvent("activity_no_reason", SISAX.cats.ACTIVITY, {
                            "activityId": $scope.data.id
                        });
                    }

                };

                /* PUBLIC VARIABLES */

                /* PUBLIC METHODS */

                /* WATCHERS */
                $scope.$watch('data', function (n) {
                    if (n) {
                        _init();
                    }
                }, true);

                /* INIT */
                _init();
            }
        }
    };
    namespace.header.$inject = [];

    //////////////////////////////
    // Header User List
    //////////////////////////////
    namespace.headerUserList = function () {
        return {
            'restrict': 'A',
            'scope':    {
                'data': '=sisActivityBlockHeaderUserList',
                'map':  '=entityMap'
            },
            'template': $('#sis-activity-block-header-user-list-template').html(),
            'link':     function ($scope, $element, $attrs) {
                /* PRIVATE VARIABLES */

                /* PRIVATE METHODS */
                var _init = function () {
                    $scope.currentUser = SIS.Model.UserService.getCurrentUser();
                };

                /* PUBLIC VARIABLES */

                /* PUBLIC METHODS */

                /* INIT */
                _init();
            }
        }
    };
    namespace.headerUserList.$inject = [];

    //////////////////////////////
    // Person
    //////////////////////////////
    namespace.person = function () {
        return {
            'restrict': 'A',
            'scope':    {
                'data':             '=sisActivityBlockPerson',
                'source':           '@blockSource',
                'limit':            '@sisActivityBlockPersonLimit',
                'size':             '@blockSize',
                'map':              '=blockEntityMap',
                'hideViewAll':      '@blockHideViewAll',
                'sortType':         '@sisActivityBlockSortType',
                'generateActivity': '@blockGenerateActivity'
            },
            'template': $('#sis-activity-block-person-template').html(),
            'link':     function ($scope, $element, $attrs) {
                /* PRIVATE VARIABLES */
                var _maxItems = 1000, _mySortFunc;

                /* PRIVATE METHODS */
                var _isCurrent = function (actor) {
                    return actor.object.id !== SIS.Model.UserService.getCurrentUser().id;
                };

                var _init = function (showAll, currentLength) {
                    $scope.limit = parseInt($scope.limit) || $scope.data.length;
                    $scope.showAll = showAll;
                    $scope.showing = currentLength || $scope.limit || _maxItems; // Handle the case where limit is not supplied
                    $scope.source = $scope.source || 'object';

                    switch ($scope.sortType) {
                        case ('follow'):
                            _mySortFunc = function (a, b) {
                                return $scope.map[a.objectType][a.objectId].followedByCurrentUser ? $scope.map[b.objectType][b.objectId].followedByCurrentUser ? 0 : 1 : -1;
                            };
                            break;
                    }

                    //Concat actor and object together if 'both' is passed as source
                    $scope.personList = $scope.source === 'both' ? $scope.data.actor.entityTOList.concat($scope.data.object.entityTOList) : $scope.personList = $scope.data[$scope.source].entityTOList;

                    //Filter out current user
                    $scope.personList.filter(function (user) {
                        !$scope.isCurrentUser(user.id)
                    });

                    //sort the array if a sortType was passed
                    if (_mySortFunc) {
                        var _sortedList = $scope.personList.slice(0);
                        _sortedList.sort(_mySortFunc);
                        $scope.personList = _sortedList;
                    }
                };

                $scope.$watch('data', function (n) {
                    _init($scope.showAll, $scope.showing);
                }, true);

                $scope.isCurrentUser = function (id) {
                    return SIS.Model.UserService.getCurrentUser() ? id === SIS.Model.UserService.getCurrentUser().id : false;
                };

                /* PUBLIC VARIABLES */

                /* PUBLIC METHODS */
                $scope.toggleView = function () {
                    $scope.showing = $scope.showAll ? $scope.limit : $scope.data[$scope.source].entityTOList.length;
                    $scope.showAll = !$scope.showAll;
                };

                /* INIT */
                _init();
            }
        }
    };
    namespace.person.$inject = [];

    //////////////////////////////
    // People List
    //////////////////////////////
    namespace.personList = function () {
        return {
            'restrict': 'A',
            'scope':    {
                'data':   '=sisActivityBlockPersonList',
                'source': '@blockSource',
                'limit':  '=blockLimit',
                'map':    '=blockEntityMap'
            },
            'template': $('#sis-activity-block-person-list-template').html(),
            'link':     function ($scope, $element, $attrs) {
                var _init = function () {
                    $element.addClass('sis-activity-block sis-activity-block-person-list');
                };

                $scope.limit = parseInt($scope.limit) > -1 ? parseInt($scope.limit) : 7;
                _init();
            }
        }
    };
    namespace.personList.$inject = [];

    //////////////////////////////
    // Project
    //////////////////////////////
    namespace.project = function () {
        return {
            'restrict': 'A',
            'scope':    {
                'data':   '=sisActivityBlockProject',
                'size':   '@blockSize',
                'source': '@blockSource',
                'map':    '=blockEntityMap'
            },
            'template': $('#sis-activity-block-project-template').html(),
            'link':     function ($scope, $element, $attrs) {
                var _truncateMap = {
                    'm': {
                        'title':       60,
                        'description': 290
                    },

                    's': {
                        'title':       70,
                        'description': 0
                    }
                };

                var _init = function () {
                };

                $scope.getTruncateLength = function (type, title) {
                    title = title || '';
                    var mySizes = _truncateMap[$scope.size];
                    switch (type) {
                        case 'title':
                            return mySizes.title;
                            break;
                        case 'description':
                            return title.length > (mySizes.title / 2) ? mySizes.description / 2 : mySizes.description;
                            break;
                    }
                };
                $scope.source = $scope.source || 'object';
                $scope.showEngage = $attrs.showEngage !== undefined;
                _init();
            }
        }
    };
    namespace.project.$inject = [];

    //////////////////////////////
    // Company
    //////////////////////////////
    namespace.company = function () {
        return {
            'restrict': 'A',
            'scope':    {
                'data':   '=sisActivityBlockCompany',
                'source': '@blockSource',
                'map':    '=blockEntityMap'
            },
            'template': $('#sis-activity-block-company-template').html(),
            'link':     function ($scope, $element, $attrs) {

                var _init = function () {
                    $scope.industryLimit = 3;
                };

                _init();
            }
        }
    };
    namespace.company.$inject = [];

    //////////////////////////////
    // Hero
    //////////////////////////////
    namespace.hero = function ($timeout) {
        return {
            'restrict': 'A',
            'scope':    {
                'data':   '=sisActivityBlockHero',
                'index':  '@blockIndex',
                'source': '@blockSource',
                'map':    '=blockEntityMap'
            },
            'template': $('#sis-activity-block-hero-template').html(),
            'link':     function ($scope, $element, $attrs) {
                var _init = function () {
                    $scope.index = parseInt($scope.index, 10) || 0;
                    $element.addClass('sis-activity-block sis-activity-block-hero');
                };
                $scope.source = $scope.source || 'object';
                $timeout(_init);
            }
        }
    };
    namespace.hero.$inject = ['$timeout'];

    //////////////////////////////
    // Award
    //////////////////////////////
    namespace.award = function () {
        return {
            'restrict': 'A',
            'scope':    {
                'data':   '=sisActivityBlockAward',
                'source': '@blockSource',
                'map':    '=blockEntityMap'
            },
            'template': $('#sis-activity-block-award-template').html(),
            'link':     function ($scope, $element, $attrs) {
                var _init = function () {
                    $scope.awardSource = $scope.source || 'object';
                    $scope.projectSource = $scope.awardSource === 'object' ? 'actor' : 'object';

                    $scope.award = $scope.map[$scope.data[$scope.awardSource].entityTOList[0].objectType][$scope.data[$scope.awardSource].entityTOList[0].objectId];
                    $scope.project = $scope.map[$scope.data[$scope.projectSource].entityTOList[0].objectType][$scope.data[$scope.projectSource].entityTOList[0].objectId];
                };

                _init();
            }
        }
    };
    namespace.award.$inject = [];

    //////////////////////////////
    // Engagement Bar
    //////////////////////////////
    namespace.engageBar = function () {
        return {
            'restrict': 'A',
            'scope':    {
                'data':   '=sisActivityBlockEngageBar',
                'type':   '@blockType',
                'index':  '@blockIndex',
                'source': '@blockSource',
                'map':    '=blockEntityMap'
            },
            'template': $('#sis-activity-block-engage-bar-template').html(),
            'link':     function ($scope, $element, $attrs) {
                var _iconMap = {
                        'project':           ['likes', 'team'],
                        'project-award':     ['likes', 'team'],
                        'follow':            ['follow'],
                        'join-project':      ['likes', 'team'],
                        'updated-project':   ['likes', 'team'],
                        'commented-project': ['likes', 'team'],
                        'liked-project':     ['likes', 'team'],
                        'commented-article': ['likes'],
                        'liked-article':     ['likes'],
                        'shared-article':    ['likes'],
                        'followed-user':     [],
                        'company':           ['employees'],
                        'joined-shocase':    []
                    },
                    _actionMap = {
                        'project':           'Added',
                        'join-project':      'Joined',
                        'updated-project':   'Updated',
                        'follow':            'Followed',
                        'person':            'Joined',
                        'profile-img':       'Changed',
                        'project-award':     'Awarded',
                        'commented-project': 'Commented',
                        'liked-project':     'Liked',
                        'commented-article': 'Commented',
                        'liked-article':     'Liked',
                        'shared-article':    'Shared',
                        'followed-user':     'Followed',
                        'company':           'Updated',
                        'joined-shocase':    'Joined'

                    };

                var _init = function () {
                    $element.addClass('sis-activity-block sis-activity-block-engage-bar sis-block-type-' + $scope.type);
                    $scope.index = parseInt($scope.index, 10) || 0;
                    $scope.action = _actionMap[$scope.type];

                };

                $scope.shouldShowIcon = function (iconName) {
                    return $.inArray(iconName, _iconMap[$scope.type]) > -1;
                };

                $scope.source = $scope.source || 'object';
                _init();
            }
        }
    };
    namespace.engageBar.$inject = [];

    //////////////////////////////
    // Comments
    //////////////////////////////
    namespace.comments = function () {
        return {
            'restrict': 'A',
            'scope':    {
                'data':   '=sisActivityBlockComments',
                'type':   '@blockType',
                'source': '@blockSource',
                'map':    '=blockEntityMap'
            },
            'template': $('#sis-activity-block-comments-template').html(),
            'link':     function ($scope, $element, $attrs) {
                /* PRIVATE VARIABLES */
                var _nameMap = {
                    'article': 'userText',
                    'project': 'projectName'
                }, MAX_NAME_LENGTH = 50;

                /* PUBLIC METHODS */
                $scope.showComments = function (e) {
                    $scope.commentsVisible = true;
                };

                var _init = function () {
                    $scope.sourceData = $scope.source ? $scope.data[$scope.source].entityTOList : $scope.data.actor.entityTOList;
                    $scope.articleId = $scope.sourceData[0].objectId;
                    var article = $scope.map[$scope.sourceData[0].objectType][$scope.sourceData[0].objectId];
                    $scope.articleName = article ? article[_nameMap[$scope.type]] : 'Comments';

                    // Truncate to prevent
                    $scope.articleName = typeof $scope.articleName === 'string' && $scope.articleName.length > MAX_NAME_LENGTH ? $scope.articleName.slice(0, MAX_NAME_LENGTH - 3) + '...' : $scope.articleName;
                };

                /* INIT */
                _init();
            }
        }
    };
    namespace.comments.$inject = [];

    //////////////////////////////
    // Action Bar
    //////////////////////////////
    namespace.actionBar = function () {
        return {
            'restrict': 'A',
            'scope':    {
                'data':   '=sisActivityBlockActionBar',
                'text':   '@blockText',
                'map':    '=blockEntityMap',
                'action': '&blockAction',
                'type':   '@blockType',
                'id':     '@blockId'
            },
            'template': $('#sis-activity-block-action-bar-template').html(),
            'link':     function ($scope, $element, $attrs) {
                /* PRIVATE VARIABLES */

                /* PRIVATE METHODS */
                var _init = function () {

                };

                /* PUBLIC METHODS */
                $scope.actionClick = function (e) {
                    SIS.Utils.call($scope.action(), undefined, e);
                };

                /* INIT */
                _init();
            }
        }
    };
    namespace.actionBar.$inject = [];

    //////////////////////////////
    // Pull Quote
    //////////////////////////////
    namespace.pullQuote = function ($sce) {
        return {
            'restrict': 'A',
            'scope':    {
                'data':          '=sisActivityBlockPullQuote',
                'source':        '@blockSource',
                'key':           '@blockKey',
                'map':           '=blockEntityMap',
                'includeAuthor': '@blockAuthor'
            },
            'template': $('#sis-activity-block-pull-quote-template').html(),
            'link':     function ($scope, $element, $attrs) {
                /* PRIVATE VARIABLES */

                /* PRIVATE METHODS */
                var _init = function () {

                    var source = $scope.source || 'actor';
                    var item = $scope.data[source].entityTOList[0];
                    var meta = item.meta;

                    if ($attrs.blockAuthor !== undefined) {
                        $scope.author = $scope.map[item.objectType][item.objectId];
                    }

                    var html = meta && $scope.key ? meta[$scope.key] : $scope.map[item.objectType][item.objectId] ? $scope.map[item.objectType][item.objectId][$scope.key] : '';

                    // First, replace br's with \n, then remove html tags and reduce spaces/tabs down to on space. The resulting text is in a pre tag.
                    html = html.replace(/[<br\/?]+>/g, '\n').replace(/<\/?[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').trim();

                    // Add anchors for links
                    html = html.replace(SIS.Directives.Validators.getURLRegexp(true), function (match) {
                        return '<a class="sis-copy-secondary hover" target="_blank" data-click-action="clickthrough" data-click-type="' + item.objectType + '-userText-link" data-click-id="' + item.objectId + '" data-click-activity-type="' + $scope.data.activityType + '" href="' + match + '">' + match + '</a>'
                    });

                    // Set the quote
                    $scope.quote = html;

                    // Set the article for additional info
                    if ($scope.data.activityType === 'user-posted-article' || $scope.data.activityType === 'user-liked-article' || $scope.data.activityType === 'user-commented-article') {
                        $scope.article = $scope.map.article[$scope.data.object.entityTOList[0].objectId];
                    }
                };

                /* PUBLIC METHODS */
                $scope.trustedHtml = function (html) {
                    // Necessary to maintain data attributes
                    return $sce.trustAsHtml(html);
                };

                /* INIT */
                _init();
            }
        }
    };
    namespace.pullQuote.$inject = ['$sce'];

    //////////////////////////////
    // Article
    //////////////////////////////
    namespace.article = function () {
        return {
            'restrict': 'A',
            'scope':    {
                'data':   '=sisActivityBlockArticle',
                'source': '@blockSource',
                'map':    '=blockEntityMap'
            },
            'template': $('#sis-activity-block-article-template').html(),
            'link':     function ($scope, $element, $attrs) {
                var _truncateMap = {
                    'l': {
                        'title':       50,
                        'description': 370
                    },

                    's': {
                        'title':       25,
                        'description': 210
                    }
                };
                /* PRIVATE VARIABLES */

                /* PRIVATE METHODS */
                var _init = function () {
                    $scope.source = $scope.source || 'actor';
                    $scope.article = $scope.map.article[$scope.data[$scope.source].entityTOList[0].objectId];
                    $scope.size = $attrs.blockSize === 's' ? $attrs.blockSize : $scope.article && $scope.article.articleImage && $scope.article.articleImage.coverImages.s ? 'l' : 's';

                    if ($scope.article) {
                        $scope.articleDomain = $scope.article.articleUrl ? SIS.Utils.getUrlDomain($scope.article.articleUrl) : undefined;
                    }
                };

                /* PUBLIC METHODS */
                $scope.getTruncateLength = function (type, title) {
                    title = title || '';
                    var mySizes = _truncateMap[$scope.size];
                    switch (type) {
                        case 'title':
                            return mySizes.title;
                            break;
                        case 'description':
                            return title.length > (mySizes.title / 2) ? mySizes.description * 0.75 : mySizes.description;
                            break;
                    }
                };

                /* INIT */
                _init();
            }
        }
    };
    namespace.article.$inject = [];

    //////////////////////////////
    // Carousel
    //////////////////////////////
    namespace.carousel = function ($timeout) {
        return {
            'restrict': 'A',
            'scope':    {
                'data':   '=sisActivityBlockCarousel',
                'source': '@blockSource',
                'map':    '=blockEntityMap',
                'type':   '@blockType',
                'limit':  '@blockLimit'
            },
            'template': $('#sis-activity-block-carousel-template').html(),
            'link':     function ($scope, $element, $attrs) {
                var _$slideWrap = $element.find('.slide-wrap'),
                    _transform = SIS.Utils.getTransform($element),
                    TRANSITION_LENGTH = 218,
                    IMG_WIDTH = 240,
                    SLIDE_PADDING = 10;

                var _init = function () {

                    if ($scope.type === 'asset') {
                        $scope.assetList = [];
                        $scope.data[$scope.source].entityTOList.forEach(function (actor) {
                            $scope.assetList = actor.meta && $.isArray(actor.meta.assets) ? $scope.assetList.concat(actor.meta.assets) : $scope.assetList;
                        });
                    }

                    $scope.limit = parseInt($scope.limit, 10) > 0 ? parseInt($scope.limit, 10) : 99999;
                    $scope.imgWidth = IMG_WIDTH;
                    $scope.slideWidth = IMG_WIDTH + SLIDE_PADDING;
                    $scope.notSource = $scope.source === 'actor' ? 'object' : 'actor';

                    $scope.lastSlide = $scope.type === 'project' ? $scope.data[$scope.source].entityTOList.length - 3 : $scope.assetList.length - 3;
                    $scope.lastSlide = $scope.lastSlide > 0 ? $scope.lastSlide > $scope.limit - 2 ? $scope.limit - 2 : $scope.lastSlide : 0;

                    $scope.wrapWidth = $scope.type === 'project' ? $scope.data[$scope.source].entityTOList.length * $scope.slideWidth : $scope.assetList.length * $scope.slideWidth;
                    $scope.setSlide(0);
                };

                $scope.setSlide = function (slide) {
                    $scope.currentSlide = slide > 0 ? slide > $scope.lastSlide ? $scope.lastSlide : slide : 0;
                    //TODO: handle dynamic transition length
                    _$slideWrap.css(_transform, 'translate3d(' + -($scope.slideWidth * $scope.currentSlide) + 'px , 0, 0)');
                };

                _init();
            }
        }
    };
    namespace.carousel.$inject = ['$timeout'];

    //////////////////////////////
    // Expanding Button
    //////////////////////////////
    namespace.dynamicButton = function ($timeout) {
        return {
            'restrict': 'A',
            'scope':    {
                'type':       '@blockType',
                'action':     '@blockAction',
                'id':         '=blockId',
                'size':       '@blockSize',
                'isSelected': '=blockIsSelected'
            },
            'template': $('#sis-activity-block-dynamic-button-template').html(),
            'link':     function ($scope, $element, $attrs) {
                /* PRIVATE VARIABLES */
                var _confirmationDelay = 1500,
                    _timeout,
                    _textMap = {
                        'like': {
                            'selected':   {
                                'confirmation': 'Liked!',
                                'hover':        'Unlike'
                            },
                            'deselected': {
                                'confirmation': 'Unliked',
                                'hover':        'Like'
                            }
                        }
                    };

                /* PRIVATE METHODS */
                var _init = function () {
                    $scope.text = _textMap[$scope.action][$scope.isSelected ? 'selected' : 'deselected'].hover;
                };

                /* PUBLIC METHODS */
                $scope.handleClick = function (e) {
                    // Make sure the collapsed state is reset
                    $scope.collapsed = false;

                    // Set the button text to the confirmation message and add the class flag
                    $scope.text = _textMap[$scope.action][$scope.isSelected ? 'deselected' : 'selected'].confirmation;
                    $scope.isConfirmation = true;

                    // Hide the confirmation after a delay and reset the state
                    _timeout = $timeout(function () {
                        $scope.collapsed = true;
                        $scope.isConfirmation = false;
                        $scope.text = _textMap[$scope.action][$scope.isSelected ? 'selected' : 'deselected'].hover;
                    }, _confirmationDelay);
                };
                $scope.handleMouseEnter = function (e) {
                    $scope.collapsed = false;
                    $scope.isConfirmation = false;
                    $scope.text = _textMap[$scope.action][$scope.isSelected ? 'selected' : 'deselected'].hover;
                    $timeout.cancel(_timeout);
                };
                $scope.handleMouseLeave = function (e) {
                    $scope.collapsed = false;
                    $scope.isConfirmation = false;
                    $scope.text = _textMap[$scope.action][$scope.isSelected ? 'selected' : 'deselected'].hover;
                };

                /* INIT */
                _init();
            }
        }
    };
    namespace.dynamicButton.$inject = ['$timeout'];

})(SIS.Directives.ActivityBlock.Desktop);
