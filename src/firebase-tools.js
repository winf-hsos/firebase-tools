/* Tools to facilitate common processes in Web Engineering
 * when using Firebase as the web apps backend */

/* global firebase, localStorage, Fingerprint2 */

var firebasetools = (function() {

    var app;

    var productsPath = 'products';
    var productRatingsPath = 'productratings';
    var userProductRatingsPath = 'userratings';
    var anonymousProductRatingsPath = 'anonymousratings';


    var initialize = function(config) {
        if (config.apiKey) {
            app = firebase.initializeApp(config);
            console.info("Firebase app init complete");
        }
    }

    var setProductsPath = function(path) {
        productsPath = path;
    }

    /* Rates a product and sets a cookie to disallow duplicate ratings */
    var rateProductAnonymously = function(productId, rating) {

        if (app) {

            getFingerprint().then((fingerprint) => {

            });

            productExists(productId).then((product) => {

                if (product === false) {
                    console.error("Product with id >" + productId + "< does not exist.");
                    return;
                }

                // Get the current product rarting
                getProductRating(productId).then((productRating) => {

                    var updatedRating = {};

                    if (productRating !== null) {

                        updatedRating = productRating;
                        updatedRating.thumbsup += rating;
                        updatedRating.votes += 1;

                    }
                    else {
                        updatedRating.thumbsup = rating;
                        updatedRating.votes = 1;
                    }

                    firebase.database().ref(productRatingsPath + "/" + productId).set(updatedRating);

                    //console.dir(productRating);

                });

                console.info("Successfully rated product with id >" + productId + "<.");
            });
        }
        else
            console.error("Firebase not initialized.");
    }

    var productExists = function(productId) {

        // Check if product exists
        var productRef = firebase.database().ref(productsPath + "/" + productId);
        return productRef.once('value').then((p) => {
            var product = p.val();

            if (product === null) {
                return false;
            }
            else {
                return product;
            }
        });
    }

    var getProductRating = function(productId) {

        var productRatingRef = firebase.database().ref(productRatingsPath + "/" + productId);
        return productRatingRef.once('value').then((pr) => {

            var productRating = pr.val();
            return productRating;
        });
    }

    var onLoginChanged = function(callback) {
        firebase.auth().onAuthStateChanged(callback);
    }

    /* This function assumes the username field has
     * the id #email and the password field #password */
    var login = function(email = null, password = null, errorCallback = null) {

        if (errorCallback == null)
            errorCallback = handleError;

        if (email == null) {
            var emailField = document.getElementById("email");

            if (emailField !== null)
                email = emailField.value;
            else {
                console.error("Error when logging in: No field #email found and email was not provided as an argument!")
                return false;
            }
        }

        if (password == null) {
            var passwordField = document.getElementById("password")
            if (passwordField !== null)
                password = passwordField.value;
            else {
                console.error("Error when logging in: No field #password found and password was not provided as an argument!")
                return false;
            }
        }

        firebase.auth().signInWithEmailAndPassword(email, password).catch(errorCallback);

        return true;

        // Default error handler
        function handleError(err) {
            console.error("Login error: " + err.message);
        }

    }

    var logout = function(callback = null) {

        if (callback == null) {
            callback = function() {
                console.log("User successfully signed out.");
            }
        }

        firebase.auth().signOut().then(callback).catch(handleError);

        // Default error handler
        function handleError(err) {
            console.error(err);
        }

    }

    function setCookie(cookieName, cookieValue, expiresInDays) {
        var d = new Date();
        d.setTime(d.getTime() + (expiresInDays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
    }

    function getCookie(cookieName) {
        var name = cookieName + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    function getFingerprint() {
        return new Promise((resolve, reject) => {
            new Fingerprint2().get(function(result, components) {
                return result;
            });
        });
    }

    /* The functions exposed by this module */
    return {
        initialize: initialize,
        login: login,
        logout: logout,
        onLoginChanged: onLoginChanged,
        setProductsPath: setProductsPath,
        productExists: productExists,
        getProductRating: getProductRating,
        rateProductAnonymously: rateProductAnonymously
    }

})();
