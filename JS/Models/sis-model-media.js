/*
 Data model relating to both uploaded and embedded meda on www.shocase.com 
*/

SIS.namespace('SIS.Model.MediaService').extend(SIS.Model);
(function (namespace) {
    var mediaCache = {},
        MEDIA_UPDATE_TIMEOUT = 10000;

    namespace.DERIVED_ASSET_ID = 'derived';

    //TODO: exponential backoff for failed media updates

    namespace.events = {
        'processed': 'media.processed.',
        'poll':      'media.poll.',
        'derived':   'media.derived'
    };

    namespace.mediaTypes = {
        'profile': {
            'validTypes': ["image/png", "image/jpeg"],
            'mediaType':  'ProfileImage',
            'maxSize':    {
                'generic': 25000000
            }
        },
        'cover':   {
            'validTypes': ["image/png", "image/jpeg"],
            'mediaType':  'ProjectCoverImage',
            'maxSize':    {
                'generic': 8000000
            }
        },
        'asset':   {
            'validTypes': ["image/png", "image/gif", "image/jpeg", "application/pdf", "application/x-pdf"],
            'mediaType':  'ProjectAsset',
            'maxSize':    {
                'generic': 25000000
            }
        },
        'hero':    {
            'validTypes': ["image/png", "image/jpeg"],
            'mediaType':  'ProjectAsset',
            'maxSize':    {
                'generic': 25000000
            }
        },
        'logo':    {
            'validTypes': ["image/png", "image/jpeg"],
            'mediaType':  'CompanyLogo',
            'maxSize':    {
                'generic': 25000000
            }
        }
    };

    namespace.vendors = {
        'youtube':    {
            'pattern':             /(?:http\:)*(?:\/\/)*(?:www\.)*(?:youtube\.com\/(?:v\/|watch\?v=|embed\/)|youtu\.be\/)([\w-]+)(?:\S+)*/i,
            'idIndex':             1,
            'embedUrl':            '//www.youtube.com/embed/[$ID]',
            'template':            $('#sis-directive-embed-asset-youtube-template').html(),
            'requiresAPI':         false,
            'aspectRatio':         16 / 9,
            'queryParamBlacklist': ['controls', 'modestbranding', 'rel'],
            'queryParams':         {
                'modestbranding': 1,
                'rel':            0
            }
        },
        'vimeo':      {
            'pattern':     /(?:http\:)*(?:\/\/)*(?:www\.)*(?:player\.)*(?:vimeo\.com\/)(?:video\/|moogaloop.swf\?clip_id=|\/)*(?:channels\/staffpicks\/)*([\w-\/]+)/i,
            'idIndex':     1,
            'embedUrl':    '//player.vimeo.com/video/[$ID]',
            'template':    $('#sis-directive-embed-asset-vimeo-template').html(),
            'requiresAPI': true
        },
        'soundcloud': {
            'pattern':     /(?:api\.soundcloud\.com(?:\/|\%2F)[\w-]+(?:\/|\%2F)|(?:http\:)*(?:\/\/)*(?:www\.)*soundcloud\.com(?:\/|\%2F))([\w-]+\/*[\w-]*)/i,
            'idIndex':     1,
            'embedUrl':    '//w.soundcloud.com/player/?url=http%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F[$ID]',
            'template':    $('#sis-directive-embed-asset-soundcloud-template').html(),
            'requiresAPI': true
        },
        'slideshare': {
            'pattern':             /(?:(?:slideshare.net\/)(?:slideshow\/embed_code\/)|(?:slideshare.net\/))([\w-]+\/*[\w-]*)/i,
            'idIndex':             1,
            'embedUrl':            '//www.slideshare.net/slideshow/embed_code/[$ID]',
            'template':            $('#sis-directive-embed-asset-slideshare-template').html(),
            'queryParams':         {
                'rel': 0
            },
            'queryParamBlacklist': ['rel'],
            'requiresAPI':         true
        }
    };

    namespace.convertToMedia = function (data) {
        if (data.updateMe) {
            return data;
        } else if (data.id) {
            return new Media(data);
        }
    };

    namespace.createMedia = function (options) {
        return namespace.ajax({
            relativeURL: '/media',
            async:       true,
            type:        "POST",
            data:        options.data,
            scope:       options.scope,
            success:     function (response, status, xhr) {
                if (!!response.id && typeof options.success === 'function') {
                    var newMedia = new Media(response);
                    options.success.call(scope, newMedia, status, xhr);
                } else {
                    var scope = options.scope || this;
                    if (typeof options.error === 'function') {
                        options.error.call(scope, xhr, status, response);
                    }
                    console.error('there was an error creating this media. The response did not contain an ID');
                    $('#alert').alert('show', 'error', 'Error creating media: Response came back without an ID');
                }
            },
            progress:    options.progress,
            uploaded:    options.uploaded,
            error:       options.error,
            contentType: options.contentType || false,
            processData: options.processData || false
        });
    };

    //takes asset data and returns a vendor if it is embed, false otherwise
    namespace.getEmbedVendor = function (data) {
        if (data && data.assetContentType && data.assetUrl) {
            var match = data.assetContentType.match(/embed\/(\w+)/);
            if (match) {
                return match[1];
            }
        } else if (data && data.assetUrl) {
            var vendor = false;
            for (var key in namespace.vendors) {
                var pattern = namespace.vendors[key].pattern;
                if (data.assetUrl.match(pattern)) {
                    vendor = key;
                }
            }
            return vendor;
        } else {
            return false;
        }
    };

    namespace.isPDF = function (data) {
        return data && data.assetContentType && (data.assetContentType === 'application/pdf' || data.assetContentType === 'application/x-pdf');
    };

    namespace.getMediaStatus = function (idArray, success, error) {
        var ids = $.isArray(idArray) ? idArray.join(',') : typeof idArray === 'string' ? idArray : '';
        SIS.Model.ajax({
            'method':      'GET',
            'relativeURL': '/media/status?ids=' + ids,
            'success':     success || function (response, status, xhr) {
                console.log('response:', response);
            },
            'error':       error || function (xhr, status, response) {
                console.warn('error getting media status');
            }
        });
    };

    namespace.checkProgress = function (id) {
        var keyArrayFromObject = function (obj) {
                if (typeof obj !== 'object') return;
                var result = [],
                    key;
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        result.push(key);
                    }
                }
                return SIS.Utils.removeDuplicatesFromArray(result);
            },
            success = function (response) {
                var i = 0,
                    l = $.isArray(response) ? response.length : 0,
                    thisStatus, rePollIds;
                for (i; i < l; i++) {
                    thisStatus = response[i];
                    if (thisStatus.state !== 'processing') {
                        delete namespace.processingAssets[thisStatus.id];
                        thisStatus.state = 'complete';
                        var eventName = namespace.events.processed + thisStatus.id;
                        namespace.$trigger(eventName, thisStatus);
                    }
                    if (thisStatus.derivedId && !namespace.derivedIds[thisStatus.derivedId]) {
                        namespace.derivedIds[thisStatus.derivedId] = true;
                        namespace.$trigger(namespace.events.derived, thisStatus.derivedId);
                    }
                }
                rePollIds = keyArrayFromObject(namespace.processingAssets);
                namespace.pollingForProcessing = false;
                if (rePollIds.length > 0) {
                    namespace.assetPollTimeout = window.setTimeout(namespace.checkProgress, MEDIA_UPDATE_TIMEOUT);
                }
            },
            ids, thisId;

        namespace.processingAssets = namespace.processingAssets || {};
        namespace.derivedIds = namespace.derivedIds || {};
        if (id) namespace.processingAssets[id] = id;
        ids = keyArrayFromObject(namespace.processingAssets);

        if (namespace.pollingForProcessing) return;
        namespace.pollingForProcessing = true;
        for (thisId in namespace.processingAssets) {
            if (namespace.processingAssets.hasOwnProperty(thisId)) {
                ids.push(thisId);
            }
        }
        namespace.getMediaStatus(ids, success);
    };

    var Media = function (object) {
        var data = object;
        /*********
         *
         *     id:                       The media ID of the asset
         *     createDateTime:           The time that the media was created in UTC
         *     creator:                  A User object representing the person who uploaded the asset
         *     title:                    The title of the asset
         *     description:              (OPTIONAL) Description text for the asset (max 2000 chars)
         *     lastModificationDateTime: Time the media was last updated in UTC
         *     lastModifier:             A User object representing the person who last modified the asset
         *     coverImages:              An object containing all the different images associated with the asset:
         *                               thumbnail, original, small, medium, large
         *                               Each image object contains the image URL, image type and storage ID
         *********/

            //Make the data accessible in the base object
        $.extend(this, data);

        this.getData = function (property) {
            if (data && property === undefined) {
                return data;
            } else if (data && data.property) {
                return data.property
            } else {
                return false;
            }
        };

        this.updateMe = function (options) {
            namespace.ajax({
                relativeURL: '/media/' + data.id,
                async:       true,
                type:        "PUT",
                data:        options.data,
                scope:       options.scope,
                success:     function (response, status, xhr) {
                    if (!!response.id) {
                        if (typeof options.success === 'function') {
                            var newMedia = new Media(response)
                            options.success.call(scope, newMedia, status, xhr);
                        }
                    } else if (this.error) {
                        if (typeof options.error === 'function') {
                            options.error.call(scope, xhr, status, response);
                        }
                    }
                    var scope = options.scope || this;
                },
                error:       options.error,
                contentType: options.contentType || false,
                processData: options.processData || false
            });
        };

        //data must be a FormData object, not regular JSON
        this.cloneMe = function (options) {
            options.data.append('source_media_id', data.id);
            namespace.ajax({
                relativeURL: '/media',
                async:       true,
                type:        'POST',
                data:        options.data,
                scope:       options.scope,
                success:     function (response, status, xhr) {
                    if (!!response.id) {
                        if (typeof options.success === 'function') {
                            var newMedia = new Media(response)
                            options.success.call(scope, newMedia, status, xhr);
                        }
                    } else if (this.error) {
                        if (typeof options.error === 'function') {
                            options.error.call(scope, xhr, status, response);
                        }
                    }
                    var scope = options.scope || this;
                },
                error:       options.error,
                contentType: options.contentType || false,
                processData: options.processData || false
            });
        };

        this.flagMe = function () {

        };

        this.deleteMe = function (callback, scope) {
            console.log("delete this image:", this.getData());
            if (typeof callback === 'function') {
                scope = scope || this;
                callback.call(scope);
            }
        };
    };
    namespace.getPlaceholderImage = function (fileName) {
        return _placeholderImages[fileName.toLowerCase()] || 'img/' + fileName;
    };

    var _placeholderImages = {
        'placeholder-project.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAJAQMAAAAB5D5xAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAADUExURQAAAKd6PdoAAAABdFJOUwBA5thmAAAAC0lEQVQI12NgwAkAABsAAVJE5KkAAAAASUVORK5CYII=',
        'placeholder-user.png':    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAADUExURQAAAKd6PdoAAAABdFJOUwBA5thmAAAACklEQVQI12NgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==',
        'placeholder-company.png':    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAIAAAAiOjnJAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDIxIDc5LjE1NTc3MiwgMjAxNC8wMS8xMy0xOTo0NDowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QzE0RTY3RkMzQjZCMTFFNEI5QTdCQUI4RTRCMTBBNDAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QzE0RTY3RkQzQjZCMTFFNEI5QTdCQUI4RTRCMTBBNDAiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpDMTRFNjdGQTNCNkIxMUU0QjlBN0JBQjhFNEIxMEE0MCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpDMTRFNjdGQjNCNkIxMUU0QjlBN0JBQjhFNEIxMEE0MCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgB8oK8AAAZbSURBVHja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',
        'no-profile-image.jpg':    'data:image/jpg;base64,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'
    };

})(SIS.Model.MediaService);
