//Create your namespace
SIS.namespace("SIS.Directives.TextInput");

(function(namespace) {
    namespace.directive = function($compile, $timeout) {
        var _templates = {
            'textarea': $($('#sis-directive-text-input-textarea-template').html())
        };
        var _selectors = {
            'textarea': '.sis-input-text-area'
        };
        /********************
         * SETUP
         *********************/
        return {
            'restrict': 'A',
            'scope': true,
            'terminal': true,
            'priority': 1000,
            'compile': function compile($element, $attrs){
                var $contents = $element.contents().detach(),
                    $template = $attrs.sisTextInput ? $($('#sis-directive-text-input-textarea-template').html()) : $($('#sis-directive-text-input-template').html()),
                    $inner = $template.find('[ng-form="inner"]'),
                    $input = $attrs.sisTextInput ? $template.find('.sis-input-text-area') : $template.find('.sis-input'),
                    attrRegex = /^sisTextInput|^\$+/,
                    blacklist = ['id', 'class'],//these have to be camelCase, not "-" version
                    name = $attrs.sisTextInputName;
                $inner.append($contents);
                $element.removeAttr('sis-text-input');
                $element.addClass('sis-text-input');
                $attrs.sisTextInputIcon && $inner.addClass('sis-icon-input-wrap sis-icon-' + $attrs.sisTextInputIcon);
                for (var key in $attrs) {
                    if ($attrs.hasOwnProperty(key) && !key.match(attrRegex) && $.inArray(key, blacklist) < 0) {
                        $input.attr($attrs.$attr[key], $attrs[key]);
                        $element.removeAttr($attrs.$attr[key]);
                    }
                }
                name && $template.attr('ng-form', name + 'Wrap');
                name && $input.attr('name', name);
                $element.append($template);
                return {
                    pre: function preLink($scope, iElement, iAttrs, controller) {

                    },
                    post: function postLink($scope, iElement, iAttrs, controller) {

                        //////////////
                        //PUBLIC VARS
                        //////////////
                        $scope.messages = $.extend(SIS.Directives.Validators.messages, iAttrs.sisTextInputErrors ? $scope[iAttrs.sisTextInputErrors] : {});
                        $scope.charLimit = parseInt(iAttrs.sisTextInputCharacterLimit);
                        $scope.name = iAttrs.sisTextInputName;
                        $scope.model = $scope.inner;
                        $scope.label = iAttrs.sisTextInputLabel;
                        $scope.hasLabel = $scope.label && $scope.label.length > 0;
                        $scope.modalLabels = iAttrs.sisTextInputModalLabel !== undefined;
                        $scope.title = iAttrs.sisTextInputTitle;
                        $scope.showErrors = iAttrs.hideErrors === undefined || iAttrs.hideErrors === false;

                        //////////////
                        //PUBLIC METHODS
                        //////////////
                        $scope.showError = function(name) {
                            var blacklist = ['required', 'ajax', 'ajaxCheck'];

                            return $.inArray(name, blacklist) === -1 && $scope.inner.$error[name];
                        };

                        ///////////////////
                        //COMPILE DIRECTIVE
                        ///////////////////
                        $compile(iElement.contents())($scope);
                    }
                };
            }
        }
    };
    namespace.directive.$inject = ['$compile', '$timeout'];
})(SIS.Directives.TextInput);
