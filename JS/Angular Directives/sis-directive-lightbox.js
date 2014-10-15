//Create your namespace
SIS.namespace("SIS.Directives.Lightbox");
//Define your namespace
(function (namespace) {
    namespace.directive = function ($routeParams, $location, $compile, $timeout, $swipe) {
        /********************
         * SETUP
         *********************/

        return {
            'scope': {
                'data'        : '=lightbox',
                'hideControls': '=lightboxHideControls'
            },
            'link' : function ($scope, $element) {
                /********************
                 * VARS
                 *********************/
                var  _$left, _$right, _$center, _$slider, _$element,
                    _scrollTop,
                    _scrollLeft,
                    _visibleSlides = [],
                    _regex = new RegExp(/embed/i);

                $scope.slides = [];



                /********************
                 * PUBLIC METHODS
                 *********************/
                var _scrollFunc = function(e){
                    $(window).scrollTop(_scrollTop);
                    $(window).scrollLeft(_scrollLeft);
                };

                var _setElements = function(){
                    if (!_$left || (_$left && !_$left.length)) _$left = $('.sis-lightbox-slide-0');
                    if (!_$right || (_$right && !_$right.length)) _$right = $('.sis-lightbox-slide-2');
                    if (!_$center || (_$center && !_$center.length)) _$center = $('.sis-lightbox-slide-1');
                    if (!_$slider || (_$slider && !_$slider.length)) _$slider = $('.sis-lightbox-wrap');
                    if (!_$element || (_$element && !_$element.length)) _$element = $(".sis-lightbox");
                };


                $scope.next = function () {
                    $location.search('lightbox', $scope.data[_getIndex($scope.currentSlideIndex+1)].id);
                    $location.replace();
                    //_swipe(-$element.outerWidth());
                };

                $scope.prev = function () {
                    $location.search('lightbox', $scope.data[_getIndex($scope.currentSlideIndex-1)].id);
                    $location.replace();
                };

                $scope.hide = function () {
                    _setElements();
                    _resetIframe();
                    $location.search('lightbox', null);
                    $location.replace();

                    $(window).off('keyup', _handleKeyPress);
                    $scope.keysBound = false;
                    if (!SIS.SIS_BROWSER_INFO.msie) {
                        $(window).off("scroll",_scrollFunc);
                    } else {
                        $('body').css('overflow', 'visible');
                    }

                    $scope.showLightbox = false;


                    _$element.length && SIS.Utils.cssAnimationCallback(_$element,function(e){
                        _$element.hide();
                    },true);

                };

                $scope.show = function () {
                    _setElements();
                    if (!$scope.keysBound) {
                        $(window).off('keyup', _handleKeyPress).on('keyup', _handleKeyPress);
                        $scope.keysBound = true;
                    }

                    if (!SIS.SIS_BROWSER_INFO.msie) {
                        _scrollTop = $(window).scrollTop();
                        _scrollLeft = $(window).scrollLeft();
                        $(window).on("scroll",_scrollFunc);
                    } else {
                        $('body').css('overflow', 'hidden');
                    }
                    _$element.show();

                    $timeout(function(){
                        $scope.showLightbox = true;
                        _resizeSlides();
                    });

                };

                /********************
                 * PRIVATE METHODS
                 *********************/
                var _init = function () {
                    $scope.currentSlideIndex = $routeParams.lightbox ? _getIndexFromId($routeParams.lightbox) : undefined;

                    //Check for malformed url parameter and revert to first slide
                    if ($routeParams.lightbox && $scope.currentSlideIndex === undefined) {
                        $location.search('lightbox', $scope.data[0].id);
                        $location.replace();
                        return;
                    }


                    if ($scope.currentSlideIndex !== undefined) {

                        if (!$(".sis-lightbox").length) {
                            $('body').append($compile($('#sis-directive-lightbox-template').html())($scope));
                        }

                        _reCenterOnIndex($scope.currentSlideIndex);

                        $scope.show();
                    } else {
                        $scope.hide();
                    }

                };

                var _getIndexFromId = function (id) {
                    var data = $scope.data,
                        index,
                        i = 0,
                        l = data && data.length > 0 ? data.length : 0;

                    for (i; i < l; i++) {
                        if (id === data[i].id) {
                            index = i;
                            break;
                        }
                    }
                    return index;
                };

                var _getPrevSlide = function (index) {
                    return index > 0 ? $scope.data[index - 1] : $scope.data[$scope.data.length - 1];
                };

                var _getNextSlide = function (index) {
                    return index === $scope.data.length - 1 ? $scope.data[0] : $scope.data[index + 1];
                };

                function _getIndex(idx){
                    var max = $scope.data.length;
                    if (idx >= max){
                        idx = 0;
                    }else if (idx < 0){
                        idx = max - 1;
                    }
                    return idx;
                }

                var _reCenterOnIndex = function (index) {
                    $scope.slides = [_getPrevSlide($scope.currentSlideIndex), $scope.data[$scope.currentSlideIndex], _getNextSlide($scope.currentSlideIndex)];

                    if (!$scope.center) {
                        var $el = $(".sis-lightbox-slide-" + 1);
                        var html = $("#sis-directive-lightbox-slide-template").html().replace(/_item/g, "center");
                        var $div = $("<div>", {"class": "lightbox-slide-asset-container"}).html(html).appendTo($el);
                        $scope.slides[1].isIframe = _regex.test($scope.slides[1].assetContentType);
                        $scope.center = $scope.slides[1];

                        $compile($div.contents())($scope);

                    } else {
                        $scope.center = $scope.slides[1];
                    }
                    _visibleSlides[1] = $scope.slides[1];

                    $timeout(function(){
                        _resizeSlides(true);
                    });

                };


                var _handleKeyPress = function (e) {
                    if (!$scope.showLightbox || !e.keyCode) return;
                    var esc = 27, left = 37, right = 39;
                    switch (e.keyCode) {
                        case esc:
                            $scope.hide();
                            break;
                        case left:
                            $scope.prev();
                            break;
                        case right:
                            $scope.next();
                            break;
                    }
                    $scope.$apply();
                };

                var _getLoadedSlides = function(){
                    var a = [];
                    for (var i=0; i< $scope.data.length; i++){
                        var key = "lightboxSlide_" + $scope.data[i].id;
                        $scope[key] && a.push($scope[key]);
                    }
                    return a;
                }

                var _resizing = false;
                var _resizeSlides = function (force){
                    if (_resizing || !$scope.showLightbox) return;

                    _resizing = true;
                    _setElements();
                    var vis = force ? "visible" : "hidden";
                    _$left.css("visibility",vis);
                    _$right.css("visibility",vis);

                    var winW = $(window).width() - 2,
                        winH = $(window).height() - 120  > 0 ? $(window).height() - 120 : 0,
                        slides = $scope.slides,
                        i = 0,
                        l = slides.length || 0,
                        thisSlide, imgW, imgH, hasSize, normalizedSizes, vendor;

                    for (i; i < l; i++) {
                        thisSlide = slides[i];
                        vendor = SIS.Model.MediaService.getEmbedVendor(thisSlide);
                        hasSize = thisSlide.coverImages && thisSlide.coverImages.o && thisSlide.coverImages.o.height && thisSlide.coverImages.o.width;
                        if (vendor === 'slideshare') {
                            imgW = winW;
                            imgH = imgW / (4 / 3);
                            normalizedSizes = SIS.Utils.normalizeSize(imgW, imgH, winW, winH);
                        } else if (vendor === 'soundcloud') {
                            normalizedSizes = {
                                'height': 166,
                                'width': winW -12
                            };
                        } else if (!vendor && hasSize) {
                            imgH = thisSlide.coverImages.o.height;
                            imgW = thisSlide.coverImages.o.width;
                            normalizedSizes = SIS.Utils.normalizeSize(imgW, imgH, winW, winH);
                        } else {
                            imgW = winW;
                            imgH = imgW / (16 / 9);
                            normalizedSizes = SIS.Utils.normalizeSize(imgW, imgH, winW, winH);
                        }
                        thisSlide.normalizedSizes = normalizedSizes;
                        thisSlide.resized = true;
                    }

                    $timeout(function(){
                        _$left.css("visibility","visible");
                        _$right.css("visibility","visible");
                        _resizing = false;
                    });

                }


                var _resetIframe = function(){
                    _setElements();
                    if (_visibleSlides[1] && _regex.test(_visibleSlides[1].assetContentType)) {

                        (function (o) {
                            var $iframe = _$center.find("iframe");
                            var src = $iframe.attr("src");
                            $iframe.attr("src", src);

                        })(_visibleSlides[1]);
                    }
                }



                /********************
                 * INIT
                 *********************/

                $(window).off('resize', _resizeSlides).on('resize', _resizeSlides);

                $scope.$on("$destroy", function() {
                    $(window).off("resize", _resizeSlides);
                    $(".sis-lightbox").remove();
                    if (!SIS.SIS_BROWSER_INFO.msie) {
                        $(window).off("scroll",_scrollFunc);
                    } else {
                        $('body').css('overflow', 'visible');
                    }
                });


                $scope.$watch(function () {
                    var dataString = $scope.data ? $scope.data.toString() : undefined;
                    return $scope.data || $routeParams.lightbox ? dataString + '-' + $routeParams.lightbox : undefined;
                }, function (oldData, newData) {
                    if (!$scope.data) return;
                    _init();
                });
            }
        }
    };
    namespace.directive.$inject = ['$routeParams', '$location', '$compile', '$timeout','$swipe'];
})(SIS.Directives.Lightbox);
