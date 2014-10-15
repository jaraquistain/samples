//Create your namespace
SIS.namespace("SIS.Directives.AnimatedEllipsis");

(function(namespace) {
    namespace.directive = function($timeout) {
        /********************
         * SETUP
         *********************/
        return {
            restrict: 'A',
            link: function($scope, $element, $attrs) {
                _init = function() {
                    $element.append('<span class="blinking-dot-1">.</span><span class="blinking-dot-2">.</span><span class="blinking-dot-3">.</span><span class="blinking-dot-4">.</span>');
                };
                _init();
            }
        }
    }
    namespace.directive.$inject = ['$timeout'];
})(SIS.Directives.AnimatedEllipsis);