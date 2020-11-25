"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

// when using minified angular modules, use module('myApp', []).controller('MyController', ['myService', function (myService) { ...
angular.module('AmpersandApp', ['ngResource', 'ngRoute', 'ngSanitize', 'restangular', 'ui.bootstrap', 'uiSwitch', 'cgBusy', 'siTable', 'ngStorage', 'angularFileUpload', 'ui.bootstrap.datetimepicker', 'hc.marked']).config(["$routeProvider", "$locationProvider", function ($routeProvider, $locationProvider) {
  $routeProvider // default start page
  .when('/', {
    resolveRedirectTo: ['NavigationBarService', function (NavigationBarService) {
      return NavigationBarService.getRouteForHomePage();
    }]
  }).when('/prototype/welcome', {
    controller: '',
    templateUrl: 'app/src/shared/welcome.html',
    interfaceLabel: 'Welcome'
  }) // installer page
  .when('/admin/installer', {
    controller: 'InstallerController',
    templateUrl: 'app/src/admin/installer.html',
    interfaceLabel: 'Installer'
  }).when('/redirect-after-login', {
    resolveRedirectTo: ['LoginService', function (LoginService) {
      return LoginService.getPageBeforeLogin();
    }]
  }).when('/404', {
    templateUrl: 'app/src/shared/404.html',
    interfaceLabel: '404'
  }).otherwise({
    redirectTo: '/404'
  });
  $locationProvider.hashPrefix(''); // see: https://stackoverflow.com/questions/41211875/angularjs-1-6-0-latest-now-routes-not-working
}]).config(["RestangularProvider", function (RestangularProvider) {
  RestangularProvider.setBaseUrl('api/v1'); // Generate: path to API folder

  RestangularProvider.setDefaultHeaders({
    "Content-Type": "application/json"
  });
  RestangularProvider.setPlainByDefault(true);
}]).run(["Restangular", "$rootScope", "$location", "$route", "NotificationService", "RoleService", "NavigationBarService", "LoginService", function (Restangular, $rootScope, $location, $route, NotificationService, RoleService, NavigationBarService, LoginService) {
  Restangular.addFullRequestInterceptor(function (element, operation, what, url, headers, params) {
    //params.navIfc = true;
    //params.metaData = true;
    return params;
  });
  Restangular.addResponseInterceptor(function (data, operation, what, url, response, deferred) {
    if (operation != 'get' && operation != 'getList' && data.sessionRefreshAdvice) NavigationBarService.refreshNavBar();
    if ((data || {}).navTo != null) $location.url(data.navTo);
    return data;
  });
  Restangular.setErrorInterceptor(function (response, deferred, responseHandler) {
    var message;
    var details;

    if (_typeof(response.data) === 'object' && response.data !== null) {
      if (response.data.error == 404) {
        // 404: Not found
        NotificationService.addInfo(response.data.msg || 'Resource not found');
      } else if (response.status == 401) {
        // 401: Unauthorized
        if (response.data.data.loginPage) {
          LoginService.setLoginPage(response.data.data.loginPage);
        }

        LoginService.setSessionIsLoggedIn(false);
        NavigationBarService.refreshNavBar();
        LoginService.gotoLoginPage();
        NotificationService.addInfo(response.data.msg || 'Login required to access this page');
      } else {
        message = response.data.msg || response.statusText; // if empty response message, take statusText

        NotificationService.addError(message, response.status, true, response.data.html);
      }

      if (response.data.notifications !== undefined) NotificationService.updateNotifications(response.data.notifications);

      if (response.data.navTo != null) {
        $location.url(response.data.navTo);
      } // network error

    } else if (response.status === -1) {
      NotificationService.addError('Connection error. Please check your internet connection and try again', null, false);
    } else {
      message = response.status + ' ' + response.statusText;
      details = response.data; // html content is excepted

      NotificationService.addError(message, response.status, true, details);
    }

    return true; // proceed with success or error hooks of promise
  });

  $rootScope.getCurrentDateTime = function () {
    return new Date();
  }; // Add feature to $location.url() function to be able to prevent reloading page (set reload param to false)


  var original = $location.url;

  $location.url = function (url, reload) {
    if (reload === false) {
      var lastRoute = $route.current;
      var un = $rootScope.$on('$locationChangeSuccess', function () {
        $route.current = lastRoute;
        un();
      });
    }

    return original.apply($location, [url]);
  };
}]).value('cgBusyDefaults', {
  message: 'Loading...',
  backdrop: true,
  //templateUrl: 'my_custom_template.html',
  //delay: 500, // in ms
  minDuration: 500 // in ms
  // wrapperClass: 'my-class my-class2'

}); // Controller for extension app in navigation bar

angular.module('AmpersandApp').controller('ExecEngineController', ["$scope", "Restangular", "NotificationService", function ($scope, Restangular, NotificationService) {
  $scope.run = function () {
    Restangular.one('admin/execengine/run').get().then(function (data) {
      // on success
      NotificationService.updateNotifications(data);
    });
  };
}]);
angular.module('AmpersandApp').controller('InstallerController', ["$scope", "Restangular", "NotificationService", "RoleService", "NavigationBarService", function ($scope, Restangular, NotificationService, RoleService, NavigationBarService) {
  $scope.installing = false;
  $scope.installed = false;

  $scope.install = function (defPop, ignoreInvariantRules) {
    $scope.installing = true;
    $scope.installed = false;
    NotificationService.clearNotifications();
    Restangular.one('admin/installer').get({
      defaultPop: defPop,
      ignoreInvariantRules: ignoreInvariantRules
    }).then(function (data) {
      NotificationService.updateNotifications(data);
      NavigationBarService.refreshNavBar(); // deactive all roles

      RoleService.deactivateAllRoles();
      $scope.installing = false;
      $scope.installed = true;
    }, function () {
      $scope.installing = false;
      $scope.installed = false;
    });
  };
}]);
angular.module('uiSwitch', []).directive('switch', function () {
  return {
    restrict: 'AE',
    replace: true,
    transclude: true,
    template: function template(element, attrs) {
      var html = '';
      html += '<a href=""';
      html += attrs.ngModel && !attrs.ngClick ? ' ng-click="' + attrs.ngModel + '=!' + attrs.ngModel + '"' : '';
      html += '>';
      html += '<span';
      html += ' class="switch' + (attrs["class"] ? ' ' + attrs["class"] : '') + '"';
      html += ' ng-class="{ checked:' + attrs.ngModel + ' }"';
      html += '>';
      html += '<small></small>';
      html += '</span>';
      html += '<span ng-transclude></span>';
      html += '</a>';
      return html;
    }
  };
});
angular.module('AmpersandApp').config(["$routeProvider", function ($routeProvider) {
  $routeProvider.when('/ext/importer', {
    controller: 'PopulationImportController',
    templateUrl: 'app/src/importer/importer.html',
    interfaceLabel: 'Population importer'
  });
}]).service('ImportService', ["FileUploader", "NotificationService", "NavigationBarService", function (FileUploader, NotificationService, NavigationBarService) {
  var uploader = new FileUploader({
    url: 'api/v1/admin/import'
  });

  uploader.onSuccessItem = function (fileItem, response, status, headers) {
    NotificationService.updateNotifications(response.notifications);
    if (response.sessionRefreshAdvice) NavigationBarService.refreshNavBar();
  };

  uploader.onErrorItem = function (item, response, status, headers) {
    var message;
    var details;

    if (_typeof(response) === 'object') {
      if (response.notifications !== undefined) {
        NotificationService.updateNotifications(response.notifications);
      }

      message = response.msg || 'Error while importing';
      NotificationService.addError(message, status, true, response.html);
    } else {
      message = status + ' Error while importing';
      details = response; // html content is excepted

      NotificationService.addError(message, status, true, details);
    }
  };

  return {
    uploader: uploader
  };
}]).controller('PopulationImportController', ["$scope", "ImportService", function ($scope, ImportService) {
  $scope.uploader = ImportService.uploader;
}]).requires.push('angularFileUpload'); // add angularFileUpload to dependency list

