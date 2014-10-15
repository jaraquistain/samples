//Create your namespace
SIS.namespace('SIS.Controllers.OutboundMarketing');

//Define your namespace
(function (namespace) {
    namespace.controller = function ($scope, $location) {

        var _cantInit = function (xhr, status, error) {

        };

        var _init = function () {
            var projectIds = $location.search().projects ? $location.search().projects.split(',') : [],
                senderId = $location.search().sender;
            SIS.Model.ProjectService.batchRequestProjects({
                'scope': $scope,
                'projects': projectIds,
                'success':  function (response) {
                    if ($.isArray(response) && !!response.length) {
                        response.forEach(function(project) {
                            project.collaborators = SIS.Model.CollaboratorService.sortCollaborators(project.collaborators, senderId, null, true);
                        });
                        $scope.projects = response;
                        $scope.senderName = $scope.projects[0].collaborators[0].fullName;
                        $scope.featuredProject = $scope.projects.shift();
                        $scope.$root.loading = false;
                    } else {
                        //TODO: Might want to change this to a $alert call if we want to show a message while redirecting
                        console.log('couldn\'t load the stuff');
                        $location.path('/projects');
                    }
                },
                'error':    function (xhr, status, error) {
                    console.log('error fetching projects');
                }
            });
        };

        _init();
    };
}(SIS.Controllers.OutboundMarketing));