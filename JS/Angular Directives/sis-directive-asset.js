//TODO: optimize _templateMap a bit more
SIS.namespace("SIS.Directives.Asset");
(function (namespace) {
    namespace.directive = function ($routeParams, $timeout, $location, $compile) {
        return {
            scope: {
                'data':            '=asset',
                'assetSize':       '@assetSize',
                'cancelSelector':  '@assetCancelSelector',
                'maxHeight':       '=assetMaxHeight',
                'coverRatio':      '=assetCoverRatio',
                'assetLoader':     '@assetLoader',
                'assetLoaderText': '@assetLoaderText'
            },
            link:  function ($scope, $element, $attrs) {
                /********************
                 * PRIVATE VARS
                 *********************/
                var _templateMap = {
                    'uploading':  '#sis-directive-asset-uploading-template',
                    'cover':      {
                        'full':       '#sis-directive-asset-image-template',
                        'processing': '#sis-directive-asset-processing-template',
                        'preview':    '#sis-directive-asset-image-template',
                        'error':      '#sis-directive-asset-error-template'
                    },
                    'profile':    {
                        'full':       '#sis-directive-asset-image-template',
                        'processing': '#sis-directive-asset-processing-template',
                        'preview':    '#sis-directive-asset-image-template',
                        'error':      '#sis-directive-asset-error-template'
                    },
                    'image':      {
                        'full':       '#sis-directive-asset-image-template',
                        'processing': '#sis-directive-asset-processing-template',
                        'preview':    '#sis-directive-asset-image-template',
                        'bgcover':    '#sis-directive-asset-bgcover-template',
                        'error':      '#sis-directive-asset-error-template'
                    },
                    'pdf':        {
                        'full':       '#sis-directive-asset-pdf-template',
                        'processing': '#sis-directive-asset-processing-template',
                        'preview':    '#sis-directive-asset-image-template',
                        'bgcover':    '#sis-directive-asset-bgcover-template',
                        'error':      '#sis-directive-asset-error-template'
                    },
                    'slideshare': {
                        'full':       '#sis-directive-asset-slideshare-template',
                        'processing': '#sis-directive-asset-processing-template',
                        'preview':    '#sis-directive-asset-image-template',
                        'bgcover':    '#sis-directive-asset-bgcover-template',
                        'error':      '#sis-directive-asset-error-template'
                    },
                    'soundcloud': {
                        'full':       '#sis-directive-asset-soundcloud-template',
                        'processing': '#sis-directive-asset-processing-template',
                        'preview':    '#sis-directive-asset-image-template',
                        'bgcover':    '#sis-directive-asset-bgcover-template',
                        'error':      '#sis-directive-asset-error-template'
                    },
                    'vimeo':      {
                        'full':       '#sis-directive-asset-vimeo-template',
                        'processing': '#sis-directive-asset-processing-template',
                        'preview':    '#sis-directive-asset-image-template',
                        'bgcover':    '#sis-directive-asset-bgcover-template',
                        'error':      '#sis-directive-asset-error-template'
                    },
                    'youtube':    {
                        'full':       '#sis-directive-asset-youtube-template',
                        'processing': '#sis-directive-asset-processing-template',
                        'preview':    '#sis-directive-asset-image-template',
                        'bgcover':    '#sis-directive-asset-bgcover-template',
                        'error':      '#sis-directive-asset-error-template'
                    },
                    'unknown':    '#sis-directive-asset-error-template'
                },
                EMBED_WRAP_SELECTOR = '.sis-asset-embed-wrap',
                _assetInfo, _$myCancelProxy, _myTemplate, _originalClassNames;

                /********************
                 * PUBLIC VARS
                 *********************/

                /********************
                 * PRIVATE METHODS
                 *********************/
                var _init = function (reInit) {
                    $scope.data = $scope.data || {};
                    $scope.pollBound = false;
                    $scope.derivedBound = false;
                    $scope.$on(SIS.Model.MediaService.events.poll + $scope.data.id, _pollStatus);
                    $scope.data.aspectRatio = _getAspectRatio($scope.data);
                    $scope.data.aspectRatioPercent = Math.round(1 / ($scope.data.aspectRatio) * 1000) / 10;
                    $scope.maxHeight = parseInt($scope.maxHeight) > 0 ? parseInt($scope.maxHeight) : undefined;
                    $scope.browser = SIS.SIS_BROWSER_INFO.name;
                    $scope.data.id && $.data($element[0], 'id', $scope.data.id);
                    $scope.isTouch = SIS.Utils.isTouch();
                    $scope.assetLoader = $scope.assetLoader || undefined;
                    $scope.assetLoaderSpinner = $scope.assetLoader && $scope.assetLoader.toLowerCase() === "spinner";
                    $scope.assetLoaderText = $scope.assetLoaderText || undefined;
                    $element.attr('data-id', $scope.data.id);
                    _$myCancelProxy = $($scope.cancelSelector).length > 0 ? $($scope.cancelSelector) : $element;
                    $scope.assetSize = $scope.assetSize || 'tiny';

                    //read the media object to determine all the info needed to display it
                    // console.log('$scope.data:', $scope.data);
                    _assetInfo = _getAssetInfo($scope.data);
                    _myTemplate = $.trim($(_assetInfo.template).html());

                    //save the original classes for re-setting purposes
                    _originalClassNames = $element.is('.sis-asset') ? _originalClassNames : $element[0].className;

                    //add appropriate classes to element based on _assetInfo
                    $element.addClass('sis-asset sis-asset-action-' + _assetInfo.action + ' ' + 'sis-asset-type-' + _assetInfo.type + ' ' + 'sis-asset-state-' + _assetInfo.state);

                    $scope.maxWidth = $scope.maxHeight * $scope.data.aspectRatio;

                    $scope.maxHeight && _assetInfo.state !== 'bgcover' && $element.css({
                        'maxWidth': $scope.maxWidth
                    });

                    //$scope.marginTop = ($scope.data.aspectRatioPercent/2 > 50 ? -50 : -$scope.data.aspectRatioPercent/2) + '%';
                    $scope.marginLeft = -$scope.maxWidth / 2;

                    // $scope watchers that should only be bound once and not on every init
                    if (!reInit) {
                        _dataWatcher = $scope.$watch(function () {
                            $scope.data = $scope.data || {};
                            var watchValue = $scope.data.id + '-' + $scope.data.status + '-' + $scope.data.aspectRatio + '-' + $scope.data.aspectRatioPercent;
                            return watchValue;
                        }, _handleChange);
                    }

                    //Insert template into DOM and compile
                    $element.empty();
                    $element.append($compile(_myTemplate)($scope));

                    //special case for images
                    var cachedImageURL;

                    //Listen for load event (triggered in inline image onload handler)
                    $element.off('load', _assetLoaded).on('load', _assetLoaded);

                    //Set the URLs
                    $scope.imageURL = SIS.Filters.IsValidImage.filter()($scope.data, $scope.assetSize, $scope.assetFallback);
                    cachedImageURL = _urlCache.get($scope.imageURL);

                    $scope.cachedImageURL = cachedImageURL && cachedImageURL !== $scope.imageURL ? cachedImageURL : undefined;
                    !$scope.cachedImageURL && $element.find('.sis-asset-image-cached').remove();

                    //special case for full size pdfs 
                    if (_assetInfo.type === 'pdf' && _assetInfo.state === 'full') {
                        var h, w, padding;

                        //CDN has to be set for use in template
                        $scope.data.cdn = SIS.ENV_JSON.CDN;

                        //Calculate the dimensions of the PDF
                        if ($scope.data.height || $scope.data.width) {
                            h = $scope.data.parent().innerHeight();
                            w = $scope.data.parent().innerWidth();
                        } else if ($scope.data.coverImages && $scope.data.coverImages.o && ($scope.data.coverImages.o.height > 0 || $scope.data.coverImages.o.width > 0)) {
                            h = $scope.data.coverImages.o.height;
                            w = $scope.data.coverImages.o.width;
                            //console.log($scope.data.coverImages);
                        }
                        padding = h && w ? Math.round((h / w) * 10000) / 100 + '%' : '129%';

                        $element.find(EMBED_WRAP_SELECTOR).css('padding-bottom', padding);

                    }
                    var $iframe = $element.find("iframe");
                    if (_assetInfo.type === 'pdf') {
                        $timeout(_iframeLoaded);
                    } else if ($iframe.length) {
                        $iframe.one("load", _iframeLoaded);
                    }

                    if (reInit) {
                        $element.trigger('reinitted', [$scope.data.id]);
                    } else {
                        $element.trigger('initted', [$scope.data.id]);
                    }
                };

                var _assetLoaded = function (e, url) {
                    _urlCache.set(url);
                    var $el = $element.find('.sis-asset-image');

                    $el.addClass('loaded');
                    $element.addClass("loaded");

                    SIS.Utils.cssAnimationCallback($el, function () {
                        $element.find('.sis-asset-image-cached').remove();
                    }, true);

                };

                var _iframeLoaded = function (e) {

                    $element.find('iframe').addClass('loaded');
                    $element.addClass("loaded");

                };

                var _getAspectRatio = function (data) {
                    var h = 9,
                        w = 16,
                        match = data && data.assetContentType ? data.assetContentType.match(/image\/(\w+)/) : false,
                        imgOnload = function () {
                            h = this.height;
                            w = this.width;
                        },
                        frOnload = function () {
                            var url = e.target.result,
                                img = new Image;

                            img.onload = imgOnload;
                            img.src = url;
                        },
                        key;

                    if ($attrs.cover !== undefined) {
                        h = 9;
                        w = 16;
                    } else if ($attrs.profile !== undefined) {
                        h = 1;
                        w = 1;
                    } else if (data.coverImages) {
                        for (key in data.coverImages) {
                            if (data.coverImages.hasOwnProperty(key)) {
                                h = data.coverImages[key].height;
                                w = data.coverImages[key].width;
                            }
                            break;
                        }
                    } else if (data.height && data.width) {
                        h = data.height;
                        w = data.width;
                    } else if (match && match[1]) {
                        if (data.file) {
                            var fr = new FileReader();
                            fr.onload = frOnload;
                            fr.readAsDataURL(data.file);
                        } else {
                            var testImg = new Image(),
                                ext = match[1] === 'jpeg' ? 'jpg' : match[1];
                            testImg.onload = imgOnload;
                            testImg.src =SIS.ENV_JSON.CDN + data.id + data.assetContentType + '.' + ext;
                        }
                    }
                    return Math.floor((w / h) * 100) / 100;
                };

                var _getAssetInfo = function (data) {
                    var vendor = SIS.Model.MediaService.getEmbedVendor(data),
                        action = vendor ? 'embed' : 'upload',
                        type, template, state;

                    if (!data) return;
                    //Set the type of asset based on either vendor, assetContentType or coverImages
                    if (vendor) {
                        type = vendor;
                    } else if (data.assetContentType) {
                        switch (data.assetContentType) {
                            case 'image/jpeg':
                            case 'image/jpg':
                            case 'image/png':
                            case 'image/gif':
                            case 'video/mp4': //TODO: video/mp4 is only added here to prevent seed data from breaking.
                                type = 'image';
                                break;
                            case 'application/pdf':
                            case 'application/x-pdf':
                                type = (SIS.SIS_ACTUAL_PLATFORM === SIS_MOBILE || SIS.SIS_BROWSER_INFO.tablet) ? 'image' : 'pdf';
                                break;
                            case 'uploading':
                                type = 'uploading';
                                state = 'uploading';
                                break;
                        }
                    } else if ($attrs.cover !== undefined || data.blurredCoverImages || data.keyColors) {
                        type = 'cover';
                    } else if ($attrs.profile !== undefined) {
                        type = 'profile';

                        $scope.assetFallback = 'img/no-profile-image.jpg';
                    } else if (data.coverImages) {
                        type = 'image';
                    } else if ($attrs.logo !== undefined) {
                        type = 'logo';
                    } else {
                        //we don't know enough to intelligently display asset, show generic
                        type = 'unknown';
                    }
                    //                    console.log('type:', type);
                    //                    console.log('id:', data.id);
                    var states = ['processing', 'error'];
                    state = !state && $.inArray(data.state, states) > -1 ? data.state : state ? state : $scope.coverRatio ? 'bgcover' : $attrs.full !== undefined ? 'full' : 'preview';
                    //Fix for old embed data missing cover images.
                    state = vendor && state === 'preview' && !data.coverImages ? 'full' : state;
                    //Kick off polling for processing asset
                    state === 'processing' && $scope.data.id !== SIS.Model.MediaService.DERIVED_ASSET_ID && _pollStatus();


                    //If we're a derived asset listen for notifying event
                    if (data.id === SIS.Model.MediaService.DERIVED_ASSET_ID && !$scope.derivedBound) {
                        $scope.derivedBound = true;
                        $scope.$on(SIS.Model.MediaService.events.derived, function (e, id) {
                            if (!$scope.gotDerivedId) {
                                $scope.gotDerivedId = true;
                                $scope.data.id = id;
                                $scope.reInit();
                            }
                        });
                    }

                    //now that we know the type and state set the template
                    template = type ? _templateMap[type] : _templateMap['unknown'];

                    if (typeof template === 'object') {
                        template = template[state] ? template[state] : _templateMap['unknown'];
                    }
                    $scope.data.assetUrl = $scope.data.assetUrl ? SIS.Utils.formatQueryString($scope.data.assetUrl, SIS.Model.MediaService.vendors[type].queryParams, SIS.Model.MediaService.vendors[type].queryParamBlacklist) : undefined;
                    return {
                        'action':   action,
                        'type':     type,
                        'state':    state,
                        'template': template
                    }
                };

                var _pollStatus = function () {
                    if (!$scope.pollBound) {
                        $scope.pollBound = true;
                        $scope.$on(SIS.Model.MediaService.events.processed + $scope.data.id, function (e, data) {
                            if ($scope.data.id === data.id) {
                                $scope.data = $.extend($scope.data, data);
                                $scope.reInit();
                            }

                        });
                    }
                    SIS.Model.MediaService.checkProgress($scope.data.id);
                };

                var _urlCache = (function () {
                    var _mediaIdCache = SIS.Model.DictionaryService.getDictionary('mediaIdCache') || SIS.Model.DictionaryService.createDictionary('mediaIdCache'),
                        URL_REGEX = /assets\/([a-zA-Z0-9]+)-([a-z]{1,2})./,
                        SIZE_INDEX = {
                            'th': 0,
                            'ti': 1,
                            's':  2,
                            'm':  3,
                            'l':  4,
                            'c':  5,
                            'o':  6
                        },
                        NUMBER_OF_SIZES = Object.keys(SIZE_INDEX).length;

                    return {
                        'set': function (url) {
                            var urlMatch = url.match(URL_REGEX),
                                id = urlMatch ? urlMatch[1] : undefined,
                                size = urlMatch ? urlMatch[2] : undefined,
                                cacheItem = id && _mediaIdCache.get(id) ? _mediaIdCache.get(id) : [];

                            if (!id || !size || (cacheItem && cacheItem[SIZE_INDEX[size]])) return;

                            //Update cache item
                            cacheItem[SIZE_INDEX[size]] = size;

                            //push the update back into the cache
                            _mediaIdCache.set(id, cacheItem);

                            return this;
                        },
                        'get': function (url) {
                            var urlMatch = url.match(URL_REGEX),
                                id = urlMatch ? urlMatch[1] : undefined,
                                size = urlMatch ? urlMatch[2] : undefined,
                                cacheItem = id ? _mediaIdCache.get(id) : undefined,
                                mySizeIndex = size ? SIZE_INDEX[size] : undefined;

                            if (!cacheItem || mySizeIndex < 1) return;

                            var i = mySizeIndex,
                                mySize,
                                myUrl;

                            //go backwards from the desired size to find the closest cached size
                            for (mySizeIndex; mySizeIndex >= 0; mySizeIndex--) {
                                mySize = cacheItem[mySizeIndex];
                                if (mySize) break;
                            }

                            //if you cant find a cached size smaller then walk up from desired size looking for one
                            if (!myUrl) {
                                for (i; i < NUMBER_OF_SIZES; i++) {
                                    mySize = cacheItem[mySizeIndex];
                                    if (mySize) break;
                                }
                            }

                            myUrl = mySize ? SIS.ENV_JSON.CDN + id + '-' + mySize + '.jpg' : undefined;

                            return myUrl;
                        }
                    };
                })();

                //Data Change Handlers
                //********************
                var _handleChange = function (newVal, oldVal) {
                    //Don't do anything if the value hasn't actually changed
                    if (newVal === oldVal || $scope.data === undefined) return;
                    //return the element to its original state in preparation for re-init
                    $element.find(EMBED_WRAP_SELECTOR).css('padding-bottom', '');
                    $element.empty();
                    $element[0].className = _originalClassNames;
                    //re-init directive as soon as able to;
                    $timeout(function () {
                        _init(true);
                    });
                };

                /********************
                 * PUBLIC METHODS
                 *********************/
                $scope.onTablet = SIS.SIS_BROWSER_INFO.tablet;

                //handler for the 'load' event triggered on images
                $scope.imageLoaded = function () {
                    console.log('image loaded:', $scope.data.id);
                    console.log($('[data-id="' + $scope.data.id + '"]')[0]);
                };

                $scope.abortUpload = function (id) {
                    if (_$myCancelProxy) {
                        _$myCancelProxy.trigger('abortrequest', id);
                    }
                };

                $scope.reInit = function () {
                    $element.find(EMBED_WRAP_SELECTOR).css('padding-bottom', '');
                    $element.empty();
                    $element[0].className = _originalClassNames;
                    _init(true)
                };

                /********************
                 * INIT
                 *********************/
                    //We have to watch for data because the asset may be loaded
                    // asynchronously after the link function was run
                $scope.$watch('data', function (newVal, oldVal) {
                    if ($scope.data && !$scope.initted) {
                        $scope.initted = true;
                        _init();
                    }
                });
            }
        };
    };
    namespace.directive.$inject = ['$routeParams', '$timeout', '$location', '$compile', '$parse'];
})(SIS.Directives.Asset);
