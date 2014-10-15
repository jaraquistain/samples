//Create your namespace
SIS.namespace('SIS.Directives.Upload');

//Define your namespace
(function (namespace) {
    namespace.directive = function ($modal, $timeout) {
        return {
            'scope': {
                'myTarget':             '=upload',
                'myClickSelector':      '@uClickTarget',
                'myDropSelector':       '@uDropTarget',
                'myEventProxySelector': '@uEventProxy',
                'myMediaType':          '@uType',
                'myCropRatio':          '@uCrop',
                'myMinResolutionH':      '@uMinResolutionH',
                'myMinResolutionW':      '@uMinResolutionW'
            },
            'link':  function ($scope, $element, $attrs) {
                /********************
                 * VARS
                 *********************/
                $scope.myMinResolutionW = parseInt($scope.myMinResolutionW) > 0 ? parseInt($scope.myMinResolutionW) : parseInt($scope.myMinResolutionH) > 0 ? parseInt($scope.myMinResolutionH) : 0;
                $scope.myMinResolutionH = parseInt($scope.myMinResolutionH) > 0 ? parseInt($scope.myMinResolutionH) : parseInt($scope.myMinResolutionW) > 0 ? parseInt($scope.myMinResolutionW) : 0;
                $scope.onTablet = SIS.SIS_BROWSER_INFO.tablet;
                $scope.circleCrop = $attrs.circleCrop !== undefined;
                var MINIMUM_RESOLUTION = SIS.ENV_JSON.ENV === 'DEV' || SIS.ENV_JSON.ENV === 'D E V' ? 0 : $scope.myMinResolutionH * $scope.myMinResolutionW;
                var _clickOk = $attrs.noClick === undefined,
                    _dropOk = $attrs.noDrop === undefined,
                    _cropRatio = $scope.myCropRatio && parseFloat($scope.myCropRatio, 10) ? parseFloat($scope.myCropRatio, 10) : undefined,
                    _myMediaTypeData = SIS.Model.MediaService.mediaTypes[$scope.myMediaType] || SIS.Model.MediaService.mediaTypes['asset'],
                    _allowMultiple = $attrs.multiple !== undefined,
                    _filesCurrentlyUploading = 0,
                    _generateCover = $attrs.generateCover !== undefined,
                    _$myDropTarget = $scope.myDropSelector === undefined ? $element : $($scope.myDropSelector).length > 0 ? $($scope.myDropSelector) : $element,
                    _$myClickTarget = $scope.myClickSelector === undefined ? $element : $($scope.myClickSelector).length > 0 ? $($scope.myClickSelector) : $element,
                    _$eventProxy = $scope.myEventProxySelector === undefined ? $element : $($scope.myEventProxySelector).length > 0 ? $($scope.myEventProxySelector) : $element,
                    _$myFileInput = $('<input>', {'style': 'display: none;', 'type': 'file', 'class': 'u-file-input', 'accept': _myMediaTypeData.validTypes.join(',')}),
                    _$myModal;
                /********************
                 * METHODS
                 *********************/
                var _init = function () {
                    //create file requests object
                    $scope.fileRequests = $scope.fileRequests || {};

                    //insert input into DOM
                    // on tablet if they are in the add project modal we append so we can absolute position the input
                    ($attrs.sisAddProjectModal && SIS.SIS_BROWSER_INFO.tablet) ? $element.append(_$myFileInput) : $element.after(_$myFileInput);

                    // set the file input to accept multiple files if configured to do so
                    if (_allowMultiple) {
                        _$myFileInput.attr('multiple', 'multiple');
                    }

                    //Prevent page from displaying file when dropped into browser
                    $(document.body).off('dragover drop').on('dragover drop', function (e) {
                        e.preventDefault();
                        return false;
                    });

                    //Bind events
                    _dropOk && _$myDropTarget.off('drop').on('drop', function (e) {
                        var dt = e.originalEvent.dataTransfer;
                        e.stopPropagation();
                        e.preventDefault();
                        $(this).removeClass('over');
                        if (dt && dt.files) {
                            _handleFiles(dt.files);
                        }
                    });

                    _dropOk && _$myDropTarget.off('dragenter dragleave').on('dragenter dragleave', function (e) {
                        $(this).toggleClass('over');
                    });

                    _clickOk && _$myClickTarget.off('click').on('click', function (e) {
                            _$myFileInput.click();
                    });

                    _$myFileInput.on('change', function (e) {
                        var me = e.target;
                        if (me && me.files) {
                            _handleFiles(me.files);
                        }
                    });

                    _$eventProxy.on('manualoverride', function (e, file, coverImageUrl) {
                        if (coverImageUrl) {
                            $scope.autoUpload = true;
                            _filesCurrentlyUploading++;
                            $element.attr('files-uploading', _filesCurrentlyUploading);
                            _autoCrop(file, coverImageUrl);
                        }
                    });

                    _$eventProxy.on('abortrequest', function (e, id) {
                        if ($scope.fileRequests[id]) {
                            if (_allowMultiple && $.isArray($scope.myTarget)) {
                                var i = 0,
                                    l = $scope.myTarget.length,
                                    thisAsset;
                                for (i; i < l; i++) {
                                    thisAsset = $scope.myTarget[i];
                                    if (id === thisAsset.id) {
                                        $timeout(function () {
                                            $scope.myTarget.splice(i, 1);
                                        });
                                        break;
                                    }
                                }
                            } else if ($scope.myTarget.id === id) {
                                $scope.myTarget = $scope.oldTarget;
                            }
                            $scope.fileRequests[id].abort();
                        }
                    });

                    _cropRatio && _$eventProxy.on('recrop', function () {
                        $scope.myTarget && $scope.myTarget.id && _reCrop(SIS.Filters.IsValidImage.filter()($scope.myTarget, 'original'));
                    });
                };

                var _handleFiles = function (fileList) {
                    _filesCurrentlyUploading = fileList.length;
                    $element.attr('files-uploading', _filesCurrentlyUploading);

                    //Loop through the file list and handle each file
                    var fList = Array.prototype.slice.call(fileList);
                    fList.forEach(function(file){
                        _validate(file, function (isValidFile) {
                            //Process the file
                            if (isValidFile.result) {
                                _processFile(file);
                            } else {
                                console.log('error:', isValidFile.reasons);
                                _fileFinishedProcessing('invalid', null, isValidFile.reasons);
                            }
                        });
                    });
                };

                var _fileFinishedProcessing = function (reason, id, data) {
                    //manipulate the reason based on auto upload or reCrop:
                    if (reason === 'success') {
                        if ($scope.autoUpload) {
                            reason = 'autoSuccess';
                        } else if ($scope.reCropping) {
                            reason = 'reCropSuccess';
                        }
                    }
                    switch (reason) {
                        case 'success':
                            _$eventProxy.trigger({
                                'type':   'filesuccess',
                                'fileId': id
                            });
                            _filesCurrentlyUploading--;
                            $element.attr('files-uploading', _filesCurrentlyUploading);
                            break;

                        case 'autoSuccess':
                            $scope.autoUpload = false;
                            _$eventProxy.trigger({
                                'type':   'autofileprocessed',
                                'fileId': id
                            });
                            _filesCurrentlyUploading--;
                            $element.attr('files-uploading', _filesCurrentlyUploading);
                            break;

                        case 'reCropSuccess':
                            $scope.reCropping = false;
                            _$eventProxy.trigger({
                                'type':   'recropprocessed',
                                'fileId': id
                            });
                            _filesCurrentlyUploading--;
                            $element.attr('files-uploading', _filesCurrentlyUploading);
                            break;

                        case 'invalid':
                            _filesCurrentlyUploading--;
                            $element.attr('files-uploading', _filesCurrentlyUploading);
                            //if (!_allowMultiple) {
                                _$eventProxy.trigger({
                                    'type':    'invalid',
                                    'fileId':  id,
                                    'reasons': data
                                });
                            //}
                            break;
                        case 'error':
                        case 'cancel':
                        case 'abort':
                        default:
                            _filesCurrentlyUploading--;
                            $element.attr('files-uploading', _filesCurrentlyUploading);
                            if (!_allowMultiple) {
                                _$eventProxy.trigger({
                                    'type':   'cancel',
                                    'fileId': id
                                });
                            }
                            break;
                    }

                    //Clear out the file input if all files have been handled;
                    if (_filesCurrentlyUploading <= 0 && reason !== 'reCropSuccess') {
                        SIS.Utils.resetFormElement(_$myFileInput);
                        _$eventProxy.trigger('allfilesprocessed');
                    }
                };

                var _validate = function (file, callback) {
                    var handleFile = function () {
                            var response = {};
                            if (sizeOK && typeOK && resolutionOK) {
                                response.result = true;
                            } else {
                                var typeMatch = file.type.match(/\/(\w+)/);
                                response.result = false;
                                response.reasons = [];

                                !sizeOK && response.reasons.push({
                                    'id': 'size',
                                    'message': 'Size must be less than ' + Math.floor(maxSize / 1000000) + ' MB'
                                });
                                !resolutionOK && response.reasons.push({
                                    'id': 'resolution',
                                    'message': 'Image must be at least ' + $scope.myMinResolutionW + 'x' + $scope.myMinResolutionH + 'px'
                                });
                                if (!typeOK && typeMatch && typeMatch.length > 1) {
                                    response.reasons.push({
                                        'id': 'type',
                                        'message': typeMatch[1] + ' not supported'
                                    });
                                } else if (!typeOK) {
                                    response.reasons.push({
                                        'id': 'type',
                                        'message': 'Unknown file type.'
                                    });
                                }
                            }
                            typeof callback === 'function' && callback(response);
                        },
                        extensionToMime = {
                            'jpg':  'image/jpeg',
                            'jpeg': 'image/jpeg',
                            'png':  'image/png',
                            'gif':  'image/gif',
                            'pdf':  'application/pdf'
                        },
                        imageMimes = ['image/jpeg', 'image/png', 'image/gif'],
                        maxSize = _myMediaTypeData.maxSize[file.type] || _myMediaTypeData.maxSize['generic'],
                        sizeOK = file.size <= maxSize,
                        fileType = file.type && file.type.length > 0 ? file.type : file.name && file.name.match(/\.([0-9a-z]+)(?:[\?#]|$)/i) ? extensionToMime[file.name.match(/\.([0-9a-z]+)(?:[\?#]|$)/i)[1]] : undefined,
                        typeOK = _myMediaTypeData.validTypes.indexOf(fileType) >= 0,
                        resolutionOK;

                    if (typeOK && $.inArray(fileType, imageMimes) > -1) {
                        var fr = new FileReader();

                        //When the file reader loads display crop preview
                        fr.onload = function (e) {
                            var img = new Image();
                            img.onload = function () {
                                var h = img.height || 1,
                                    w = img.width || 1,
                                    r = h * w;
                                resolutionOK = r >= MINIMUM_RESOLUTION;
                                handleFile();
                            };
                            //Load the file
                            img.src = e.target.result;
                        };

                        //Load the file into the file reader for previewing
                        fr.readAsDataURL(file);
                    } else {
                        resolutionOK = true;
                        handleFile();
                    }
                };

                $scope.rotateCrop = function (deg) {
                    var transformCSS = {
                        '-webkit-transform': 'rotate(' + deg + 'deg)',
                        'transform':         'rotate(' + deg + 'deg)',
                        '-ms-transform':     'rotate(' + deg + 'deg)'
                    };
                    if (!$scope.jcropAPI) return;
                    $scope.jcropAPI.setOptions({'rotate': deg});
                    $('.crop-preview-wrap').css(transformCSS);
                };

                var _processFile = function (file, coords) {
                    var fd = new FormData(),
                        id = SIS.Utils.generateGUID(10, true) + '_temporary';
                    opts = {
                        contentType: false,
                        processData: false,
                        data:        fd,
                        success:     function (response, status, xhr) {
                            $scope.$apply(function () {
                                _removeTempMedia(response, id);
                                delete $scope.fileRequests[id];
                                _fileFinishedProcessing('success', id);
                                _$myModal && _$myModal.hide();
                            });
                        },
                        error:       function (xhr, status, response) {
                            var reason = response === 'abort' ? 'abort' : 'error';
                            console.log("adding asset failed:", response);
                            _$myModal && _$myModal.hide();
                            reason === 'error' && $('#alert').alert('show', 'error', 'Error adding file: ' + file.name);
                            _removeTempMedia(response, id);
                            _fileFinishedProcessing(reason);
                        },
                        progress:    function (e) {
                            if (!$scope.myTarget) return;
                            var loaded = e.loaded,
                                total = e.total,
                                pct = Math.floor((loaded / total) * 10000) / 100,
                                sizeUploaded = Math.floor((loaded * 10) / (1024 * 1024)) / 10,
                                sizeTotal = Math.floor((total * 10) / (1024 * 1024)) / 10;

                            $timeout(function () {
                                if (_allowMultiple) {
                                    var i = 0,
                                        l = $scope.myTarget.length,
                                        thisMedia;

                                    for (i; i < l; i++) {
                                        thisMedia = $scope.myTarget[i];
                                        if (thisMedia.id === id) {
                                            $scope.myTarget[i].progress = pct;
                                            $scope.myTarget[i].sizeUploaded = sizeUploaded;
                                            $scope.myTarget[i].sizeTotal = sizeTotal;
                                        }
                                    }
                                    ;

                                } else {
                                    $scope.myTarget && ($scope.myTarget.progress = pct);
                                    $scope.myTarget.sizeUploaded = sizeUploaded;
                                    $scope.myTarget.sizeTotal = sizeTotal;
                                }
                            });
                        },
                        uploaded:    function (e) {
                            if (!$scope.myTarget) return;
                            var sizeUploaded = Math.floor((e.loaded * 10) / (1024 * 1024)) / 10,
                                sizeTotal = Math.floor((e.total * 10) / (1024 * 1024)) / 10;

                            $timeout(function () {
                                if (_allowMultiple) {
                                    var i = 0,
                                        l = $scope.myTarget.length,
                                        thisMedia;

                                    for (i; i < l; i++) {
                                        thisMedia = $scope.myTarget[i];
                                        if (thisMedia.id === id) {
                                            $scope.myTarget[i].state = 'processing';
                                            $scope.myTarget[i].sizeUploaded = sizeUploaded;
                                            $scope.myTarget[i].sizeTotal = sizeTotal;
                                        }
                                    }
                                } else {
                                    $scope.myTarget.state = 'processing';
                                    $scope.myTarget.sizeUploaded = sizeUploaded;
                                    $scope.myTarget.sizeTotal = sizeTotal;
                                }
                            });
                        },
                        id:          id
                    };

                    //Trigger an event so external sources can listen
                    _$eventProxy.trigger({
                        'type':   'fileadded',
                        'file':   file,
                        'fileId': id
                    });

                    //Construct as much data as we know at this point.
                    fd.append('asset_type', _myMediaTypeData.mediaType);
                    fd.append('title', file.name);
                    fd.append('assetInput', file);
                    if (_generateCover) {
                        fd.append('derive_cover_image', true);
                        fd.append('crop_ratio', (16 / 9));
                    }

                    if (_cropRatio && !coords) {
                        if (_canUseSingleStepCrop(file)) {
                            _createCropModal(file, opts);
                        } else {
                            $scope.$apply(function () {_addTempMedia(file, id);});
                            var myOpts = $.extend({}, opts);
                            myOpts.success = function (response, status, xhr) {
                                var coverImageUrl = SIS.Filters.IsValidImage.filter()(response, 'original');
                                _createCropModal(coverImageUrl, opts);
                            };
                            $scope.fileRequests[id] = SIS.Model.MediaService.createMedia(myOpts);
                        }
                    } else {
                        coords && fd.append('cropInfo', JSON.stringify(coords));

                        //Add the temporary file data to the model target
                        $scope.$apply(function () {_addTempMedia(file, id);});

                        //Construct form data and push to endpoint for media creation
                        $scope.fileRequests[id] = SIS.Model.MediaService.createMedia(opts);
                    }
                };

                var _createCropModal = function (file, requestOptions) {
                    var imageGenerator = function (imgSrc) {
                        var img = new Image();
                        img.className = 'crop-preview';

                        img.onload = function (e) {

                            var me = this,
                                normalizedSize = SIS.Utils.normalizeSize(me.width, me.height, document.documentElement.clientWidth, document.documentElement.clientHeight, 0.65);

                            $('.crop-preview').remove();

                            _$myModal = $modal($scope, {
                                'template':  $('#sis-crop-modal-template').html(),
                                'ignoreMax': true,
                                'hideCloseButton': true,
                                'buttons':   [
                                    {
                                        'text':       'Crop Image',
                                        'submitText': 'Cropping',
                                        'class':      'sis-button-primary',
                                        'click':      function (e) {
                                            if ($scope.cropCoords) {
                                                requestOptions.data.append('cropInfo', JSON.stringify($scope.cropCoords));
                                            }

                                            if (typeof file === 'string' && $scope.reCropping) {
                                                var mediaObj = SIS.Model.MediaService.convertToMedia($scope.myTarget);
                                                mediaObj.cloneMe(requestOptions);
                                            } else {
                                                $scope.fileRequests[requestOptions.id] = SIS.Model.MediaService.createMedia(requestOptions);
                                            }
                                        }
                                    },
                                    {
                                        'text':  'Cancel',
                                        'class': 'sis-button-link',
                                        'click': function (e) {
                                            $scope.myTarget = $.extend({}, $scope.oldTarget);
                                            _fileFinishedProcessing('cancel');
                                            $(this).trigger('hide');
                                            $scope.$apply();
                                        }
                                    }
                                ],
                                'onCreate':  function (e) {
                                    //resize the preview wrap to the normalized size and then append the image into the modal.
                                    $(this).find(".crop-preview-wrap").width(normalizedSize.width).height(normalizedSize.height).append(img);
                                },
                                'onShow':    function (e) {
                                    var jcropX0, jcropY0, jcropX1, jcropY1, top, right;

                                    top = (me.height - ((1 / _cropRatio) * me.width )) / 2;
                                    top = top > 0 ? top : 0;
                                    right = (me.width - (_cropRatio * me.height )) / 2;
                                    right = right > 0 ? right : 0;

                                    $(me).Jcrop({
                                        'aspectRatio': _cropRatio,
                                        'setSelect':   [right, top, me.width, me.height],
                                        'boxWidth':    normalizedSize.width,
                                        'boxHeight':   normalizedSize.height,
                                        'bgOpacity':   0.45,
                                        'onSelect':    _getCropBox
                                    }, function () {
                                        $scope.jcropAPI = this;
                                    });
                                    $scope.oldTarget = $.extend({}, $scope.myTarget);
                                },
                                'afterHide': function (e) {
                                    $scope.jcropAPI && $scope.jcropAPI.destroy();
                                }
                            });
                            _$myModal.resize().show();
                        };

                        //Load the file 
                        img.src = imgSrc;
                    };

                    if (typeof file === 'object') {
                        var fr = new FileReader();

                        //When the file reader loads display crop preview
                        fr.onload = function (e) {
                            imageGenerator(e.target.result);
                        };

                        //Load the file into the file reader for previewing
                        fr.readAsDataURL(file);

                    } else if (typeof file === 'string') {
                        //we're recropping so just display crop preview from existing url image
                        imageGenerator(file);
                    } else {
                        console.log("this method must be passed either a file object or url string for the 'file' parameter, got: " + typeof file);
                    }
                };
                var _reCrop = function (imgUrl) {
                    $scope.reCropping = true;
                    var fd = new FormData(),
                        id = $scope.myTarget.id,
                        opts = {
                            contentType: false,
                            processData: false,
                            data:        fd,
                            success:     function (response, status, xhr) {
                                $scope.$apply(function () {
                                    response.status = 'processing';
                                    _removeTempMedia(response, id);
                                    _fileFinishedProcessing('success', id);
                                    _$myModal && _$myModal.hide();
                                });
                            },
                            error:       function (xhr, status, response) {
                                console.log("re-cropping asset failed", response);
                                $scope.myTarget = $scope.oldTarget;
                                _$myModal && _$myModal.hide();
                                $('#alert').alert('show', 'error', 'Error re-cropping image');
                            }
                        };
                    $timeout(function () {
                        //_addTempMedia(undefined, id);
                        fd.append('asset_type', 'ProjectCoverImage');
                        _createCropModal(imgUrl, opts);
                    });
                };

                var _autoCrop = function (file, coverImageUrl) {
                    var img = new Image();
                    img.onload = function (e) {
                        var coords = _getCropBox(this.width, this.height, _cropRatio);
                        _processFile(file, coords);
                    }
                    img.src = coverImageUrl;
                };

                //This method accepts either function(jCropCoords) OR function(w,h,r).
                var _getCropBox = function (w, h, r) {
                    if (typeof w === 'object') {
                        $scope.cropCoords = {
                            'x': Math.floor(w.x) + 1,
                            'y': Math.floor(w.y) + 1,
                            'w': Math.floor(Math.floor(w.x2) - Math.floor(w.x) - 2),
                            'h': Math.floor(Math.floor(w.y2) - Math.floor(w.y) - 2)
                        };
                    } else if (typeof h === 'number' && typeof w === 'number' && typeof r === 'number') {
                        var normalizedSizes = SIS.Utils.normalizeSizeFromRatio(w, h, r),
                            cropW = Math.floor(normalizedSizes.width),
                            cropH = Math.floor(normalizedSizes.height),
                            x, y;

                        x = (w - cropW) / 2;
                        x = x > 0 ? Math.floor(x) : 0;

                        y = (h - cropH) / 2;
                        y = y > 0 ? Math.floor(y) : 0;

                        return {
                            'x': x + 1,
                            'y': y + 1,
                            'w': cropW - 2,
                            'h': cropH - 2
                        }
                    }
                };

                var _addTempMedia = function (file, id) {
                    var newTemp = {
                        'id':               id,
                        'assetContentType': 'uploading',
                        'file':             file,
                        'progress':         0,
                        'state':            'uploading'
                    };

                    if (_allowMultiple) {
                        $scope.myTarget = $scope.myTarget || [];
                        $scope.myTarget.unshift(newTemp);
                    } else {
                        $scope.oldTarget = $.extend({}, $scope.myTarget);
                        $scope.myTarget = newTemp;
                    }
                };

                var _removeTempMedia = function (response, id, overwrite) {
                    if (response && response.id) {
                        if (_allowMultiple) {
                            var i = 0,
                                l = $scope.myTarget.length,
                                thisMedia;

                            //Loop through target and remove this file's temporary media data
                            for (i; i < l; i++) {
                                thisMedia = $scope.myTarget[i];
                                if (thisMedia.id === id) {
                                    thisMedia.progress = 100;
                                    if (overwrite) {
                                        $scope.myTarget[i] = response;
                                    } else {
                                        $.extend(thisMedia, response);
                                    }
                                    delete thisMedia.file;
                                    delete thisMedia.progress;
                                    delete thisMedia.sizeUploaded;
                                    delete thisMedia.sizeTotal;
                                    break;
                                }
                            }
                            ;
                        } else {
                            $scope.myTarget = $scope.myTarget || {};
                            if ($scope.myMediaType === 'cover') {
                                delete $scope.myTarget.assetContentType;
                            }
                            if ($scope.myMediaType === 'cover' || $scope.myMediaType === 'logo') {
                                delete $scope.myTarget.assetContentType;
                            }
                            if (overwrite) {
                                $scope.myTarget = response;
                            } else {
                                $.extend($scope.myTarget, response);
                            }
                            delete $scope.myTarget.file;
                            delete $scope.myTarget.progress;
                            delete $scope.myTarget.sizeUploaded;
                            delete $scope.myTarget.sizeTotal;
                        }
                    } else {
                        if (_allowMultiple && $.isArray($scope.myTarget)) {
                            var i = 0,
                                l = $scope.myTarget.length,
                                thisAsset;
                            for (i; i < l; i++) {
                                thisAsset = $scope.myTarget[i];
                                if (id === thisAsset.id) {
                                    $timeout(function () {
                                        $scope.myTarget.splice(i, 1);
                                    });
                                    break;
                                }
                            }
                        } else if ($scope.myTarget.id === id) {
                            $scope.myTarget = $scope.oldTarget;
                        }
                    }
                };

                var _canUseSingleStepCrop = function (file) {
                    var type = file.type,
                        blacklist = ['application/pdf', 'application/x-pdf'];

                    return !($.inArray(type, blacklist) >= 0);
                };

                /********************
                 * INIT
                 *********************/
                _init();
            }
        }
    };
    namespace.directive.$inject = ['$modal', '$timeout'];
})(SIS.Directives.Upload);
