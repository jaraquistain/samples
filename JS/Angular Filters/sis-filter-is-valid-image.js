/*
    A filter turning a www.shocase.com media object into a URL pointing to the desired image size
*/

//Create your namespace
SIS.namespace("SIS.Filters.IsValidImage");
//Define your namespace
(function (namespace) {
    var _myCdn = SIS.ENV_JSON.CDN;

    var _validImageFilter = function (key, sizeMap, sizes, input, size, placeholder) {
        var _cdn = input && input.domain ? input.domain : _myCdn;
        key = key === 'blurredCoverImages' ? key : 'coverImages';
        var ext = 'jpg';
        if (input && input[key] && _cdn) {
            size = sizeMap[size] || 'o';

            if (input[key][size]) {
                // Desired size was found
                ext = size === 'o' && input.assetExtension ? input.assetExtension : ext;
                return _cdn + input.id + '-' + size + '.' + ext;
            } else {
                // Get the index of the specified size and work
                // back up the list from largest to smallest
                var fallbackSize = sizes.indexOf(size);
                for (var i = fallbackSize; i >= 0; i--) {
                    if (input[key][sizes[i]]) {
                        ext = sizes[i] === 'o' && input.assetExtension ? input.assetExtension : ext;
                        return _cdn + input.id + '-' + sizes[i] + '.' + ext;
                    }
                }
                // If no sizes larger than the specified size exist
                // work back down the list in opposite direction
                for (var u = fallbackSize; u < sizes.length; u++) {
                    if (input[key][sizes[u]]) {
                        return _cdn + input.id + '-' + sizes[u] + '.' + ext;
                    }
                }
                // Else return the placeholder or a 1px by 1px image
                return placeholder || SIS.Model.MediaService.getPlaceholderImage("placeholder-user.png");
            }
        } else {
            return placeholder || SIS.Model.MediaService.getPlaceholderImage("placeholder-user.png");
        }
    };

    namespace.filter = function () {
        // Creates a set index based on set size
        var _sizeMap = {
                'original': 'o',
                'o': 'o',
                'cropped': 'c',
                'c': 'c',
                'large': 'l',
                'l': 'l',
                'medium': 'm',
                'm': 'm',
                'small': 's',
                's': 's',
                'tiny': 'ti',
                'ti': 'ti',
                'thumbnail': 'th',
                'th': 'th'
            },
            _sizes = ['o', 'c', 'l', 'm', 's', 'ti', 'th'];

        return function (input, size, placeholder) {
            return _validImageFilter('coverImages', _sizeMap, _sizes, input, size, placeholder);
        };
    };

    namespace.blurredFilter = function () {
        // Creates a set index based on set size
        var _sizeMap = {
                'original': 'o-b',
                'o': 'o-b',
                'cropped': 'c-b',
                'c': 'c-b',
                'large': 'l-b',
                'l': 'l-b',
                'medium': 'm-b',
                'm': 'm-b',
                'small': 's-b',
                's': 's-b',
                'tiny': 'ti-b',
                'ti': 'ti-b',
                'thumbnail': 'th-b',
                'th': 'th-b'
            },
            _sizes = ['o-b', 'c-b', 'l-b', 'm-b', 's-b', 'ti-b', 'th-b'];

        return function (input, size, placeholder) {
            return _validImageFilter('blurredCoverImages', _sizeMap, _sizes, input, size, placeholder);
        }
    };

})(SIS.Filters.IsValidImage);
