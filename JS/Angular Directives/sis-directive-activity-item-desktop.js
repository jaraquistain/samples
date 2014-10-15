//Create your namespace
SIS.namespace("SIS.Directives.ActivityItem.Desktop");

(function (namespace) {
    namespace.directive = function ($compile) {
        /********************
         * SETUP
         *********************/
        return {
            'restrict': 'A',
            'scope':    {
                'data': '=sisActivityItem',
                'map':  '=sisActivityItemMap'
            },
            'compile':  function compile($element, $attrs) {
                return {
                    pre:  function preLink($scope, iElement, iAttrs, controller) {
                        //////////////
                        //PUBLIC VARS
                        //////////////
                        $scope.data = $scope.data || {};
                        $scope.map = $scope.map || {};

                        if ($scope.data.activityType === 'user-add_asset-project') {
                            $scope.numAssets = 0;
                            $scope.data.actor.entityTOList.forEach(function(actor){
                                $scope.numAssets = actor.meta && $.isArray(actor.meta.assets) ? $scope.numAssets + actor.meta.assets.length : $scope.numAssets;
                            });
                        }

                        //////////////
                        //PRIVATE VARS
                        //////////////
                        var _templateKey = typeof $attrs.sisActivityItemSelf === 'string' ? 'notifications' : $scope.data.activityType;
                        var _$templateObj = $('#sis-activity-item-' + _templateKey + '-template'),
                            _template = _$templateObj.length ? _$templateObj.html() : $('#sis-activity-item-unhandled-type-template').html();

                        //////////////
                        //GENERATE TEMPLATE
                        //////////////
                        iElement.addClass('sis-activity-item').attr('id', $scope.data.id);
                        iElement.append(_template);
                    },
                    post: function postLink($scope, iElement, iAttrs, controller) {
                        ///////////////////
                        //COMPILE TEMPLATE
                        ///////////////////
                        $compile(iElement.contents())($scope);
                    }
                };
            }
        }
    };
    namespace.directive.$inject = ['$compile'];
})(SIS.Directives.ActivityItem.Desktop);
