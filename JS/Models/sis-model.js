/*
Base model for www.shocase.com Pieces I wrote the entire DataSource Class (lines 123 onwards) and a lot of the .ajax method
*/

//Create your namespace
SIS.namespace("SIS.Model");

//Define your namespace
(function (namespace) {

    ////////////////////////////////////
    //   Private variables
    ////////////////////////////////////
    //var __LOGGED_OUT__ = "__LOGGED_OUT__";
    var _rootScope;
    var _retryTime = 1; // Seconds
    var _retryAlertTime = 3; // Seconds
    var _retryCount = 0;
    var _retryTimeout;
    var _retryQueue = [];

    /*************************************
     * Default settings for the ajax function
     *      async: boolean,
     *      useVersionedAPI: boolean,
     *      type: string,
     *      contentType: string,
     * @private
     *************************************/
    var _defaults = {
        "async":           true,
        "useVersionedAPI": true,
        "type":            "GET",
        "processData":     true,
        "contentType":     'application/json; charset=UTF-8'
    };

    /*****************************************
     * Add URL Params to the URL String
     * This makes sure that all the params are escaped
     * @param url
     * @param params
     * @returns {*}
     * @private
     ******************************************/
    var _addParams = function (url, params) {
        if (!params) return url;

        var a = document.createElement('a');
        a.href = url;
        a.search += a.search.substring(0, 1) == "?" ? "&" : "?";
        a.search += $.param(params);

        return a.href;
    };

    /****************************************
     * Exception Handling for Web Service calls
     * @param value
     * @param backendCode
     * @param backedMessage
     * @constructor
     ******************************************/
    namespace.ModelException = function (message, code, backendRequest, backendResponse) {
        this.message = message;
        this.code = code;
        this.backendRequest = backendRequest;
        this.backendResponse = backendResponse;
    };

    /**
     * Set RootScope. Required for event propogation
     * @param $rootScope
     */
    namespace.setRootScope = function ($rootScope) {
        if ($rootScope && typeof $rootScope.$broadcast === "function") {
            _rootScope = $rootScope;
        }
    }

    /**
     * Get RootScope
     * @returns {*}
     */
    namespace.getRootScope = function () {
        return _rootScope;
    };

    /**
     * Trigger an event.
     * @usage
     * @param name  Event name
     * @param data... remaining arguments to be passed to listeners
     */
    namespace.$trigger = function (name, data) {
        var $rs = SIS.Model.getRootScope();
        if ($rs) {
            $rs.$broadcast.apply($rs, arguments);
            !$rs.$$phase && $rs.$apply();
        }
    };
    /************************************
     * Defines the context of the model
     * It should return  SIS.MARKETING_API_CONTEXT for marketing
     * or SIS.SEARCH_API_CONTEXT for search
     *
     * @returns {*}
     ************************************/
    namespace.getContext = function (context) {
        switch (context) {
            case 'marketing':
                return SIS.MARKETING_API_CONTEXT;

            case 'search':
                return SIS.SEARCH_API_CONTEXT;

            default:
                return SIS.MARKETING_API_CONTEXT;
        }
    };
    //TODO: See if we can combine both config methods

    /**
     * This creates an instance of the DataSource class. It is meant to serve as a means for providing
     * data to the model for network-dependant resources. A pool of available objects is automatically
     * maintained based on a specified buffer size.
     * @param options
     *      arrayFromResponse      (Function) takes in the raw response object from the ajax request and extracts the data array
     *      entityFromResponseItem (Function) takes in a raw item from an array and converts it into a model entity. Function must
     *                                        be idempotent in that it recognizes if the source is already a model entity
     *      callback               (Function) a function to be called when the instance is initialized and the first page of data
     *                                        has been loaded. Called with the DataSource instance as an argument.
     *      generateURLParams      (Function) A function that takes in the current page number, the data and the pool and returns
     *                                        an object containing all necessary query params
     *      pageSize               (Integer)  the number of objects to be added to the data with each call to nextPage.
     *      bufferSize             (Integer)  the minimum number of objects that can be in the data pool before
     *                                        more are fetched from the web service.
     *      paginated              (Boolean)  sets whether or not the web service handles pagination
     *      data                   (Array)    data to be seeded into the instance upon initialization
     *      deDupeId               (String)   a string representing a key within the data objects to be used for de-duplication.
     *                                        Responses don't always have 'id' key so its necessary to make it configurable
     *      totalKey               (String)   Specifies the name of the key inside the ajax response that contains a count of the
     *                                        total # of results, if any.
     *      url                    (String)   the relativeURL for the endpoint from which new data should be fetched
     *      //TODO: initialization inside of this and new one via method in model
     *
     * @returns {namespace.DataSource}
     *  nextPage (Function)
     *  addFromArray (Function)
     *  total (Integer)
     *  hasMore  (Boolean)
     *  inittied (Boolean)
     *  data (Array)
     * @constructor
     */

    namespace.DataSource = function (options) {
        var DEFAULTS = {
            'arrayFromResponse':      function (rawResponse) {
                return $.isArray(rawResponse) ? rawResponse : [rawResponse];
            },
            'entityFromResponseItem': function (rawItem) {
                return rawItem;
            },
            'generateURLParams':      function () {
                return {};
            },
            'pageSize':               50,
            'bufferSize':             75,
            'paginated':              true,
            'data':                   [],
            'deDupeId':               'id'
        };

        //PRIVATE VARS
        var _opts = $.extend(DEFAULTS, options),  //Extend the defaults with the configured options
            _dataSource = this,                   //reference to DS object to avoid ambiguity in using 'this'
            _currentPage = 0,                     //number of pages fetched
            _pool = [],                           //Buffer items stored to minimize percieved loading
            _deDuper = {},                        //Map to track IDs to prevent duplicates
            _moreToFetch = true,                  //Tracks whether or not we are still have items to fetch
            _emptied = true,                      //Flag for determining if the last call to next page met an empty pool
            _lastItem;                            //The last item fetched from the server.

        //PRIVATE METHODS
        var _init = function () {
            _dataSource.hasMore = true;           //Public property letting us know if there are more items available
            _dataSource.data = [];                //Public array of data objects
            _dataSource.fetching = false;         //Gate var to prevent more requests when one is pending

            //Seed the pool with any data passed in
            _opts.data.length && _dataSource.addFromArray(_opts.data);

            //Get the first page of data
            _fetchMore(_opts.callback);
        };

        //PUBLIC METHODS
        /**
         * Adds the next page's worth of objects into the data property of the instance. These items come
         * from the buffer pool, which will refill itself automatically in the background.
         * @returns {namespace.DataSource}
         */
        _dataSource.nextPage = function (skipApply) {
            if (!_dataSource.hasMore) return;

            //Grab the next set out of the pool
            _dataSource.data = _dataSource.data.concat(_pool.splice(0, _opts.pageSize));
            _emptied = !_pool.length;

            //If the pool is getting below the buffer size then get more from server.
            _opts.paginated && _pool.length < _opts.bufferSize && _moreToFetch && !_dataSource.fetching && _fetchMore();

            //Check if we're out of things to get
            _dataSource.hasMore = _moreToFetch || !!_pool.length;

            !skipApply && _opts.scope && _opts.scope.$apply();

            return _dataSource;
        };

        /**
         *
         * @param callback callback to execute once the fetch is done
         * @param initting whether this is the call to this method during init
         * @private
         */
        var _fetchMore = function (callback) {
            //We want to immediatly exit if we're in the middle of fetching or we
            //know there isn't any more data to fetch.
            if (!_moreToFetch || _dataSource.fetching) {
                !_dataSource.fetching && typeof callback === 'function' && callback(_dataSource);
                return;
            }

            _dataSource.fetching = true;
            namespace.ajax({
                'relativeURL': _opts.url + '?' + $.param(_opts.generateURLParams(_currentPage, _lastItem, _pool)),
                'success':     function (response) {
                    //Convert the raw response into the array we want
                    var items = _opts.arrayFromResponse(response);

                    //Track the total count if available
                    _dataSource.total = _opts.paginated ? _opts.totalKey ? response[_opts.totalKey] : undefined : items.length;

                    //Track the last fetched item
                    _lastItem = items ? _opts.entityFromResponseItem(items[items.length - 1]) : _lastItem;

                    //Figure out if there's possibly more to fetch later
                    _moreToFetch = _opts.paginated ? items && !!items.length : false;

                    //increment the page counter
                    items && items.length && _currentPage++;

                    //Add the fetched items to the buffer pool
                    _dataSource.addFromArray(items);
                    _dataSource.fetching = false;

                    //If we're initting we want to add in the first page's worth automatically
                    _emptied && _dataSource.nextPage(true);
                    _emptied = false;

                    _dataSource.initted = true;

                    _opts.scope && _opts.scope.$apply(function () {
                        typeof callback === 'function' && callback(_dataSource);
                    });
                },
                'error':       function (xhr, state, response) {
                    console.warn('error fetching data source:', response);
                    _dataSource.fetching = false;
                }
            });
        };

        /**
         * Adds an array of objects into the buffer pool, either at the beginning or end.
         * @param items (Array) an array of items to add to the pool
         * @param prepend (Boolean) whether the items should be added to the beginning or end of the pool
         * @returns {namespace.DataSource}
         */
        _dataSource.addFromArray = function (items, prepend) {
            if (!$.isArray(items)) return;
            var processedItems = [];
            items.forEach(function (item) {
                //Convert the raw item into a model entity
                item = _opts.entityFromResponseItem(item);
                //If we've seen this item before then ignore it
                if (!item || (_opts.deDupeId && _deDuper[item[_opts.deDupeId]]) || _deDuper[item]) return;
                //We haven't seen this item before so add it into the de-duper
                _deDuper[_opts.deDupeId && item[_opts.deDupeId] ? item[_opts.deDupeId] : item] = true;
                //Add it into our data
                processedItems.push(item);
            });
            //combine the new data and the old pool
            _pool = prepend ? processedItems.concat(_pool) : _pool.concat(processedItems);
            return _dataSource;
        };
        _init.call(this);
        return _dataSource;
    };

    /**************************************
     * Makes AJAX Calls. You pass in an options object, similar to
     * what we're accustomed to for $.ajax.
     * with a few additional things that are specific to us
     *
     * @see http://api.jquery.com/jQuery.ajax/
     *
     * @param options = {
     * @param options.async :true     //JQuery ajax async
     * @param options.context :       //String. The url is constructed as follows /$context/$version/relativeURL
     //overRide the getContext() method to change the context
     //or pass it explicitly
     *  @param options.useVersionedAPI: //Do we use the (e.g) /v1 prefix
     *  @param options.type:           //Jquery type
     *  @param options.error:           //Error function. (we additioonally pass in the namespace)
     *  @param options.success:        //Success function
     *  @param options.scope:          //Scope 'this' for the success/error functions.
     *  @param options.relativeURL:    //relative URL for the ajax call
     *  @param options.contentType:    //Jquery ajax content type
     *  @param options.processData:    //true/false whether or not jquery should process the data (false for multipart/form-data)
     *  @param options.data:           //The data payload that needs to be sent
     *  @param options.withCredentials: //do you want the withCredentials flag to be returned?
     *  @param options.isValidData:     // boolean check for data validity. If false, error callback is invoked
     *  @param options.doNotEnforceLogout:   // if true, Session logouts are ignored.
     *  @param options.doNotRetry:          // if true, request will not be retried
     *  @param options.urlParams        //list of params to be sent out for a HTTP get (e.g. {relativeURL:"abc" , urlParams}
     *
     *  }
     *************************************/
    namespace.ajax = function (options) {
        if (!options) {
            throw Error("ajax cannot be called without any arguments ");
        }
        if (!options.relativeURL) {
            throw Error("You need to pass in atleast a 'relativeURL' and a 'success' function");
        }
        var domain = options.domain || '';
        domain = domain.replace(/\/$/, "");
        var context = options.context || (this.getContext ? this.getContext() : _defaults.context);
        var prefix = ((context === "" || /^http/i.exec(context)) ? context : ((/^\//i.exec(context) ? "" : "/") + context));
        var useVersionedAPI = (typeof options.useVersionedAPI !== "undefined") ? options.useVersionedAPI : _defaults.useVersionedAPI;
        prefix = prefix + (useVersionedAPI ? "/" + SIS.API_VERSION : "");
        var url = domain + prefix + (/^\//.exec(options.relativeURL) ? options.relativeURL : "/" + options.relativeURL);
        url = _addParams(url, options.urlParams);
        var errorHandler = function (xhr, status, error) {

            var callback = options.error;
            var scope = options.scope || this;
            // var namespace = options.namespace || this;
            //is user logged out?
            if (error && !options.doNotEnforceLogout && (error.errorCode == 5003 || error.errorCode == 5007)) {
                //console.error("Unexpected Session Timeout:",SIS.AUTH_COOKIE_NAME, SIS.Utils.getCookie(SIS.AUTH_COOKIE_NAME));
                //console.error("Server Returned:", JSON.stringify(error), url);
                namespace.$trigger(SIS.BROADCAST_EVENTS.SHOW_LOGIN_MODAL, options);
            }
            if (typeof callback === 'function' && (xhr.status !== 0 || options.doNotRetry)) {
                if(options.networkFailureLogged) {
                    SISAX.trackEvent("network_connection_OK", SISAX.cats.NETWORK, {
                        'url': options.relativeURL
                    });
                }
                SIS.Utils.call(callback, this, xhr, status, error);
                if (scope && scope.$apply) {
                    scope.$apply();
                }
            } else if (xhr.status === 0) {
                // Network Connection Error - Log it! And remove the password...
                var trackingOptions = $.extend(true, {}, options);
                trackingOptions.data = typeof trackingOptions.data === 'string' ? trackingOptions.data.replace(/(?:&)(?:j_)?password=[^&]+/, '') : trackingOptions.data;

                if(!options.networkFailureLogged) {
                    SISAX.trackEvent("network_connection_error", SISAX.cats.NETWORK, {
                        "error":   'Network Connection Error',
                        'options': trackingOptions
                    });
                }

                // Add request to queue
                options.networkFailureLogged=true;
                _retryQueue.push(options);

                // Clear any existing timeouts
                clearTimeout(_retryTimeout);

                // Show countdown alert
                var _showAlert = function () {
                    if (!$('#alert.show').length) {
                        $('#alert').alert('show', 'error', 'Could not connect to ' + SIS.PRODUCT_NAME + '. Retrying... <a href="#" id="sis-alert-retry" class="sis-link">Retry</a>', -1);
                    }
                };

                // Retry ajax with existing options
                var retryAjax = function (e) {
                    e && e.preventDefault();
                    clearTimeout(_retryTimeout);
                    $('body').off('click', retryAjax);

                    // Empty the queue and retry the requests
                    for (var i = _retryQueue.length - 1; i >= 0; i--) {
                        namespace.ajax(_retryQueue.pop());
                    }
                    _retryCount++;
                };

                // Update the time countdown and retry automatically
                var startPoll = function () {
                    // Clear
                    clearTimeout(_retryTimeout);

                    _retryTimeout = setTimeout(function () {
                        startPoll();
                        retryAjax();
                        if (_retryCount >= _retryAlertTime) {
                            _showAlert();
                            _retryCount = 0;
                        }

                    }, _retryTime * 1000);
                };

                // Bind the link event once
                $('body').on('click', '#sis-alert-retry', retryAjax);

                // Start updating the time
                startPoll();
            } else {
                // TODO - Should this be removed in favor of the above case?
                console.error("SIS.Model: Generic Error while calling Web Service");
                console.error("SIS.Model: Generic Error: URL", xhr.sisURL);
                console.error("SIS.Model: Generic Error: XHR: Object: ", JSON.stringify(xhr));
            }
        };

        var completeHandler = function (xhr, status) {
            var callback = options.complete,
                scope = options.scope || this;

            if (typeof callback === 'function') {
                SIS.Utils.call(callback, this, xhr, status);
                if (scope && scope.$apply) {
                    scope.$apply();
                }
            }
        };
        var opts = {
            url:         url,
            data:        typeof options.data === 'object' && !options.data.append ? JSON.stringify(options.data) : options.data,
            type:        options.type || _defaults.type,
            beforeSend:  function (jqxhr, settings) {
                jqxhr.sisURL = url;
            },
            xhrFields:   {
                withCredentials: options.withCredentials !== undefined ? options.withCredentials : true
            },
            async:       (typeof options.async !== "undefined") ? options.async : _defaults.async, // Need User data before we can get portfolio and projects
            contentType: options.contentType !== undefined ? options.contentType : _defaults.contentType,
            processData: options.processData !== undefined ? options.processData : _defaults.processData,
            xhr:         function () {
                var xhr = jQuery.ajaxSettings.xhr();
                if (xhr instanceof window.XMLHttpRequest) {
                    xhr.upload.addEventListener('progress', options.progress, false);
                    xhr.upload.addEventListener('load', options.uploaded, false);
                }
                return xhr;
            },
            success:     function (data, status, xhr) {
                var callback = options.success;
                var scope = options.scope || this;

                //If Errors invoke Error Handler
                if ((data.errorCode && data.errorCode !== 0) || (String.toLowerCase(("" + xhr.getResponseHeader("Content-Type"))) === "text/html") || (typeof options.isValidData === 'function' ? !options.isValidData(data) : false)) {
                    //throw ModelException in the future
                    return SIS.Utils.call(errorHandler, scope, xhr, status, data);
                }

                //SUCCESS continue
                if (typeof callback === 'function') {
                    SIS.Utils.call(callback, scope, data, status, xhr);
                    if (scope && scope.$apply) {
                        scope.$apply();
                    }
                } else {
                    console.log("In Namespace:" + namespace + " returned data" + JSON.stringify(data));
                }

                // Hide network connection alert if shown
                if ($('#alert.show #sis-alert-retry').length) {
                    $('#alert').alert('hide');
                }

                //Analytics
                if(options.networkFailureLogged) {
                    SISAX.trackEvent("network_connection_OK", SISAX.cats.NETWORK, {
                        'url': options.relativeURL
                    });
                }
            },
            error:       errorHandler,
            complete:    completeHandler
        };
        return $.ajax(opts);
    };
})(SIS.Model);