angular.module('AmpersandApp').controller('AtomicController', ["$scope", "ResourceService", function ($scope, ResourceService) {
  /*
   * Object to temporary store value/resourceId to add to list
   * Value/resourceId is stored as property of 'selected' obj. This is needed to pass it around by reference
   */
  $scope.selected = {};
  $scope.saveItem = ResourceService.saveItem; // function(resource, ifc, patchResource)

  $scope.addItem = ResourceService.addItem; // function(resource, ifc, selected, patchResource)

  $scope.removeItem = ResourceService.removeItem; // function(resource, ifc, index, patchResource)

  $scope.remove = ResourceService.removeResource; // function(parent, ifc, resource, patchResource)

  $scope["delete"] = ResourceService.deleteResource; // function(parent, ifc, resource)
}]);
angular.module('AmpersandApp').controller('AtomicDateController', ["$scope", "ResourceService", function ($scope, ResourceService) {
  $scope.isOpen = false; // Function is here because ng-model needs to be a Date object.
  // watch listener is initialized by the template

  $scope.watchDateObject = function (resource, ifc) {
    $scope.$watch('resource', function () {
      if (!(resource[ifc] instanceof Date)) {
        // Only convert to Date object when not NULL, otherwise the 1970-01-01 is created
        if (resource[ifc] !== null) resource[ifc] = new Date(resource[ifc]);
      }
    }, true);
  };

  $scope.openDatepicker = function ($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.isOpen = true;
  }; // Adds leading 0 if necesarry. Returns 2 digits.


  function pad(number) {
    var r = String(number);

    if (r.length === 1) {
      r = '0' + r;
    }

    return r;
  }

  function modifyToJSON(obj) {
    if (obj !== null) {
      obj.toJSON = function () {
        return this.getUTCFullYear() + '-' + pad(this.getMonth() + 1) + // The getMonth() method returns the month in the specified date according to local time, as a zero-based value (where zero indicates the first month of the year).
        '-' + pad(this.getDate());
      };
    }
  }

  $scope.selected = {
    value: ''
  }; // an empty object for temporary storing the input values

  $scope.saveDateItem = function (obj, property, patchResource) {
    modifyToJSON(obj[property]);
    ResourceService.saveItem(obj, property, patchResource);
  };

  $scope.addDateItem = function (obj, property, selected, patchResource) {
    if (selected.value !== '') {
      modifyToJSON(selected.value);
      ResourceService.addItem(obj, property, selected, patchResource);
    } else {
      console.log('Empty date selected');
    }
  };
}]);
angular.module('AmpersandApp').controller('AtomicPasswordController', ["$scope", "ResourceService", function ($scope, ResourceService) {
  // Silently add patch. Change is not autosaved, because browser autofill can otherwise infinite loops 
  $scope.patchPasswordField = function (resource, ifc, patchResource) {
    var value;

    if (typeof resource[ifc] === 'undefined' || resource[ifc] === '') {
      value = null;
    } else {
      value = resource[ifc];
    }

    ResourceService.addPatch('replace', resource, patchResource, ifc, value);
  };
}]);
angular.module('AmpersandApp').controller('AtomicTypeAheadController', ["$scope", "Restangular", "ResourceService", function ($scope, Restangular, ResourceService) {
  /*
   * Object to temporary store value/resourceId to add to list
   * Value/resourceId is stored as property of 'selected' obj. This is needed to pass it around by reference
   */
  $scope.selected = {};
  $scope.hasNoResults = false;
  /*
   * Typeahead object is declared in interface.controller.js
   * Thereby typeahead is called only once for every resourceType per interface
   */
  // $scope.typeahead = {};

  /*
   * Typeahead functionality
   * $scope.typeahead is initiated in InterfaceController to be able to reuse typeahead data
   */

  $scope.getTypeahead = function (resourceType, forceGetCall) {
    forceGetCall = typeof forceGetCall !== 'undefined' ? forceGetCall : false; // Only if not yet set

    if (typeof $scope.typeahead[resourceType] === 'undefined' || forceGetCall) {
      $scope.typeahead[resourceType] = Restangular.all('resource/' + resourceType).getList().$object;
    }
  };

  $scope.typeaheadOnSelect = function ($item, $model, $label, resource, ifc, patchResource) {
    if (typeof $item._id_ === 'undefined') console.log('Resource id undefined');else if ($item._id_ === '') console.log('Empty resource id provided');else {
      if (Array.isArray(resource[ifc])) {
        // Construct patch(es)
        ResourceService.addPatch('add', resource, patchResource, ifc, $item._id_);
        ResourceService.patchResource(patchResource).then(function (data) {
          // Adapt in js model
          if (!data.saved) resource[ifc].push(angular.copy($item));
        });
      } else if (resource[ifc] === null) {
        // Construct patch(es)
        ResourceService.addPatch('replace', resource, patchResource, ifc, $item._id_);
        ResourceService.patchResource(patchResource).then(function (data) {
          // Adapt js model
          if (!data.saved) resource[ifc] = angular.copy($item);
        });
      } else console.log('Error: Property already set and/or not defined');

      $scope.hasNoResults = false;
    } // Empty selected input

    $scope.selected.value = '';
  };

  $scope.typeAheadCreate = function (resource, ifc, selected, patchResource, resourceType) {
    if (Array.isArray(resource[ifc])) {
      ResourceService.addItem(resource, ifc, selected, patchResource).then(function () {
        $scope.getTypeahead(resourceType, true);
      });
    } else if (resource[ifc] === null) {
      resource[ifc] = selected.value;
      ResourceService.saveItem(resource, ifc, patchResource);
    } else {
      console.log('Error: Property already set and/or not defined');
    }
  };
}]);
angular.module('AmpersandApp').controller('AtomicUploadFileController', ["$scope", "FileUploader", "NotificationService", function ($scope, FileUploader, NotificationService) {
  // File uploader stuff
  $scope.FileUploader = new FileUploader({
    alias: 'file',
    // fieldname as used in $_FILES['file']
    formData: [],
    removeAfterUpload: true,
    autoUpload: true
  });

  $scope.FileUploader.onSuccessItem = function (fileItem, response, status, headers) {
    NotificationService.updateNotifications(response.notifications);
    var newResource = response.content; // Add new resource to ifc

    if (Array.isArray(fileItem.resource[fileItem.ifc])) {
      // non-uni = list
      fileItem.resource[fileItem.ifc].splice(-1, 0, newResource);
    } else {
      // uni = object
      fileItem.resource[fileItem.ifc] = newResource;
    }
  };

  $scope.FileUploader.onErrorItem = function (item, response, status, headers) {
    NotificationService.addError(response.msg, response.error, true, response.html);
    NotificationService.updateNotifications(response.notifications);
  };
}]);
angular.module('AmpersandApp').controller('BoxController', ["$scope", "ResourceService", function ($scope, ResourceService) {
  // Function to create a new resource (does a POST)
  $scope.createResource = ResourceService.createResource; // function(resource, ifc, callingObj, insertAtIndex)
  // Function to save certain attributes changes of a resource (does a PATCH)

  $scope.save = function (resource) {
    ResourceService.patchResource(resource, true);
  }; // Function to cancel unsaved edits (does a GET)


  $scope.cancel = ResourceService.cancelResource; // function(resource)
  // Function to remove a resource from an interface (list)

  $scope.remove = ResourceService.removeResource; // function(ifc, resource, patchResource)
  // Function to delete a resource

  $scope["delete"] = ResourceService.deleteResource; // function(ifc, resource)
}]);
angular.module('AmpersandApp').controller('InterfaceController', ["$scope", "$location", "ResourceService", function ($scope, $location, ResourceService) {
  /*
   * An empty object for typeahead functionality.
   * Defined here so it can be reused in an interface
   * Prevents multiple calls for the same resourceType
   */
  $scope.typeahead = {}; // Detects location changes and checks if there are unsaved changes

  $scope.$on("$locationChangeStart", function (event, next, current) {
    if (ResourceService.checkRequired()) {
      var confirmed = confirm("You have unsaved edits. Do you wish to leave?");
      if (event && !confirmed) event.preventDefault();else if (event && confirmed) ResourceService.emptyUpdatedResources();else console.log('Someting went wrong. Cannot determine action after locationChangeStart');
    }
  }); // Function (reference) to check if there are pending promises for a resource

  $scope.pendingPromises = ResourceService.pendingPromises;
  /*
   * Transforms the given variable into an array.
   * To be used in ng-repeat directive for Ampersand UNI and non-UNI expressions
   * If variable is already an array, the array is returned
   * If variable is null, an empty array is returned
   * Otherwise the variable is the first and single item in the array
  */

  $scope.requireArray = function (variable) {
    if (Array.isArray(variable)) {
      return variable;
    } else if (variable === null) {
      return [];
    } else {
      return [variable];
    }
  };
}]);
angular.module('AmpersandApp').directive('myBluronenter', function () {
  return function (scope, element, attrs) {
    element.bind("keydown keypress", function (event) {
      if (event.which === 13) {
        // 13 = Carriage return
        event.target.blur();
        event.preventDefault();
      }
    });
  };
});
angular.module('AmpersandApp').directive('myShowonhoverBox', function () {
  return {
    link: function link(scope, element, attrs) {
      if (!element.closest('.box').hasClass('my-showonhover-box-show')) element.hide(); // default hide

      element.closest('.box').bind('mouseenter', function () {
        element.closest('.box').addClass('my-showonhover-box-show');
        element.show();
      });
      element.closest('.box').bind('mouseleave', function () {
        element.closest('.box').removeClass('my-showonhover-box-show');
        element.hide();
      });
    }
  };
});
angular.module('AmpersandApp').service('ResourceService', ["$localStorage", "$timeout", "$location", "Restangular", "NotificationService", "$q", function ($localStorage, $timeout, $location, Restangular, NotificationService, $q) {
  // http://blog.thoughtram.io/angular/2015/07/07/service-vs-factory-once-and-for-all.html
  var updatedResources = []; // contains list with updated resource objects in this interface. Used to check if there are uncommmitted changes (patches in cache)

  var ResourceService = {
    /**
     * Get resource data given a certain interface (ifc)
     * 
     * @param {Object} resource
     * @param {string} ifc
     * @param {Object} callingObj will be used for loading indicator
     * @param {string} tgtId get a specific target resource
     * @returns {Promise}
     */
    getResource: function getResource(resource, ifc, callingObj, tgtId) {
      // Url to GET resource
      var url = resource._path_ + '/' + ifc; // Append tgtId if specified

      if (tgtId !== undefined) {
        url += '/' + tgtId;
      }

      var promise = Restangular.one(url).get().then(function (data) {
        // No results
        if ($.isEmptyObject(data)) {
          NotificationService.addInfo('No results found'); // No specific target was requested
        } else if (tgtId === undefined) {
          if (resource[ifc] === null || Array.isArray(resource[ifc])) {
            resource[ifc] = data;
          } else {
            angular.extend(resource[ifc], data);
          } // Specific target was requested

        } else {
          if (Array.isArray(resource[ifc])) {
            resource[ifc].push(data);
          } else {
            resource[ifc] = data;
          }
        }

        ResourceService.initResourceMetaData(resource);
        return resource;
      }); // Add promise to loading list

      return ResourceService.addPromiseToResourceLoadingList(callingObj, promise);
    },

    /**
     * Patch the given resource by calling the API and sending the list of stored patches 
     * 
     * @param {Object} resource
     * @param {bool} forceSave
     * @returns {Promise}
     */
    patchResource: function patchResource(resource, forceSave) {
      // Use delegate resource if specified
      if (typeof resource._delegatePatchesTo_ !== 'undefined') {
        resource = resource._delegatePatchesTo_;
      } // Save if autoSave is enabled


      if ($localStorage.autoSave || forceSave) {
        var promise = Restangular.one(resource._path_).patch(resource._patchesCache_, {}).then(function (data) {
          // Update visual feedback (notifications and buttons)
          ResourceService.processResponse(resource, data); // Update resource data

          if (resource._isRoot_ && data.navTo == null) {
            resource.get(); // if directed to other page (data.navTo), refresh of data is not needed
          } else {
            resource = angular.extend(resource, data.content);
          }

          return {
            resource: resource,
            saved: true,
            committed: data.isCommitted
          };
        }); // Add promise to loading list

        return ResourceService.addPromiseToResourceLoadingList(resource, promise);
      } else {
        // Update visual feedback
        ResourceService.setResourceStatus(resource, 'warning');
        resource._showButtons_ = {
          'save': true,
          'cancel': true
        };
        return $q.resolve({
          resource: resource,
          saved: false,
          committed: false
        });
      }
    },

    /**
     * Cancel unsaved edits and get resource data
     * 
     * @param {Object} resource
     * @returns {Promise}
     */
    cancelResource: function cancelResource(resource) {
      var promise = Restangular.one(resource._path_).get().then(function (data) {
        if ($.isEmptyObject(data)) NotificationService.addInfo('No results found');else angular.extend(resource, data); // Update visual feedback (notifications and buttons)

        NotificationService.getNotifications();
        ResourceService.initResourceMetaData(resource);
        return resource;
      }); // Add promise to loading list

      return ResourceService.addPromiseToResourceLoadingList(resource, promise);
    },

    /**
     * Create (POST) a new resource to a certain interface list
     * 
     * @param {Object} resource
     * @param {string} ifc
     * @param {Object} patchResource
     * @param {int} insertAtIndex
     * @returns {Promise}
     */
    createResource: function createResource(resource, ifc, patchResource, insertAtIndex) {
      var promise = Restangular.one(resource._path_).all(ifc).post({}, {}).then(function (data) {
        var newResource = data.content; // Update visual feedback (notifications and buttons)

        ResourceService.processResponse(newResource, data); // If not committed, add this create action to patch list

        if (!data.isCommitted) {
          ResourceService.addPatch('create', resource, patchResource, ifc, newResource._id_); // Delegate additional patches upward, because this resource does not exist yet
          // See addPatch() and patchResource() functions

          newResource._delegatePatchesTo_ = patchResource;
        } // Add new resource to ifc


        if (Array.isArray(resource[ifc])) {
          // non-uni = list
          if (insertAtIndex === 'undefined') insertAtIndex = resource[ifc].length; // append by default

          resource[ifc].splice(insertAtIndex, 0, newResource);
        } else {
          // uni = object
          resource[ifc] = newResource;
        }

        if (resource._isRoot_ && resource._id_ == '_NEW') $location.url('/' + ifc + '/' + newResource._id_, false);
        return newResource;
      }); // Add promise to loading list

      return ResourceService.addPromiseToResourceLoadingList(patchResource, promise);
    },

    /**
     * Remove a resource from a certain interface list
     * 
     * @param {Object} parent
     * @param {string} ifc
     * @param {Object} resource
     * @param {Object} patchResource
     * @returns {Promise}
     */
    removeResource: function removeResource(parent, ifc, resource, patchResource) {
      // Construct patch(es)
      ResourceService.addPatch('remove', resource, patchResource); // Execute patch

      return ResourceService.patchResource(patchResource).then(function (data) {
        // Adapt js model
        if (!data.saved) {
          if (Array.isArray(parent[ifc])) parent[ifc].splice(parent[ifc].indexOf(resource), 1); // non-uni = list
          else parent[ifc] = null; // uni = object
        }
      });
    },

    /**
     * Delete a resource
     * 
     * @param {Object} parent
     * @param {string} ifc
     * @param {Object} resource to delete
     * @returns {Promise}
     */
    deleteResource: function deleteResource(parent, ifc, resource) {
      if (confirm('Are you sure?')) {
        var promise = Restangular.one(resource._path_).remove({}).then(function (data) {
          // Update visual feedback (notifications and buttons)
          NotificationService.updateNotifications(data.notifications); // Remove resource from ifc

          if (Array.isArray(parent[ifc])) parent[ifc].splice(parent[ifc].indexOf(resource), 1); // non-uni = list
          else parent[ifc] = null; // uni = object

          return parent;
        }); // Add promise to loading list

        return ResourceService.addPromiseToResourceLoadingList(resource, promise);
      }
    },

    /**
     * Save/patch a changed attribute
     * 
     * @param {Object} resource
     * @param {string} ifc
     * @param {Object} patchResource
     * @returns {Promise}
     */
    saveItem: function saveItem(resource, ifc, patchResource) {
      var value; // Construct patch(es)

      if (typeof resource[ifc] === 'undefined' || resource[ifc] === '') {
        value = null;
      } else {
        value = resource[ifc];
      }

      ResourceService.addPatch('replace', resource, patchResource, ifc, value); // Register patch

      return ResourceService.patchResource(patchResource);
    },

    /**
     * Add an item to an interface list
     * 
     * @param {Object} resource
     * @param {string} ifc
     * @param {Object} selected item to add to the list
     * @param {Object} patchResource
     * @returns {Promise}
     */
    addItem: function addItem(resource, ifc, selected, patchResource) {
      if (typeof selected.value === 'undefined') {
        //console.log('Value undefined');
        return $q.reject('Value undefined');
      } else if (selected.value === '') {
        //console.log('Empty value selected');
        return $q.reject('Empty value selected');
      } else if (!Array.isArray(resource[ifc])) {
        //console.log('Error: trying to add item to non-array');
        return $q.reject('Error: trying to add item to non-array');
      } else {
        // Adapt in js model
        resource[ifc].push(selected.value); // Construct patch(es)

        ResourceService.addPatch('add', resource, patchResource, ifc, selected.value);
        return ResourceService.patchResource(patchResource).then(function (data) {
          // Reset selected value
          delete selected.value;
          return data;
        });
      }
    },

    /**
     * Remove an item from an interface list
     * 
     * @param {Object} resource
     * @param {string} ifc
     * @param {int} index
     * @param {Object} patchResource
     * @returns {Promise}
     */
    removeItem: function removeItem(resource, ifc, index, patchResource) {
      // Construct patch(es)
      var value = resource[ifc][index];
      ResourceService.addPatch('remove', resource, patchResource, ifc, value); // Adapt js model

      resource[ifc].splice(index, 1);
      return ResourceService.patchResource(patchResource);
    },

    /**
     * Construct, add and return patch object (with attributes 'op', 'path' and 'value')
     * 
     * @param {string} operation choose from 'add', 'remove' or 'replace'
     * @param {Object} resource
     * @param {Object} patchResource resource to add patch to
     * @param {string} ifc
     * @param {string} value
     * @returns {Object}
     */
    addPatch: function addPatch(operation, resource, patchResource, ifc, value) {
      // When patchResource is not provided use the resource itself
      if (typeof patchResource === 'undefined') {
        patchResource = resource;
      } // Use delegate resource if specified


      if (typeof patchResource._delegatePatchesTo_ !== 'undefined') {
        patchResource = patchResource._delegatePatchesTo_;
      }

      var pathLength = patchResource._path_.length;

      var path = resource._path_.substring(pathLength);

      if (typeof ifc !== 'undefined') {
        path = path + '/' + ifc;
      }

      var patch;

      if (typeof value === 'undefined') {
        patch = {
          op: operation,
          path: path
        };
      } else {
        patch = {
          op: operation,
          path: path,
          value: value
        };
      } // Add new patch to patchResource


      if (!Array.isArray(patchResource._patchesCache_)) patchResource._patchesCache_ = [];

      patchResource._patchesCache_.push(patch); // Add resource to updatedResources


      if (updatedResources.indexOf(patchResource) === -1) updatedResources.push(patchResource);
      return patch;
    },

    /**
     * Returns if there are unsaved changes (i.e. patches that are not yet sent to the API)
     * 
     * @returns {bool}
     */
    checkRequired: function checkRequired() {
      return updatedResources.reduce(function (prev, item, index, arr) {
        return prev || item._patchesCache_.length;
      }, false);
    },

    /**
     * Clear list of updated resources
     */
    emptyUpdatedResources: function emptyUpdatedResources() {
      updatedResources = [];
    },

    /**
     * Init/reset resource meta data
     * 
     * @param {Object} resource
     */
    initResourceMetaData: function initResourceMetaData(resource) {
      resource._showButtons_ = {
        'save': false,
        'cancel': false
      };
      resource._patchesCache_ = [];
      ResourceService.setResourceStatus(resource, 'default');
    },

    /**
     * Process response: i.e. set resource buttons and status
     * 
     * @param {Object} resource
     * @param {Object} response from API
     * @returns {Object}
     */
    processResponse: function processResponse(resource, response) {
      NotificationService.updateNotifications(response.notifications);

      if (response.isCommitted) {
        resource._showButtons_ = {
          'save': false,
          'cancel': false
        };
        resource._patchesCache_ = []; // empty patches cache

        ResourceService.setResourceStatus(resource, 'success'); // After 3 seconds, reset status to default

        $timeout(function () {
          ResourceService.setResourceStatus(resource, 'default');
        }, 3000);
      } else {
        resource._showButtons_ = {
          'save': false,
          'cancel': true
        };
        ResourceService.setResourceStatus(resource, 'danger');
      }

      return resource;
    },

    /**
     * Set resource status meta data
     * 
     * @param {Object} resource
     * @param {string} status choose from 'warning', 'danger', 'success' or 'default'
     * @returns {Object}
     */
    setResourceStatus: function setResourceStatus(resource, status) {
      // Reset all status properties
      resource._status_ = {
        'warning': false,
        'danger': false,
        'default': false,
        'success': false
      }; // Set status property

      resource._status_[status] = true;
      return resource;
    },

    /**
     * Returns if resource has pending promises
     * 
     * @param {Object} resource
     * @returns {bool}
     */
    pendingPromises: function pendingPromises(resource) {
      if (!Array.isArray(resource._loading_)) return false; // empty array contains no pending promises

      return resource._loading_.some(function (val) {
        return val.$$state.status === 0; // promise status: 0 -> pending, 1 -> resolved, 2 -> rejected
      });
    },

    /**
     * @param {Object} resource
     * @param {Promise} promise
     * @returns {Promise}
     */
    addPromiseToResourceLoadingList: function addPromiseToResourceLoadingList(resource, promise) {
      if (!Array.isArray(resource._loading_)) resource._loading_ = [];

      resource._loading_.push(promise);

      resource._isLoading_ = true;
      return promise["finally"](function () {
        if (!ResourceService.pendingPromises(resource)) {
          resource._isLoading_ = false;
          resource._loading_ = [];
        }
      });
    }
  };
  return ResourceService;
}]);
angular.module('AmpersandApp').service('LoginService', ["$rootScope", "$location", "$localStorage", "$sessionStorage", function ($rootScope, $location, $localStorage, $sessionStorage) {
  var urlLoginPage = null;
  var service = {
    setLoginPage: function setLoginPage(url) {
      urlLoginPage = url;
    },
    gotoLoginPage: function gotoLoginPage() {
      if (urlLoginPage) {
        $location.url(urlLoginPage);
      }
    },
    getPageBeforeLogin: function getPageBeforeLogin() {
      return $localStorage.login_urlBeforeLogin;
    },
    sessionIsLoggedIn: function sessionIsLoggedIn() {
      return $sessionStorage.session.loggedIn;
    },
    setSessionIsLoggedIn: function setSessionIsLoggedIn(bool) {
      $sessionStorage.session.loggedIn = bool;
    },
    getSessionVars: function getSessionVars() {
      return $sessionStorage.sessionVars;
    }
  };
  $rootScope.$on('$routeChangeSuccess', function (event, current, previous) {
    if (current.$$route.originalPath !== urlLoginPage) {
      $localStorage.login_urlBeforeLogin = $location.path();
    } else {
      console.log('login page');
    }
  });
  return service;
}]);
angular.module('AmpersandApp').directive('myNavbarResize', ["$window", "$timeout", "NavigationBarService", function ($window, $timeout, NavigationBarService) {
  return function (scope, element) {
    var w = angular.element($window);

    var resizeNavbar = function resizeNavbar() {
      $timeout(function () {
        // moving ifc items from dropdown-menu to navbar itself
        while ($('#navbar-interfaces').width() < $('#navbar-wrapper').width() - $('#navbar-options').width() && $('#navbar-interfaces-dropdown-menu').children().length > 0) {
          $("#navbar-interfaces-dropdown-menu").children().first().appendTo("#navbar-interfaces") // move item back to menu bar
          .toggleClass('overflow-menu-item', false); // remove flag specifying that this item is in the overflow list
        } // moving ifc items from navbar to dropdown-menu


        while ($('#navbar-interfaces').width() > $('#navbar-wrapper').width() - $('#navbar-options').width()) {
          $("#navbar-interfaces").children().last().prependTo("#navbar-interfaces-dropdown-menu") // move item to overflow list
          .toggleClass('overflow-menu-item', true); // add flag specifying that this item is in the overflow list
          // show/hide dropdown menu for more interfaces (must be inside loop, because it affects the width of the navbar

          $('#navbar-interfaces-dropdown').toggleClass('hidden', $('#navbar-interfaces-dropdown-menu').children().length <= 0);
        } // show/hide dropdown menu when possible


        $('#navbar-interfaces-dropdown').toggleClass('hidden', $('#navbar-interfaces-dropdown-menu').children().length <= 0);
      });
    }; // watch navbar


    NavigationBarService.addObserverCallable(resizeNavbar); // when window size gets changed

    w.bind('resize', function () {
      resizeNavbar();
    }); // when page loads

    angular.element(document).ready(function () {
      resizeNavbar();
    });
  };
}]);
angular.module('AmpersandApp').directive('myNavItem', function () {
  return {
    restrict: 'A',
    scope: {
      item: '=data' // '=' => two-way bind

    },
    templateUrl: 'app/src/navbar/myNavItem.view.html',
    transclude: false,
    link: function link(scope, element, attrs, controller) {
      // Functionality to add/remove class 'dropdown-submenu' when item is moved to/from overflow list
      scope.$watch(function () {
        return element.attr('class');
      }, function () {
        if (scope.item.hasChildren() && element.hasClass('overflow-menu-item')) {
          element.addClass('dropdown-submenu');
        } else if (scope.item.hasChildren() && element.hasClass('top-menu-item')) {
          element.removeClass('dropdown-submenu');
        }
      });
    },
    controller: ["$scope", function controller($scope) {}]
  };
});
angular.module('AmpersandApp').controller('NavigationBarController', ["$scope", "$route", "Restangular", "$localStorage", "$sessionStorage", "$location", "NotificationService", "RoleService", "NavigationBarService", "LoginService", function ($scope, $route, Restangular, $localStorage, $sessionStorage, $location, NotificationService, RoleService, NavigationBarService, LoginService) {
  $scope.localStorage = $localStorage;
  $scope.loadingNavBar = [];
  $scope.navbar = NavigationBarService.navbar;
  $scope.resetSettingsToDefault = NavigationBarService.resetSettingsToDefault;

  $scope.loggedIn = function () {
    return LoginService.sessionIsLoggedIn();
  };

  $scope.getSessionRoles = function () {
    return $sessionStorage.sessionRoles;
  };

  $scope.getSessionVars = function () {
    return $sessionStorage.sessionVars;
  };

  $scope.reload = function () {
    $scope.loadingNavBar = [];
    $scope.loadingNavBar.push(NavigationBarService.refreshNavBar());
    $route.reload();
  };

  $scope.toggleRole = function (roleId, set) {
    RoleService.toggleRole(roleId, set);
    $scope.loadingNavBar = [];
    $scope.loadingNavBar.push(RoleService.setActiveRoles().then(function (data) {
      NavigationBarService.refreshNavBar();
      $route.reload();
    }));
  };

  $scope.checkAllRules = NotificationService.checkAllRules;

  $scope.createNewResource = function (resourceType, openWithIfc) {
    Restangular.one('resource').all(resourceType).post({}, {}).then(function (data) {
      // Jumps to interface and requests newly created resource
      $location.url(openWithIfc + '/' + data._id_);
    });
  };

  $scope.loadingNavBar.push(NavigationBarService.refreshNavBar());
}]);
angular.module('AmpersandApp').service('NavigationBarService', ["Restangular", "$localStorage", "$sessionStorage", "$timeout", "NotificationService", "$q", function (Restangular, $localStorage, $sessionStorage, $timeout, NotificationService, $q) {
  var navbar = {
    home: null,
    // home/start page, can be set in project.yaml (default: '#/prototype/welcome')
    top: [],
    "new": [],
    role: [],
    ext: []
  };
  var defaultSettings = {
    notify_showSignals: true,
    notify_showInfos: true,
    notify_showSuccesses: true,
    notify_autoHideSuccesses: true,
    notify_showErrors: true,
    notify_showWarnings: true,
    notify_showInvariants: true,
    autoSave: true
  };
  var observerCallables = [];

  var notifyObservers = function notifyObservers() {
    angular.forEach(observerCallables, function (callable) {
      callable();
    });
  };

  var pendingNavbarPromise = null;

  function getNavbarPromise() {
    if (pendingNavbarPromise === null) {
      pendingNavbarPromise = Restangular.one('app/navbar').get()["finally"](function () {
        pendingNavbarPromise = null;
      });
    }

    return pendingNavbarPromise;
  }

  var service = {
    navbar: navbar,
    defaultSettings: defaultSettings,
    addObserverCallable: function addObserverCallable(callable) {
      observerCallables.push(callable);
    },
    getRouteForHomePage: function getRouteForHomePage() {
      if (navbar.home === null) {
        return getNavbarPromise().then(function (data) {
          return data.home;
        }, function (error) {
          console.error('Error in getting nav bar data: ', error);
        });
      } else {
        return $q.resolve(navbar.home);
      }
    },
    refreshNavBar: function refreshNavBar() {
      return getNavbarPromise().then(function (data) {
        // Content of navbar
        var hasChildren = function hasChildren() {
          return this.children.length > 0;
        };

        var navItems = data.navs.map(function (item) {
          item.hasChildren = hasChildren.bind(item);
          return item;
        });
        var menus = treeify(navItems, 'id', 'parent', 'children');
        navbar.home = data.home;
        var mainMenu = menus.find(function (menu) {
          return menu.id === 'MainMenu';
        });
        navbar.top = mainMenu === undefined ? [] : mainMenu.children;
        navbar["new"] = data["new"];
        navbar.role = data.role;
        navbar.ext = data.ext; // Content for session storage

        $sessionStorage.session = data.session;
        $sessionStorage.sessionRoles = data.sessionRoles;
        $sessionStorage.sessionVars = data.sessionVars; // Save default settings

        service.defaultSettings = data.defaultSettings;
        service.initializeSettings(); // Update notifications

        NotificationService.updateNotifications(data.notifications);
        notifyObservers();
      }, function (error) {
        service.initializeSettings();
      })["catch"](function (error) {
        console.error(error);
      });
    },
    initializeSettings: function initializeSettings() {
      var resetRequired = false; // Check for undefined settings

      angular.forEach(service.defaultSettings, function (value, index, obj) {
        if ($localStorage[index] === undefined) {
          resetRequired = true;
        }
      });
      if (resetRequired) service.resetSettingsToDefault();
    },
    resetSettingsToDefault: function resetSettingsToDefault() {
      // all off
      angular.forEach(service.defaultSettings, function (value, index, obj) {
        $localStorage[index] = false;
      });
      $timeout(function () {
        // Reset to default
        $localStorage.$reset(service.defaultSettings);
      }, 500);
    }
  };
  /**
   * Creates a tree from flat list of elements with parent specified.
   * If no parent specified, the element is considered a root node
   * The function returns a list of root nodes
   * 'id', 'parent' and 'children' object labels can be set
   * 
   * @param {Array} list 
   * @param {string} idAttr 
   * @param {string} parentAttr 
   * @param {string} childrenAttr 
   * @returns {Array}
   */

  function treeify(list, idAttr, parentAttr, childrenAttr) {
    if (!idAttr) idAttr = 'id';
    if (!parentAttr) parentAttr = 'parent';
    if (!childrenAttr) childrenAttr = 'children';
    var treeList = [];
    var lookup = {};
    list.forEach(function (obj) {
      lookup[obj[idAttr]] = obj;
      obj[childrenAttr] = [];
    });
    list.forEach(function (obj) {
      if (obj[parentAttr] != null) {
        if (lookup[obj[parentAttr]] === undefined) {
          // error when parent element is not defined in list
          console.error('Parent element is undefined: ', obj[parentAttr]);
        } else {
          lookup[obj[parentAttr]][childrenAttr].push(obj);
          obj[parentAttr] = lookup[obj[parentAttr]]; // replace parent id with reference to actual parent element
        }
      } else {
        treeList.push(obj);
      }
    });
    return treeList;
  }

  return service;
}]);
angular.module('AmpersandApp').service('RoleService', ["$sessionStorage", "Restangular", function ($sessionStorage, Restangular) {
  /*
   * Available roles are registered in $sessionStorage.sessionRoles
   * A role has the following attributes: id, label, active
   */
  return {
    selectRole: function selectRole(roleId) {
      this.toggleRole(roleId, true);
    },
    selectRoleByLabel: function selectRoleByLabel(roleLabel) {
      angular.forEach($sessionStorage.sessionRoles, function (role) {
        if (role.label == roleLabel) return this.selectRole(role.id);
      });
    },
    toggleRole: function toggleRole(roleId, set) {
      angular.forEach($sessionStorage.sessionRoles, function (role) {
        if (role.id == roleId) {
          if (set === undefined) role.active = !role.active;else role.active = set;
        }
      });
    },
    getActiveRoleIds: function getActiveRoleIds() {
      var roleIds = [];
      angular.forEach($sessionStorage.sessionRoles, function (role) {
        if (role.active === true) {
          roleIds.push(role.id);
        }
      });
      return roleIds;
    },
    deactivateAllRoles: function deactivateAllRoles() {
      angular.forEach($sessionStorage.sessionRoles, function (role) {
        role.active = false;
      });
    },
    setActiveRoles: function setActiveRoles() {
      return Restangular.all('app/roles').patch($sessionStorage.sessionRoles);
    }
  };
}]);
angular.module('AmpersandApp').service('NotificationService', ["$localStorage", "$sessionStorage", "$timeout", "Restangular", function ($localStorage, $sessionStorage, $timeout, Restangular) {
  // Initialize notifications container
  var notifications = {
    'signals': [],
    'invariants': [],
    'infos': [],
    'successes': [],
    'warnings': [],
    'errors': []
  };
  var NotificationService = {
    notifications: notifications,
    // Function to get notifications again
    getNotifications: function getNotifications() {
      return Restangular.one('app/notifications').get().then(function (data) {
        NotificationService.updateNotifications(data);
      }, function () {
        NotificationService.addError('Something went wrong while getting notifications');
      });
    },
    checkAllRules: function checkAllRules() {
      return Restangular.one('admin/ruleengine/evaluate/all').get().then(function (data) {
        NotificationService.addSuccess('Evaluated all rules.');
        NotificationService.updateNotifications(data);
      }, function () {
        NotificationService.addError('Something went wrong while evaluating all rules');
      });
    },
    // Function to update notifications after api response
    updateNotifications: function updateNotifications(data) {
      if (data === undefined) return; // Overwrite

      notifications.signals = data.signals;
      notifications.invariants = data.invariants; // Merge

      notifications.infos = notifications.infos.concat(data.infos);
      notifications.successes = notifications.successes.concat(data.successes);
      notifications.warnings = notifications.warnings.concat(data.warnings);
      notifications.errors = notifications.errors.concat(data.errors);

      if ($localStorage.notify_autoHideSuccesses) {
        $timeout(function () {
          notifications.successes = [];
        }, 3000);
      }
    },
    clearNotifications: function clearNotifications() {
      notifications.signals = [];
      notifications.invariants = [];
      notifications.infos = [];
      notifications.successes = [];
      notifications.warnings = [];
      notifications.errors = [];
    },
    addSuccess: function addSuccess(message) {
      notifications.successes.push({
        'message': message,
        'count': 1
      }); // TODO: move timeout function here for auto hide successes
    },
    addError: function addError(message, code, persistent, details) {
      code = _typeof(code) !== undefined ? code : null;
      persistent = _typeof(persistent) !== undefined ? persistent : false;
      details = _typeof(details) !== undefined ? details : false;
      var alreadyExists = false;
      var arr = notifications.errors;

      for (var i = 0; i < arr.length; i++) {
        if (arr[i].message == message) {
          arr[i].count += 1;
          arr[i].code = code;
          arr[i].persistent = persistent;
          arr[i].details = details;
          alreadyExists = true;
        }
      }

      if (!alreadyExists) notifications.errors.push({
        'message': message,
        'code': code,
        'count': 1,
        'persistent': persistent,
        'details': details
      });
    },
    addWarning: function addWarning(message) {
      var alreadyExists = false;
      var arr = notifications.warnings;

      for (var i = 0; i < arr.length; i++) {
        if (arr[i].message == message) {
          arr[i].count += 1;
          alreadyExists = true;
        }
      }

      if (!alreadyExists) notifications.warnings.push({
        'message': message,
        'count': 1
      });
    },
    addInfo: function addInfo(message) {
      var alreadyExists = false;
      var arr = notifications.infos;

      for (var i = 0; i < arr.length; i++) {
        if (arr[i].message == message) {
          arr[i].count += 1;
          alreadyExists = true;
        }
      }

      if (!alreadyExists) notifications.infos.push({
        'message': message,
        'count': 1
      });
    }
  };
  return NotificationService;
}]);
angular.module('AmpersandApp').controller('NotificationCenterController', ["$scope", "$route", "Restangular", "$localStorage", "NotificationService", function ($scope, $route, Restangular, $localStorage, NotificationService) {
  $scope.localStorage = $localStorage;
  $scope.notifications = NotificationService.notifications; // Hide success-, error-, warnings-, info- and invariant violation messages (not signals) upon route change

  $scope.$on("$routeChangeSuccess", function () {
    $scope.notifications.successes = [];
    $scope.notifications.errors = $scope.notifications.errors.filter(function (error) {
      if (error.persistent) {
        error.persistent = false;
        return true;
      } else return false;
    });
    $scope.notifications.warnings = [];
    $scope.notifications.infos = [];
    $scope.notifications.invariants = [];
  }); // Function to close notifications

  $scope.closeAlert = function (alerts, index) {
    alerts.splice(index, 1);
  };
}]);
angular.module('AmpersandApp').filter('unsafe', ["$sce", function ($sce) {
  return $sce.trustAsHtml;
}]);
angular.module('AmpersandApp').config(["$routeProvider", function ($routeProvider) {
  $routeProvider // default start page
  .when('/ext/Login', {
    resolveRedirectTo: ['LoginService', function (LoginService) {
      if (LoginService.sessionIsLoggedIn()) {
        return '/'; // nav to home when user is already loggedin
      } else {
          return; // will continue this route using controller and template below
        }
    }],
    controller: 'LoginExtLoginController',
    templateUrl: 'app/src/oauthlogin/login.html',
    interfaceLabel: 'Login'
  });
}]).requires.push('LoginModule'); // add LoginModule to dependency list
// LoginModule declaration

