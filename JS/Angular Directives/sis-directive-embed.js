//Create your namespace
SIS.namespace("SIS.Directives.Embed");

//Define your namespace
(function (namespace) {
    namespace.directive = function ($timeout, $compile) {
        return {
            'scope':    {
                'myTarget':              '=embed',
                'myPreviewSelector':     '@ePreviewTarget',
                'myEventProxySelector':  '@eEventProxy',
                'mySubmitProxySelector': '@eSubmitProxy',
                'metaDataCallback':      '&eMetaDataCallback',
                'targetIsArray':         '=eTargetIsArray'
            },
            'template': function($element, $attrs) {
                return $('#sis-directive-embed-template').html();
            },
            'replace':  true,
            'link':     function ($scope, $element, $attrs) {
                /********************
                 * VARS
                 *********************/
                $scope.vendors = SIS.Model.MediaService.vendors;
                var _generateCover = $attrs.generateCover !== undefined,
                    _$myTextInput = $element.find('.e-input'),
                    _$myEventProxy = $($scope.myEventProxySelector).length > 0 ? $($scope.myEventProxySelector) : $element,
                    SOUNDCLOUD_KEY = 'b4ed1bbd95cbca9e23b40a9d24737d22',
                    SLIDESHARE_KEY = 'msCpLON8',
                    SLIDESHARE_SECRET = '6orchED4',
                    API_TIMEOUT = 5000,
                    _$myPreviewWrap,
                    _$mySubmitButton;

                /********************
                 * METHODS
                 *********************/
                var _init = function () {
                    $scope.metaDataCallback = $scope.metaDataCallback() || function () {console.log('metaData handler was invalid or not declared');};
                    _$myTextInput.off('paste').on('paste', function (e) {
                        $timeout(function (e) {
                            $scope.processEmbedString(e);
                        });
                    });
                    _$myEventProxy.off('clear').on('clear', function (e) {
                        $scope.clearEmbedString();
                    });
                };

                var _getEmbedData = function (embedString) {
                    if (typeof embedString !== 'string') return;
                    var matchFound = false,
                        newEmbedData;

                    for (var vendor in $scope.vendors) {
                        var obj = $scope.vendors[vendor],
                            match = obj.pattern ? embedString.match(obj.pattern) : undefined;

                        if (match && match[obj.idIndex]) {
                            newEmbedData = newEmbedData || {};
                            newEmbedData.vendor = vendor;
                            newEmbedData.id = match[obj.idIndex];
                            newEmbedData.frameSrc = !$scope.vendors[vendor].requiresAPI ? $scope.vendors[vendor].embedUrl.replace('[$ID]', newEmbedData.id) : false;
                            _verifyEmbedData(newEmbedData);
                            matchFound = true;
                            break;
                        }
                    }
                    if (!matchFound) {
                        $('#alert').alert('show', 'error', 'The url entered was not valid: could not determine vendor');
                        $('.sis-embed').removeClass('processing');
                        _$myTextInput.addClass('invalid').off('keydown').on('keydown', function () {
                            $(this).removeClass('invalid');
                        }).focus()[0].select();
                    }
                };

                var _verifyEmbedData = function (embedData) {
                    var vendor = embedData.vendor,
                        id = embedData.id;
                    switch (vendor) {

                        case 'youtube':
                            $.ajax({
                                'dataType': 'json',
                                'timeout':  API_TIMEOUT,
                                'url':      'https://gdata.youtube.com/feeds/api/videos/' + id + '?v=2&alt=json',
                                'success':  function (response, status, xhr) {
                                    var metaData = {};
                                    response = response.entry;
                                    //console.log("youtube response:", response);
                                    if (response.title && response.title.$t && response.title.$t.length > 0) {
                                        metaData.title = response.title.$t;
                                    }
                                    if (response.media$group && response.media$group.media$description && response.media$group.media$description.$t && response.media$group.media$description.$t.length > 0) {
                                        metaData.description = response.media$group.media$description.$t.replace(/(<br \/>|<br\/>|<br>)/g, '\r\n');
                                    }

                                    embedData.cover = 'https://img.youtube.com/vi/[$ID]/0.jpg'.replace('[$ID]', embedData.id);
                                    _previewEmbedMedia(embedData, metaData);
                                },
                                'error':    _handleAPICheckError
                            })
                            break;

                        case 'vimeo':
                            var hasId = id.indexOf('/') < 0,
                                url = hasId ? 'https://vimeo.com/api/v2/video/' + id + '.json' : 'http://vimeo.com/api/oembed.json?url=http://vimeo.com/' + id,
                                vendorData = $scope.vendors['vimeo'];

                            $.ajax({
                                'url':      url,
                                'timeout':  API_TIMEOUT,
                                'dataType': 'json',
                                'success':  function (response, status, xhr) {
                                    var metaData = {};
                                    response = hasId ? response[0] : response;
                                    embedData.id = hasId ? response.id : response.video_id;
                                    embedData.frameSrc = vendorData.embedUrl.replace('[$ID]', embedData.id);

                                    if (response.title && response.title.length > 0) metaData.title = response.title;
                                    if (response.description && response.description.length > 0) metaData.description = response.description.replace(/(<br \/>|<br\/>|<br>)/g, '\r\n');
                                    if (response.tags && response.tags.length > 0) metaData.tags = response.tags.split(', ');

                                    if (response.thumbnail_large && response.thumbnail_large.length > 0) {
                                        embedData.cover = response.thumbnail_large;
                                    } else if (response.thumbnail_medium && response.thumbnail_medium.length > 0) {
                                        embedData.cover = response.thumbnail_medium;
                                    } else if (response.thumbnail_small && response.thumbnail_small.length > 0) {
                                        embedData.cover = response.thumbnail_small;
                                    } else if (response.thumbnail_url && response.thumbnail_url.length > 0) {
                                        embedData.cover = response.thumbnail_url;
                                    }

                                    _previewEmbedMedia(embedData, metaData);
                                },
                                'error':    _handleAPICheckError
                            });
                            break;

                        case 'soundcloud':
                            var hasId = embedData.id.indexOf('/') < 0,
                                url = hasId ? 'https://api.soundcloud.com/tracks/' + id + '.json?client_id=' + SOUNDCLOUD_KEY : 'https://api.soundcloud.com/resolve.json?url=http://soundcloud.com/' + id + '&client_id=' + SOUNDCLOUD_KEY,
                                vendorData = $scope.vendors['soundcloud'];
                            $.ajax({
                                'url':      url,
                                'timeout':  API_TIMEOUT,
                                'dataType': 'json',
                                'success':  function (response, status, xhr) {
                                    var tagExp = /\"[\w\s]+\"|([^ \"]+)/g,
                                        metaData = {};

                                    if (response.title && response.title.length > 0) metaData.title = response.title;
                                    if (response.description && response.description.length > 0) metaData.description = response.description.replace(/(<br \/>|<br\/>|<br>)/g, '\r\n');
                                    if (response.tag_list && response.tag_list.length > 0) metaData.tags = response.tag_list.match(tagExp);

                                    embedData.id = response.id;
                                    embedData.frameSrc = vendorData.embedUrl.replace('[$ID]', response.id);
                                    if (response.artwork_url && response.artwork_url.length > 0) {
                                        embedData.cover = response.artwork_url.replace('-large.', '-original.');
                                    } else if (response.waveform_url && response.waveform_url.length > 0) {
                                        embedData.cover = response.waveform_url;
                                    }
                                    _previewEmbedMedia(embedData, metaData);

                                },
                                'error':    _handleAPICheckError
                            });
                            break;

                        case 'slideshare':
                            var hasId = id.indexOf('/') < 0,
                                baseUrl = hasId ? '/slideshare?slideshow_id=' + id : '/slideshare?slideshow_url=http%3A%2F%2Fwww.slideshare.net%2F' + encodeURIComponent(id),
                                vendorData = $scope.vendors['slideshare'],
                                ts = Math.round(new Date().getTime() / 1000),
                                hash = CryptoJS.SHA1(SLIDESHARE_SECRET + ts).toString(),
                                opts = {
                                    'url':      baseUrl + '&detailed=1&api_key=' + SLIDESHARE_KEY + '&hash=' + hash + '&ts=' + ts,
                                    'timeout':  API_TIMEOUT,
                                    'dataType': 'xml',
                                    'success':  function (response, status, xhr) {
                                        var $response = $(response);
                                        if ($response.find('Slideshow')[0]) {
                                            var metaData = {},
                                                title = $response.find('Title').text(),
                                                slideshowId = $response.find('ID').text(),
                                                description = $response.find('Description').text(),
                                                thumbnail = $response.find('PPTLocation').length > 0 ? 'https://image.slidesharecdn.com/' + $response.find('PPTLocation').text() + '/95/slide-1-638.jpg' : $response.find('ThumbnailURL').length > 0 ? 'https:' + $response.find('ThumbnailURL').text() : undefined,
                                                $tags = $response.find('Tags').find('Tag');

                                            if (title.length > 0) metaData.title = title;
                                            if (description.length > 0) metaData.description = description.replace(/(<br \/>|<br\/>|<br>)/g, '\r\n');
                                            if ($tags.length > 0) {
                                                var tags = [];
                                                $tags.each(function (i) {
                                                    tags.push($(this).text());
                                                });
                                                metaData.tags = tags;
                                            }
                                            if (thumbnail) embedData.cover = thumbnail;
                                            embedData.id = slideshowId;
                                            embedData.frameSrc = vendorData.embedUrl.replace('[$ID]', slideshowId);
                                            _previewEmbedMedia(embedData, metaData);
                                        } else {
                                            opts.error(xhr, status, response);
                                        }
                                    },
                                    'error':    _handleAPICheckError
                                }
                            $.ajax(opts);
                            break;
                    }
                };

                var _handleAPICheckError = function (xhr, status, response) {
                    $('#alert').alert('show', 'error', 'The url entered was not valid: failed API check');
                    _$myTextInput.addClass('invalid').off('keydown').on('keydown', function () {
                        $(this).removeClass('invalid');
                    }).focus()[0].select();
                    $scope.stringProcessed = false;
                    $scope.$apply();
                };

                var _normalizeMetaData = function (metaData) {
                    var item, thisData;
                    for (item in metaData) {
                        if (metaData.hasOwnProperty(item)) {
                            thisData = metaData[item];
                            if ($.isArray(thisData)) {
                                var i = 0,
                                    l = thisData.length;
                                for (i; i < l; i++) {
                                    thisData[i] = SIS.Utils.removeEntities(thisData[i]);
                                }
                            } else {
                                metaData[item] = SIS.Utils.removeEntities(thisData);
                            }
                        }
                    }

                    if (metaData.description && metaData.description.length > 2000) {
                        metaData.description = metaData.description.substring(0, 1997);
                        metaData.description += '...';
                    }
                    return metaData;
                };

                var _previewEmbedMedia = function (embedData, metaData) {
                    embedData.title = metaData.title || embedData.id;
                    $scope.myEmbedData = embedData;
                    $scope.myMetaData = _normalizeMetaData(metaData);
                    $scope.stringProcessed = true;
                    $scope.loadingData = false;

                    _$myTextInput.addClass('previewing');
                    $scope.myPreview = {
                        'id':               'embedPreview',
                        'assetContentType': 'embed/' + embedData.vendor,
                        'assetUrl':         embedData.frameSrc
                    };

                    _$myPreviewWrap.append($compile('<div asset="myPreview" full force-state></div>')($scope));

                    $scope.$apply();
                    $('.sis-embed').removeClass('processing');
                    _$myEventProxy.trigger('preview');
                    _$mySubmitButton.focus();
                };

                $scope.createEmbedMedia = function (e) {
                    e.preventDefault();
                    if ($scope.embedding) return;
                    $scope.embedding = true;
                    var embedData = $scope.myEmbedData,
                        metaData = $scope.myMetaData,
                        options = {
                            'data':        JSON.stringify({
                                'asset':                 embedData.frameSrc,
                                'asset_type':            'ProjectAsset',
                                'title':                 embedData.title || embedData.id,
                                'embed_vendor':          embedData.vendor,
                                'embed_cover_image_url': decodeURI(embedData.cover),
                                'derive_cover_image':    _generateCover ? true : undefined,
                                'crop_ratio':            _generateCover ? 16 / 9 : undefined
                            }),
                            'contentType': 'application/json',
                            'processData': true,
                            'success':     function (response, status, xhr) {
                                if ($scope.targetIsArray) {
                                    $scope.myTarget = $scope.myTarget || [];
                                    $scope.myTarget.unshift(response);
                                } else {
                                    $scope.myTarget = response;
                                }

                                $scope.clearEmbedString();
                                $scope.embedding = false;
                                _$myEventProxy.trigger('embedded');
                                $scope.metaDataCallback(metaData);
                            },
                            'error':       function (xhr, status, response) {
                                console.log("error embedding asset:", response);
                                $scope.clearEmbedString();
                                $scope.embedding = false;
                                $('#alert').alert('show', 'error', 'Unable to embed media. Check your embed URL and try again.');
                            }
                        };

                    SIS.Model.MediaService.createMedia(options);
                };

                $scope.processEmbedString = function (event) {
                    var string = $scope.embedString;
                    event && event.preventDefault();

                    if (string && string.length > 0) {
                        $scope.loadingData = true;
                        $('.sis-embed').addClass('processing');
                        //Assigning the submit button and preview stuff here to avoid timing issues with init happening before target is in DOM
                        _$myPreviewWrap = $('.e-preview-wrap');
                        if ($($scope.mySubmitProxySelector).length > 0) {
                            _$mySubmitButton = $($scope.mySubmitProxySelector);
                        } else {
                            _$mySubmitButton = $('.e-btn-embed');
                            $scope.autoSubmitBtn = true;
                        }
                        _$mySubmitButton.off('click').on('click', $scope.createEmbedMedia);

                        _$myPreviewWrap.empty();
                        _getEmbedData(string);
                    }
                };

                $scope.clearEmbedString = function (event) {
                    event && event.preventDefault();
                    $scope.embedString = null;
                    _$myTextInput.removeClass('previewing');
                    $scope.stringProcessed = false;
                    $scope.myPreview = undefined;
                    _$myPreviewWrap && _$myPreviewWrap.empty();
                    _$myEventProxy.trigger('cleared');
                };

                $scope.checkForEmpty = function () {
                    if ($scope.embedString.length === 0) {
                        $scope.clearEmbedString();
                    }
                };

                /********************
                 * INIT
                 *********************/
                _init();
            }
        }
    };
    namespace.directive.$inject = ['$timeout', '$compile'];
})(SIS.Directives.Embed);
