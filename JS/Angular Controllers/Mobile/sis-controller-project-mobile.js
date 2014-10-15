SIS.namespace("SIS.Controllers.Project.Mobile").extend(SIS.Controllers.Project);

(function (namespace) {
    namespace.controller = function ($scope, $routeParams, $location, $compile, $timeout) {
        /********************
         * PARENT CONTROLLER
         *********************/
        var _parent = namespace.parent();
        _parent.controller.apply(this, arguments);

        /********************
         * PRIVATE VARIABLES
         *********************/
        var DEFAULT_TAB = 'tags';
        /********************
         * PUBLIC VARIABLES
         *********************/
        $scope.renderedTabs = {};
        $scope.tabTemplates = {
            'media': 'sis-project-detail-content-media-template',
            'details': 'sis-project-detail-content-details-template',
            'tags': 'sis-project-detail-content-tags-template',
            'collaborators': 'sis-project-detail-content-collaborators-template'
        };
        /********************
         * PRIVATE METHODS
         *********************/
        _init = function () {
            _parent.init(_setupProject);
        };

        _setupProject = function (project) {
            _parent.setupProject(project);

            //Set the padding for the title based on number of project likes
            $scope.shortLikeCount = SIS.Filters.ShortNumber.filter()($scope.thisProject.numLikes).toString();
            $scope.titlePadding = ($scope.shortLikeCount.length * 9) + 42;

            $scope.projectBackgroundUrl = SIS.Filters.IsValidImage.blurredFilter()($scope.thisProject.coverImage, 'th');
            //$scope.thisProject.choppedDescription = $scope.thisProject.description;
            //$timeout(function() {
                //var o = SIS.Utils.binaryTruncate($('.sis-project-detail-description'), $scope.thisProject.description, $scope.descriptionHeight, 11);
                //angular.element($('.sis-project-detail-description-wrap')[0]).scope().contentFits = !o.truncated;
                //$scope.originalDescriptionHeight = o.originalHeight;
                //$scope.thisProject.choppedDescription = o.text;
            //});
            _setupCollaborators($scope.thisProject.collaborators);
            //$scope.assetHeight = 180;
            $scope.activeTab = DEFAULT_TAB;
            $scope.renderedTabs[$scope.activeTab] = $scope.renderedTabs[$scope.activeTab] || $scope.tabTemplates[$scope.activeTab];
            $scope.$root.loading = false;
        };

        _setupCollaborators = function () {
            _parent.setupCollaborators();
        };

        /********************
         * PUBLIC METHODS
         *********************/
        $scope.like = function () {
            _parent.like();
        };

        $scope.changeTabs = function(tabName) {
            var template = $scope.tabTemplates[tabName];
            if (template) {
                $scope.renderedTabs[tabName] = template;
                $scope.activeTab = tabName;
            } else {
                console.warn('tab: ' + tabName + ' does not exist.');
            }
        };
        /********************
         * INIT
         *********************/
        _init();
        $scope.thisProject = {};
        $scope.thisProject.numLikes = 0;
    };
    namespace.controller.$inject = ['$scope', '$routeParams', '$location', '$compile', '$timeout'];
})(SIS.Controllers.Project.Mobile);