angular.module('LoginModule', ['ngRoute', 'restangular']).controller('LoginExtLoginController', ["$scope", "Restangular", "$location", "NotificationService", "LoginService", function ($scope, Restangular, $location, NotificationService, LoginService) {
  // When already logged in, navigate to home
  $scope.$watch(LoginService.sessionIsLoggedIn(), function () {
    if (LoginService.sessionIsLoggedIn()) {
      $location.path('/'); // goto home
    }
  });
  Restangular.one('oauthlogin/login').get().then(function (data) {
    // on success
    $scope.idps = data.identityProviders;
    NotificationService.updateNotifications(data.notifications);
  });
}]).controller('LoginExtLogoutController', ["$scope", "Restangular", "$location", "NotificationService", "NavigationBarService", function ($scope, Restangular, $location, NotificationService, NavigationBarService) {
  $scope.logout = function () {
    Restangular.one('oauthlogin/logout').get().then(function (data) {
      // success
      NotificationService.updateNotifications(data.notifications);
      NavigationBarService.refreshNavBar();
      $location.path('/'); // goto home
    });
  };
}]);
angular.module('AmpersandApp').directive('myNavToInterfaces', function () {
  return {
    restrict: 'E',
    scope: {
      resource: '=',
      target: '@'
    },
    // '=' => two-way bind, '@' => evaluates string (use {{}} in html) 
    templateUrl: 'app/src/shared/myNavTo/myNavToInterfaces.html',
    transclude: true
  };
});
angular.module('AmpersandApp').directive('myNavToOtherInterfaces', function () {
  return {
    restrict: 'E',
    scope: {
      resource: '=',
      target: '@'
    },
    // '=' => two-way bind, '@' => evaluates string (use {{}} in html) 
    templateUrl: 'app/src/shared/myNavTo/myNavToOtherInterfaces.html'
  };
});
angular.module('AmpersandApp').run(['$templateCache', function ($templateCache) {
  $templateCache.put('app/src/admin/check-rules-menu-item.html', '<a ng-click="checkAllRules()"><span class="glyphicon glyphicon-check"></span><span> (Re)evaluate all rules</span></a>');
  $templateCache.put('app/src/admin/execengine-menu-item.html', '<a ng-controller="ExecEngineController" href="" ng-click="run()">\r\n\t<span class="glyphicon glyphicon-cog"></span><span> Run execution engine</span>\r\n</a>');
  $templateCache.put('app/src/admin/exporter-menu-item.html', '<a ng-href="api/v1/admin/exporter/export/all">\r\n    <span class="glyphicon glyphicon-download"></span><span> Population export</span>\r\n</a>');
  $templateCache.put('app/src/admin/installer-menu-item.html', '<a href="#/admin/installer">\r\n    <span class="glyphicon glyphicon-trash"></span><span> Reinstall application</span>\r\n</a>');
  $templateCache.put('app/src/admin/installer.html', '<div class="container-fluid" id="Interface">\r\n    <div class="jumbotron">\r\n        <h1>Installer</h1>\r\n        <p>This action will reinstall the application and delete all content.</p>\r\n        <p>If provided, the initial population will be installed.</p>\r\n        <div class="btn-group">\r\n            <button type="button" ng-click="install(true)" class="btn btn-lg" ng-class="{\'btn-danger\' : (!installing && !installed), \'btn-warning\' : installing, \'btn-success\' : installed}" ng-disabled="installing">\r\n                <span ng-if="!installed && ! installing">Reinstall application  </span>\r\n                <span ng-if="installing">Application installing  </span>\r\n                <span ng-if="installed">Application reinstalled  </span>\r\n                <img ng-if="installing" ng-src="app/images/loading.gif" style="height:20px;"/>\r\n            </button>\r\n            <button type="button" class="btn btn-lg dropdown-toggle" ng-class="{\'btn-danger\' : (!installing && !installed), \'btn-warning\' : installing, \'btn-success\' : installed}" ng-disabled="installing" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\r\n                <span class="caret"></span>\r\n            </button>\r\n            <ul class="dropdown-menu">\r\n                <li><a href="" ng-click="install(true, false)">Reinstall application</a></li>\r\n                <li><a href="" ng-click="install(false, false)">Reinstall application (without default population)</a></li>\r\n                <li><a href="" ng-click="install(true, true)">Reinstall application (ignore invariant rules)</a></li>\r\n            </ul>\r\n        </div>\r\n    </div>\r\n</div>');
  $templateCache.put('app/src/importer/importer.html', '<style>\r\n.my-drop-zone { \r\nborder: dotted 3px lightgray;\r\n}\r\n\r\n/* Default class applied to drop zones on over */\r\n.nv-file-over {\r\n\tborder: dotted 3px green;\r\n}\r\n</style>\r\n<div class="container-fluid interface">\r\n\t<fieldset>\r\n\t\t<legend>Population importer</legend>\r\n\t\t<div class="row">\r\n\t\t\t<div class="col-md-3" nv-file-drop="" uploader="uploader">\r\n\t\t\t\t<h3>Select files</h3>\r\n\t\t\t\t\r\n\t\t\t\t<div ng-show="uploader.isHTML5">\r\n\t\t\t\t<!-- 3. nv-file-over uploader="link" over-class="className" -->\r\n\t\t\t\t\t<div class="well my-drop-zone" nv-file-over="" uploader="uploader">\r\n\t\t\t\t\t\tBase drop zone\r\n\t\t\t\t\t</div>\r\n\t\t\t\t</div>\r\n\t\t\t\t\r\n\t\t\t\t<!-- Example: nv-file-select="" uploader="{Object}" options="{Object}" filters="{String}" -->\r\n\t\t\t\tMultiple\r\n\t\t\t\t<input type="file" nv-file-select="" uploader="uploader" multiple  /><br/>\r\n\t\t\t\t\r\n\t\t\t\tSingle\r\n\t\t\t\t<input type="file" nv-file-select="" uploader="uploader" />\r\n\t\t\t</div>\t\r\n\t\t\t\r\n\t\t\t<div class="col-md-9" style="margin-bottom: 40px">\r\n\t\r\n\t\t\t\t<h3>Upload queue</h3>\r\n\t\t\t\t<p>Queue length: {{ uploader.queue.length }}</p>\r\n\t\t\t\t\r\n\t\t\t\t<table class="table">\r\n\t\t\t\t\t<thead>\r\n\t\t\t\t\t\t<tr>\r\n\t\t\t\t\t\t\t<th width="50%">Name</th>\r\n\t\t\t\t\t\t\t<th ng-show="uploader.isHTML5">Size</th>\r\n\t\t\t\t\t\t\t<th ng-show="uploader.isHTML5">Progress</th>\r\n\t\t\t\t\t\t\t<th>Status</th>\r\n\t\t\t\t\t\t\t<th>Actions</th>\r\n\t\t\t\t\t\t</tr>\r\n\t\t\t\t\t</thead>\r\n\t\t\t\t\t<tbody>\r\n\t\t\t\t\t\t<tr ng-repeat="item in uploader.queue">\r\n\t\t\t\t\t\t\t<td><strong>{{ item.file.name }}</strong></td>\r\n\t\t\t\t\t\t\t<td ng-show="uploader.isHTML5" nowrap>{{ item.file.size/1024/1024|number:2 }} MB</td>\r\n\t\t\t\t\t\t\t<td ng-show="uploader.isHTML5">\r\n\t\t\t\t\t\t\t\t<div class="progress" style="margin-bottom: 0;">\r\n\t\t\t\t\t\t\t\t\t<div class="progress-bar" role="progressbar" ng-style="{ \'width\': item.progress + \'%\' }"></div>\r\n\t\t\t\t\t\t\t\t</div>\r\n\t\t\t\t\t\t\t</td>\r\n\t\t\t\t\t\t\t<td class="text-center">\r\n\t\t\t\t\t\t\t\t<span ng-show="item.isSuccess"><i class="glyphicon glyphicon-ok"></i></span>\r\n\t\t\t\t\t\t\t\t<span ng-show="item.isCancel"><i class="glyphicon glyphicon-ban-circle"></i></span>\r\n\t\t\t\t\t\t\t\t<span ng-show="item.isError"><i class="glyphicon glyphicon-remove"></i></span>\r\n\t\t\t\t\t\t\t\t<span ng-show="item.isUploading"><img src="app/images/loading.gif" height="20" width="20"></span>\r\n\t\t\t\t\t\t\t</td>\r\n\t\t\t\t\t\t\t<td nowrap>\r\n\t\t\t\t\t\t\t\t<button type="button" class="btn btn-success btn-xs" ng-click="item.upload()" ng-disabled="item.isReady || item.isUploading">  <!-- Removed: "|| item.isSuccess" to enable the re-upload of a file.-->\r\n\t\t\t\t\t\t\t\t\t<span class="glyphicon glyphicon-upload"></span> Upload\r\n\t\t\t\t\t\t\t\t</button>\r\n\t\t\t\t\t\t\t\t<button type="button" class="btn btn-warning btn-xs" ng-click="item.cancel()" ng-disabled="!item.isUploading">\r\n\t\t\t\t\t\t\t\t\t<span class="glyphicon glyphicon-ban-circle"></span> Cancel\r\n\t\t\t\t\t\t\t\t</button>\r\n\t\t\t\t\t\t\t\t<button type="button" class="btn btn-danger btn-xs" ng-click="item.remove()">\r\n\t\t\t\t\t\t\t\t\t<span class="glyphicon glyphicon-trash"></span> Remove\r\n\t\t\t\t\t\t\t\t</button>\r\n\t\t\t\t\t\t\t</td>\r\n\t\t\t\t\t\t</tr>\r\n\t\t\t\t\t</tbody>\r\n\t\t\t\t</table>\r\n\t\t\t\t\r\n\t\t\t\t<div>\r\n\t\t\t\t\t<div>\r\n\t\t\t\t\t\tQueue progress:\r\n\t\t\t\t\t\t<div class="progress">\r\n\t\t\t\t\t\t\t<div class="progress-bar" role="progressbar" ng-style="{ \'width\': uploader.progress + \'%\' }"></div>\r\n\t\t\t\t\t\t</div>\r\n\t\t\t\t\t</div>\r\n\t\t\t\t\t<button type="button" class="btn btn-success btn-sm" ng-click="uploader.uploadAll()" ng-disabled="!uploader.getNotUploadedItems().length">\r\n\t\t\t\t\t\t<span class="glyphicon glyphicon-upload"></span> Upload all\r\n\t\t\t\t\t</button>\r\n\t\t\t\t\t<button type="button" class="btn btn-warning btn-sm" ng-click="uploader.cancelAll()" ng-disabled="!uploader.isUploading">\r\n\t\t\t\t\t\t<span class="glyphicon glyphicon-ban-circle"></span> Cancel all\r\n\t\t\t\t\t</button>\r\n\t\t\t\t\t<button type="button" class="btn btn-danger btn-sm" ng-click="uploader.clearQueue()" ng-disabled="!uploader.queue.length">\r\n\t\t\t\t\t\t<span class="glyphicon glyphicon-trash"></span> Remove all\r\n\t\t\t\t\t</button>\r\n\t\t\t\t</div>\t\r\n\t\t\t</div>\r\n\t\t</div>\r\n\t</fieldset>\r\n</div>');
  $templateCache.put('app/src/importer/menu-item.html', '<a ng-href="#/ext/importer/">\r\n    <span class="glyphicon glyphicon-upload"></span><span> Population importer</span>\r\n</a>');
  $templateCache.put('app/src/navbar/myNavItem.view.html', '<a ng-if="item.ifc" ng-href="#/{{item.ifc}}"><!-- link to specific interface -->\r\n    <span class="glyphicon glyphicon-list-alt"></span>\r\n    <span> {{item.label}}</span>\r\n</a>\r\n<a ng-if="item.url" ng-href="{{item.url}}" target="_blank"><!-- link to (external) url -->\r\n    <span class="glyphicon glyphicon-link"></span>\r\n    <span> {{item.label}}</span>\r\n</a>\r\n<a ng-if="item.hasChildren()" href="" class="dropdown-toggle" data-toggle="dropdown">\r\n    <span class="glyphicon glyphicon-align-justify"></span>\r\n    <span> {{item.label}}</span>\r\n</a>\r\n<ul ng-if="item.hasChildren()" class="dropdown-menu" role="menu">\r\n    <li ng-repeat="subitem in item.children | orderBy : \'seqNr\'"\r\n        ng-class="{\'dropdown-submenu\' : subitem.hasChildren(), \'dropdown-header\' : !subitem.ifc && !subitem.url && !subitem.hasChildren()}"\r\n        my-nav-item data="subitem"></li>\r\n</ul>\r\n<span ng-if="!item.ifc && !item.url && !item.hasChildren()">{{item.label}}</span>');
  $templateCache.put('app/src/navbar/navigationBar.html', '<nav class="navbar navbar-default" role="navigation" ng-controller="NavigationBarController" cg-busy="{promise:loadingNavBar}">\r\n    <div id="navbar-wrapper" class="container">\r\n        <ul class="nav navbar-nav" id="navbar-interfaces" my-navbar-resize>\r\n            <li ng-show="navbar.home"><a ng-href="#{{navbar.home}}"><span class="glyphicon glyphicon-home"></span></a></li>\r\n            <li id="navbar-interfaces-dropdown" class="dropdown">\r\n                <a href="" class="dropdown-toggle" data-toggle="dropdown"><span class="glyphicon glyphicon-menu-hamburger"></span></a>\r\n                <ul id="navbar-interfaces-dropdown-menu" class="dropdown-menu" role="menu"></ul>\r\n            </li>\r\n            <li id="{{item.id}}" class="top-menu-item" ng-repeat="item in navbar.top | orderBy : \'seqNr\'" my-nav-item data="item"></li>\r\n        </ul>\r\n        <ul class="nav navbar-nav navbar-right" id="navbar-options">\r\n            <!-- hidden on extra small devices, e.g. phone (<768px) -->\r\n            <li class="dropdown hidden-xs" uib-tooltip="Notification menu" tooltip-trigger="mouseenter" tooltip-placement="left">\r\n                <a href="" class="dropdown-toggle" data-toggle="dropdown"><span class="glyphicon glyphicon-bullhorn"></span></a>\r\n                <ul class="dropdown-menu" role="menu" ng-click="$event.stopPropagation();">\r\n                    <li class="dropdown-header">Transaction settings</li>\r\n                        <li><switch ng-model="localStorage.notify_showSignals"> Show signals</switch></li>\r\n                        <li><switch ng-model="localStorage.notify_showInvariants"> Show invariants</switch></li>\r\n                        <li><switch ng-model="localStorage.autoSave"> Auto save changes</switch></li>\r\n                    <li class="dropdown-header">User logs</li>\r\n                        <li><switch ng-model="localStorage.notify_showErrors"> Show errors</switch></li>\r\n                        <li><switch ng-model="localStorage.notify_showWarnings"> Show warnings</switch></li>\r\n                        <li><switch ng-model="localStorage.notify_showInfos"> Show infos</switch></li>\r\n                        <li><switch ng-model="localStorage.notify_showSuccesses"> Show successes</switch></li>\r\n                        <li><switch ng-model="localStorage.notify_autoHideSuccesses"> Auto hide successes</switch></li>\r\n                    <li class="divider" role="presentation"></li>\r\n                        <li><a href="" ng-click="resetSettingsToDefault();"><span class="glyphicon glyphicon-repeat" style="margin: 4px; width: 30px;"></span> Default settings</a></li>\r\n                </ul>\r\n            </li>\r\n            \r\n            <!-- hidden on extra small devices, e.g. phone (<768px) -->\r\n            <li class="dropdown hidden-xs" uib-tooltip="Tool menu" tooltip-trigger="mouseenter" tooltip-placement="left">\r\n                <a href="" class="dropdown-toggle" data-toggle="dropdown"><span class="glyphicon glyphicon-th"></span></a>\r\n                <ul class="dropdown-menu" role="menu">\r\n                    <li><a href="" ng-click="reload()"><span class="glyphicon glyphicon-refresh"></span> Refresh page</a></li>\r\n                    <li ng-repeat="ext in navbar.ext" ng-include="ext.url"/>\r\n                </ul>\r\n            </li>\r\n            \r\n            <!-- hidden on extra small devices, e.g. phone (<768px) -->\r\n            <li ng-if="navbar.new.length" class="dropdown hidden-xs" uib-tooltip="Create new" tooltip-trigger="mouseenter" tooltip-placement="left">\r\n                <a href="" class="dropdown-toggle" data-toggle="dropdown">\r\n                    <span class="glyphicon glyphicon-plus"></span>\r\n                </a>\r\n                <ul class="dropdown-menu" role="menu">\r\n                    <li ng-repeat="item in navbar.new" ng-class="{\'dropdown-submenu\' : item.ifcs.length > 1}">\r\n                        <!--<a  style="position:relative; display:inline-block;">-->\r\n                        <a ng-if="item.ifcs.length > 1" tabindex="-1" href="#">{{item.label}}</a>\r\n                        <ul ng-if="item.ifcs.length > 1" class="dropdown-menu" role="menu">\r\n                            <li ng-repeat="ifc in item.ifcs">\r\n                                <a tabindex="-1" href="#" ng-click="createNewResource(ifc.resourceType, ifc.link);">{{ifc.label}}</a>\r\n                            </li>\r\n                        </ul>\r\n                        \r\n                        <a ng-if="item.ifcs.length == 1" href="" ng-click="createNewResource(item.ifcs[0].resourceType, item.ifcs[0].link);">{{item.label}}</a>\r\n                        <span ng-if="item.ifcs.length == 0">{{item.label}}</span>\r\n                    </li>\r\n                </ul>\r\n            </li>\r\n            \r\n            <li ng-if="getSessionRoles().length || navbar.role.length" class="dropdown" uib-tooltip="Role menu" tooltip-trigger="mouseenter" tooltip-placement="left">\r\n                <a href="" class="dropdown-toggle" data-toggle="dropdown"><span class="glyphicon glyphicon-user"></span></a>\r\n                <ul class="dropdown-menu" role="menu">\r\n                    <li ng-repeat="role in getSessionRoles()" ng-click="$event.stopPropagation();"><switch ng-model="role.active" ng-click="toggleRole(role.id);"> {{role.label}}</switch></li>\r\n                    <li ng-if="navbar.role.length && getSessionRoles().length" class="divider" role="presentation"></li>\r\n                    <li ng-repeat="ext in navbar.role" ng-include="ext.url"/>\r\n                </ul>\r\n            </li>\r\n        </ul>\r\n    </div>\r\n</nav>');
  $templateCache.put('app/src/notifications/notificationCenter.html', '<div class="container-fluid">\r\n    <div id="notificationCenter" ng-controller="NotificationCenterController">\r\n        \r\n        <div id="infos" ng-show="localStorage.notify_showInfos">\r\n            <div class="alert alert-info alert-dismissible" role="alert" ng-repeat="info in notifications.infos">\r\n                <button type="button" class="close" data-dismiss="alert" aria-label="Close" ng-click="closeAlert(notifications.infos, $index);"><span aria-hidden="true">&times;</span></button>\r\n                <span class="glyphicon glyphicon-info-sign"></span><span> {{info.message}}</span>\r\n            </div>\r\n        </div>\r\n        \r\n        <div id="warnings" ng-show="localStorage.notify_showWarnings">\r\n            <div class="alert alert-warning alert-dismissible" role="alert" ng-repeat="warning in notifications.warnings">\r\n                <button type="button" class="close" data-dismiss="alert" aria-label="Close" ng-click="closeAlert(notifications.warnings, $index);"><span aria-hidden="true">&times;</span></button>\r\n                <span class="glyphicon glyphicon-warning-sign"></span><span> {{warning.message}}</span>\r\n                <span class="badge pull-right" ng-show="warning.count > 1">{{warning.count}}</span>\r\n            </div>\r\n        </div>\r\n        \r\n        <div id="errors" ng-show="localStorage.notify_showErrors">\r\n            <div class="panel panel-danger" id="error-panel-{{key}}" ng-repeat="(key, error) in notifications.errors">\r\n                <div class="panel-heading btn btn-block" data-toggle="collapse" data-target="#error-body-{{key}}">\r\n                    <div class="text-left">\r\n                        <span class="glyphicon glyphicon-exclamation-sign"></span> <span ng-bind-html="error.message | unsafe"></span>\r\n                        <button type="button" class="close" data-target="#error-panel-{{key}}" data-dismiss="alert" aria-label="Dismiss" ng-click="closeAlert(notifications.errors, $index);">\r\n                            <span aria-hidden="true">&times;</span>\r\n                        </button>\r\n                        <span class="badge pull-right" ng-show="error.count > 1">{{error.count}}</span>\r\n                    </div>\r\n                </div>\r\n                <div class="panel-body collapse" id="error-body-{{key}}">\r\n                    <div ng-if="error.details" ng-bind-html="error.details | unsafe"></div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n        \r\n        <div id="invariants" ng-show="localStorage.notify_showInvariants">\r\n            <div class="panel panel-danger" ng-repeat="(key, val) in notifications.invariants">\r\n                <div class="panel-heading btn btn-block" data-toggle="collapse" data-target="#invariant-{{key}}">\r\n                    <div class="text-left" style="display:flex; align-items:center;">\r\n                        <span class="glyphicon glyphicon-warning-sign"></span>\r\n                        <div marked="val.ruleMessage" style="display:inline-block; margin: 0px 10px;"></div> <!-- uses angular-marked directive -->\r\n                        <span class="badge" style="margin-left:auto;">{{val.tuples.length}}</span>\r\n                    </div>\r\n                </div>\r\n                <ul class="list-group collapse" id="invariant-{{key}}">\r\n                    <li class="list-group-item" ng-repeat="tuple in val.tuples track by $index">\r\n                        <span>{{tuple.violationMessage}}</span>\r\n                    </li>\r\n                </ul>\r\n            </div>\r\n        </div>\r\n                    \r\n        <div id="signals" ng-show="localStorage.notify_showSignals">\r\n            <div class="panel panel-warning" ng-repeat="(key, val) in notifications.signals">\r\n                <div class="panel-heading btn btn-block" data-toggle="collapse" data-target="#violation-{{key}}">\r\n                    <div class="text-left" style="display:flex; align-items:center;">\r\n                        <span class="glyphicon glyphicon-warning-sign"></span>\r\n                        <div marked="val.message" style="display:inline-block; margin: 0px 10px;"></div> <!-- uses angular-marked directive -->\r\n                        <span class="badge" style="margin-left:auto;">{{val.violations.length}}</span>\r\n                    </div>\r\n                </div>\r\n                <ul class="list-group collapse" id="violation-{{key}}">\r\n                    <li class="dropdown list-group-item" ng-repeat="violation in val.violations track by $index">\r\n                        <div ng-if="violation.ifcs.length > 1">\r\n                            <a href="" class="dropdown-toggle" data-toggle="dropdown">{{violation.message}}</a>\r\n                            <ul class="dropdown-menu" role="menu">\r\n                                <li ng-repeat="ifc in violation.ifcs">\r\n                                    <a ng-href="{{ifc.link}}" data-toggle="collapse" data-target="#violation-{{key}}"><small>View</small> {{ifc.label}}</a>\r\n                                </li>\r\n                            </ul>\r\n                        </div>\r\n                        <a ng-if="violation.ifcs.length == 1" ng-href="{{violation.ifcs[0].link}}" data-toggle="collapse" data-target="#violation-{{key}}">{{violation.message}}</a>\r\n                        <span ng-if="violation.ifcs.length == 0">{{violation.message}}</span>\r\n                    </li>\r\n                </ul>\r\n            </div>\r\n        </div>\r\n        \r\n        <!-- Success notifications must be last in notifications center because of position:absolute -->\r\n        <div id="successes" ng-show="localStorage.notify_showSuccesses">\r\n            <div class="alert alert-success alert-dismissible" role="alert" ng-repeat="success in notifications.successes">\r\n                <button type="button" class="close" data-dismiss="alert" aria-label="Close" ng-click="closeAlert(notifications.successes, $index);"><span aria-hidden="true">&times;</span></button>\r\n                <span class="glyphicon glyphicon-ok-sign"></span><span> {{success.message}}</span>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>');
  $templateCache.put('app/src/oauthlogin/login.html', '<div class="container-fluid interface">\r\n    <div class="row container">\r\n        <h4>Please login using...</h4>\r\n    </div>\r\n    <div class="row">\r\n        <div class="col-xs-2" ng-repeat="idp in idps">\r\n            <div>\r\n                <a ng-href="{{idp.loginUrl}}">\r\n                    <img ng-src="{{idp.logo}}" class="img-responsive" style="max-width : 75%;" alt="{{idp.name}}">\r\n                </a>\r\n            </div>\r\n            <div>\r\n                <h5>\r\n                    <a ng-href="{{idp.loginUrl}}">{{idp.name}}</a>\r\n                </h5>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>');
  $templateCache.put('app/src/oauthlogin/menuItem.html', '<a href="#/ext/Login" style="white-space:normal;" ng-show="!loggedIn()">Login\r\n    <span class="glyphicon glyphicon-log-in pull-right"></span>\r\n</a>\r\n<a href="" ng-controller="LoginExtLogoutController" ng-click="logout()" style="white-space:normal;" ng-show="loggedIn()">Logout\r\n    <span class="glyphicon glyphicon-log-out pull-right"></span>\r\n</a>');
  $templateCache.put('app/src/shared/404.html', '<!-- 404 page -->\r\n<div class="container-fluid" id="Interface">\r\n    <div class="row">\r\n        <div class="col-md-4">\r\n            <h1>404 Page not found</h1>\r\n            <p>The requested page does not exist.</p>\r\n            <p><a class="btn btn-primary btn-lg" href="#/" role="button">Goto startpage</a></p>\r\n        </div>\r\n        <div>\r\n            <img src="app/images/404-image.png">\r\n        </div>\r\n    </div>\r\n</div>');
  $templateCache.put('app/src/shared/header.html', '<!-- by default no header -->');
  $templateCache.put('app/src/shared/welcome.html', '<!-- Home screen -->\r\n<div class="container-fluid" id="Interface">\r\n    <div class="jumbotron">\r\n        <h1>Hello, world!</h1>\r\n        <p>You\'ve successfully generated your Ampersand prototype.</p>\r\n        <p><a class="btn btn-primary btn-lg" href="https://ampersandtarski.gitbook.io/documentation" target="_blank" role="button">See our documentation &raquo;</a></p>\r\n    </div>\r\n</div>\r\n');
  $templateCache.put('app/src/shared/myNavTo/myNavToInterfaces.html', '<div ng-if="resource._ifcs_.length > 1" style="position:relative; display:inline-block; cursor: pointer;">\r\n    <a class="dropdown-toggle" data-toggle="dropdown"><ng-transclude></ng-transclude></a>\r\n    <ul class="dropdown-menu" role="menu">\r\n        <li ng-repeat="ifc in resource._ifcs_">\r\n            <a ng-href="#/{{ifc.id}}/{{resource._id_}}" target="{{target}}">{{ifc.label}}</a>\r\n        </li>\r\n    </ul>\r\n</div>\r\n<a ng-if="resource._ifcs_.length == 1" ng-href="#/{{resource._ifcs_[0].id}}/{{resource._id_}}" target="{{target}}"><ng-transclude></ng-transclude></a>\r\n<span ng-if="resource._ifcs_.length == 0 || resource._ifcs_ == undefined"><ng-transclude></ng-transclude></span>');
  $templateCache.put('app/src/shared/myNavTo/myNavToOtherInterfaces.html', '<!-- This menu includes the interface where the user currently is -->\r\n<div ng-if="resource._ifcs_.length" style="position:relative; display: inline-block;">\r\n    <button type="button" class="btn btn-xs dropdown-toggle" data-toggle="dropdown">\r\n        <span class="glyphicon glyphicon-menu-hamburger"></span>\r\n    </button>\r\n    <ul class="dropdown-menu dropdown-menu-right" role="menu">\r\n        <li ng-repeat="ifc in resource._ifcs_">\r\n            <a ng-href="#/{{ifc.id}}/{{resource._id_}}" target="{{target}}">{{ifc.label}}</a>\r\n        </li>\r\n    </ul>\r\n</div>');
}]);
//# sourceMappingURL=ampersand.js.map
