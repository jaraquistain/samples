/*
This is a service meant to handle alerts uniformly throughout the site. It reads information 
from the $location.search object whenever the route changes and displays an error as defined 
in the messageEnum or through paramertes passed into the call.
*/

//Create your namespace
SIS.namespace("SIS.Services.Alert");

//Define your namespace
(function (namespace) {
    namespace.service = function ($location, $rootScope) {
        /*-----------------------------------------------
         *  each code can have a handler with 4 params.
         *  @param message : Human readable message
         *  @param destination: "/login", "/signup"
         *  @param type: 'error', 'warning', 'success'. Overwrite default message type.
         *  @param delay: How long do you want to show this message (ms)
         ********************************************************************/
        var _messageEnum = {
            'error':   {
                'test':  { 'message': 'This is a test error message' },

                //GET errors
                'GE001': { 'message': 'The requested user was not found.', 'destination': '/people'},
                'GE002': { 'message': 'Error loading user profile.'},
                'GE003': { 'message': 'Error loading user projects.'},
                'GE004': { 'message': 'The requested company was removed or not found.', 'type': 'warning', 'destination': '/projects'},
                'GE005': { 'message': 'Could not validate email, please try again later.' },
                'GE006': { 'message': 'The requested project was removed or not found.', 'type': 'warning', 'destination': '/projects' },
                'GE007': { 'message': 'The requested article was not found.', 'destination': '/people'},

                //PUT errors
                'PE001': { 'message': 'Error changing email preferences. Please try again later'},
                'PE002': { 'message': 'Error changing name. Please try again later'},
                'PE003': { 'message': 'Error changing primary email. Please try again later'},
                'PE004': { 'message': 'Error removing email. Please try again later'},
                'PE005': { 'message': 'Error adding email. Please try again later'},
                'PE006': { 'message': 'Error changing password. Please try again later'},
                'PE007': { 'message': 'Could not {0} user. Please try again later'},
                'PE008': { 'message': 'Error sharing article. Please try again later'},

                //Failed action
                'AE003': { 'message': 'Error sending verification to: {0}. Please try again later.'},
                'AE004': { 'message': 'There was an error sending the invite. Please try again later.'},
                'AE005': { 'message': 'There was an error deleting the invite. Please try again later.'},
                'AE006': { 'message': 'Could not add team member(s). Please try again later.'},
                'AE007': { 'message': 'Could not save team member(s). Please try again later.'},
                'AE008': { 'message': 'Could not add user as an admin. Please try again later.'},
                'AE009': { 'message': 'Could not send out invites to banked team members. Please try again later.'},
                'AE010': { 'message': 'Could not create user. Please try again later'},
                'AE011': { 'message': 'Please enter a valid email address.'},
                'AE012': { 'message': 'Your contacts cannot be imported at this time. Please try again later.'},
                'AE013': { 'message': 'Your resume cannot be imported at this time. Please try again later.'},
                'AE014': { 'message': 'There was an error sending this invitation. Please try again later.'},
                'AE015': { 'message': 'Error claiming project.'},
                'AE016': { 'message': 'There was an error importing your LinkedIn profile. Please try again later.'},
                'AE017': { 'message': 'There was an error sending this message. Please try again later'},
                'AE018': { 'message': 'Error uploading file: {0}'},
                'AE019': { 'message': 'Error liking project. Please try again later.'},
                'AE020': { 'message': 'Error following. Please try again later.'},
                'AE021': { 'message': 'Error getting search results. Please try again later.'},
                'AE022': { 'message': 'Error liking {0}. Please try again later.'},
                'AE023': { 'message': 'This {0} has been removed.'},
                'AE023': { 'message': 'Could not delete post. Please try again later.'},
                'AE024': { 'message': 'Could not post comment. Please try again later.'},

                //Generic Warnings
                'W001':  { 'message': 'You cannot like a project on which you have collaborated.', 'type': 'warning'},
                'W002':  { 'message': 'This email is already associated with a ' + SIS.PRODUCT_NAME + ' account.'},
                'W003':  { 'message': 'Invalid email address or domain provided.' },
                'W004':  { 'message': 'The cover image for this project is still processing. Please try again later', 'type': 'warning'},
                'W005':  { 'message': 'You have already created an account. If you would like to update your account settings, please visit the Account Setting page.', 'type': 'warning'},

                //Server generated codes
                113:     { 'message': 'Your current password was incorrect'},
                107:     { 'message': 'New password must be different than current password'},
                5014:    { 'message': 'This user has already joined ' + SIS.PRODUCT_NAME + '.'},

                // Login Server Codes
                101:     {'message': "Your invitation link seems to be invalid. Please request an invite."},
                110:     {'message': "Your email address is invalid. Please check it and try again." },
                500:     {'message': "Your invitation link seems to be invalid. Please request an invite."},
                502:     {'message': "We could not locate your account. Please request an invitation."},
                503:     {'message': "This email address is already registered on Shocase. Please <a style='color:white;  font-size: 18px; padding-left: 12px;' href='#/login'>Log In</a>"},

                5000: {'message': "Your email is not on the Invitation list. Please contact <a style='color:white' href='mailto:customer-service@shocase.com'>customer-service@shocase.com</a>"},
                5001: {'message': "You do not have sufficient privileges to perform this operation."},
                5002: {'message': "Incorrect username or password."},
                5003: {'message': "Please login to your account"},
                5004: {'message': "Please create an account"},
                5005: {'message': "A verification email has been sent to your email address. Please click the link in your email to activate your account"},
                5006: {'message': "Please create an account"},
                5007: {'message': "Please login to your account"},
                5008: {'message': "Unknown Error occurred. Please login to your account again"},
                5009: {'message': "Unknown Error occurred. Please login to your account again"},
                5010: {'message': "Unknown Error occurred. Please login to your account again"},

                5109: {'message': 'The reset password link seems to be invalid. Please try again.'},

                // Login Client codes
                C100: { message: "Your email has been verified. Please log in to continue"},
                C101: { message: "Invalid token. A verification email has been resent to your email address."},
                C102: { message: "Your session has expired. Please login to continue."},
                C103: { message: "The reset password link seems to be invalid. Please try again."},
                C104: { message: "You do not seem to have an active account. Please try requesting an invite again."},
                C105: { message: "You already have an account. Please log in to continue"}
            },
            'success': {
                'test':  { 'message': 'This is a test success message' },

                //PUT successes
                'PS001': { 'message': 'You have successfully saved your email preferences'},
                'PS002': { 'message': 'You have successfully changed your name.'},
                'PS003': { 'message': 'You have successfully changed your primary email.'},
                'PS004': { 'message': 'You have successfully removed your email.'},
                'PS005': { 'message': 'You have successfully added your email.'},
                'PS006': { 'message': 'You have successfully changed your password.'},
                'PS007': { 'message': 'You have successfully reset your password.'},
                'PS008': { 'message': 'Your project was successfully updated.'},

                //Successful Action
                'AS001': { 'message': 'Successfully bootstrapped users.'},
                'AS002': { 'message': 'Successfully bootstrapped livefyre.'},
                'AS003': { 'message': 'Verification email sent to: {0}. Check that email and follow the instructions provided.'},
                'AS004': { 'message': 'You have successfully invited {0}'},
                'AS005': { 'message': 'You have successfully deleted {0}\'s invite' },
                'AS008': { 'message': '{0} has been successfully added as an admin to {1}'},
                'AS009': { 'message': 'All of your banked team members have successfully been invited to join Shocase.'},
                'AS010': { 'message': 'You have successfully created an account for {0}', 'destination': '/user/{0}'},
                'AS011': { 'message': 'You have successfully imported your {0} contacts.'},
                'AS012': { 'message': 'You have successfully removed your {0} contacts.'},
                'AS013': {
                    'message': 'Welcome to Shocase! <a style="color: white" href="#{0}&resetPassword=true' + '">Claim your account</a>',
                    'delay':   -1
                },
                'AS014': {
                    'message': 'Welcome to Shocase! <a style="color: white" href="#/resetPassword?{0}&returnCheck=isUserLoggedIn&returnPath={1}' + '">Claim your account</a>',
                    'delay':   -1
                },
                'AS015': { 'message': 'Your LinkedIn resume has successfully been imported.'},
                'AS016': { 'message': 'You have successfully invited {0} to join'}
            }
        };

        var _checkForAlert = function () {
            var search = $location.search(),
                params = [search.error, search.errorCode, search.errorMsg, search.messageContext];
            (search.error || search.errorCode || search.errorMsg || search.messageContext) && namespace.handleGenericNotification.apply(this, params);
        };

        //Handle showing notifications
        namespace.handleGenericNotification = function (e, eCode, eMsg, sCode, vars, urlVars) {

            //Remove the parameters from the URL
            if (e || eCode || eMsg || sCode) {
                $location.search('error', null).search('errorCode', null).search('errorMsg', null).search('messageContext', null);
                $location.replace();
            }

            //Construct the message data
            var messageData = {'delay': 3500},
                dataFromEnum;

            if (e || eCode || eMsg) {
                dataFromEnum = _messageEnum.error[eCode] || _messageEnum.error[e] || {};
                messageData.message = eMsg ? (!dataFromEnum.message ? 'Error: ' + (eCode || e) + ', message: ' : '') + eMsg : 'Error' + (e ? ': ' + e : eCode ? ' Code: ' + eCode : '');
                messageData.type = messageData.type || 'error';
            } else if (sCode) {
                dataFromEnum = _messageEnum.success[sCode] || {};
                messageData.message = 'Success context: ' + sCode;
                messageData.type = messageData.type || 'success';
            }

            $.extend(messageData, dataFromEnum);
            
            //Fill in vars if they were passed.
            $.isArray(vars) && urlVars.forEach(function(v, index){
                messageData.message = messageData.message.replace(new RegExp('\\{' + index + '\\}', 'g'), v);
            });

            //Fill in urlVars if they were passed.
            $.isArray(urlVars) && urlVars.forEach(function(urlVar, index){
                messageData.destination = messageData.destination.replace(new RegExp('\\{' + index + '\\}', 'g'), urlVar);
            });

            //Go to page if specified and show the alert
            messageData.destination && $location.path(messageData.destination);
            $('#alert').alert('show', messageData.type, messageData.message, messageData.delay);
        };

        //Check for any alerts on init
        _checkForAlert();

        //Listen for route changes to detect the search params
        $rootScope.$on('$locationChangeStart', function () {
            _checkForAlert();
        });

        return {
            'success': function (code, vars, urlVars) {
                namespace.handleGenericNotification(undefined, undefined, undefined, code, vars, urlVars);
            },
            'error':   function (code, vars, urlVars) {
                namespace.handleGenericNotification(undefined, code, undefined, undefined, vars, urlVars);
            },
            'hide':    function (callback) {
                $('#alert').alert('hide', callback);
            }
        };

    };
    namespace.service.$inject = ['$location', '$rootScope'];
})(SIS.Services.Alert);
