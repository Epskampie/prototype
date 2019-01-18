/*
Controller for interface "$interfaceName$" (context: "$contextName$"). Generated code, edit with care.
$if(verbose)$Generated using template: $usedTemplate$
Generated by $ampersandVersionStr$

INTERFACE "$interfaceName$" : $expAdl$ :: $source$ * $target$ $if(exprIsUni)$[UNI]$endif$
Roles: [$roles;separator=", "$]
$endif$*/
/* jshint ignore:start */
angular.module('AmpersandApp').controller('Ifc$interfaceName$Controller', function (\$scope, \$route, \$routeParams, ResourceService, \$location) {
    const resourceType = '$source$';
    const ifcName = '$interfaceName$';

    // If entry resource is session
    if(resourceType == 'SESSION') 
        \$scope.resource = { _id_ : null, _path_ : 'resource/SESSION/1', _isRoot_ : true };

    // Else entry resource is other type
    else \$scope.resource = { _id_ : \$routeParams.resourceId, _path_ : 'resource/' + resourceType + '/' + \$routeParams.resourceId , _isRoot_ : true };
    
    \$scope.resource[ifcName] = $if(exprIsUni)$null$else$[]$endif$;
    \$scope.patchResource = \$scope.resource;
    
    \$scope.resource.get = function(){ ResourceService.getResource(\$scope.resource, ifcName, \$scope.patchResource);};
    \$scope.saveResource = function(resource){
        ResourceService.patchResource(resource, true);
    };
    \$scope.switchResource = function(resourceId){ \$location.url('/$interfaceName$/' + resourceId);};
    
    // Get resource
    \$scope.resource.get();
    
});
/* jshint ignore:end */