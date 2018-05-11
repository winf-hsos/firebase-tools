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

        var fp;

        if (app) {

            getFingerprint().then((fingerprint) => {
                fp = fingerprint;

                hasVotedAlready(productId, fingerprint).then((hasVoted) => {

                    if (!hasVoted) {
                        rate();
                    }
                    else {
                        console.error("This computer has already voted for the product with id >" + productId + "<");
                        return;
                    }
                });
            });
        }
        else
            console.error("Firebase not initialized.");


        function rate() {
            productExists(productId).then((product) => {

                if (product === false) {
                    console.error("Error rating a product: product with id >" + productId + "< does not exist.");
                    return;
                }

                // Get the current product rating
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

                    var votees = updatedRating.votees;

                    if (typeof votees == "undefined") {
                        votees = {};
                        votees[fp] = true
                    }
                    else {
                        votees[fp] = true;
                    }

                    updatedRating.votees = votees;

                    firebase.database().ref(productRatingsPath + "/" + productId).set(updatedRating);

                });

                console.info("Successfully rated product with id >" + productId + "<.");
            });
        }

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

    var loggedUser = function() {
        var user = firebase.auth().currentUser;

        if (user) {
            return user;
        }
        else {
            return "nobody";
        }
    }

    var onLoginChanged = function(callback) {
        firebase.auth().onAuthStateChanged(callback);
    }

    /* This function assumes the username field has
     * the id #email and the password field #password */
    var register = function(email = null, password = null, errorCallback = null) {

        if (errorCallback == null)
            errorCallback = handleError;

        if (email == null) {
            var emailField = document.getElementById("email");

            if (emailField !== null)
                email = emailField.value;
            else {
                console.error("Error when registering user: No field #email found and email was not provided as an argument!")
                return false;
            }
        }

        if (password == null) {
            var passwordField = document.getElementById("password")
            if (passwordField !== null)
                password = passwordField.value;
            else {
                console.error("Error when registering user: No field #password found and password was not provided as an argument!")
                return false;
            }
        }

        firebase.auth().createUserWithEmailAndPassword(email, password).then((user) => {
            console.log("User with email >" + user.email + "< successfully registered!");
        }).catch(errorCallback);

        return true;

        // Default error handler
        function handleError(err) {
            console.error("User registration error: " + err.message);
        }
    }

    /* This function creates or updates the user profile 
     * for the logged in user */
    var setUserProfile = function(profile) {

        // Required code for current version
        const settings = { timestampsInSnapshots: true };
        firebase.firestore().settings(settings);

        var user = loggedUser();

        /* Only proceed if user is signed in */
        if (user) {

            profileExists(user.uid).then((exists) => {

                if (!exists) {
                    firebase.firestore().collection("users").doc(user.uid).set(profile)
                        .then(function() {
                            console.log("User profile successfully created!");
                        })
                        .catch(handleError);
                }
                else {
                    // TODO: Update profile
                    firebase.firestore().collection("users").doc(user.uid).update(profile)
                        .then(function() {
                            console.log("User profile successfully updated!");
                        })
                        .catch(handleError);
                }
            })

        }
        else {
            console.error("Error setting up user profile: No user is signed in.");
        }

        function handleError(error) {
            console.error("Error setting user profile: " + error);
        }
    }

    var profileExists = function(userId) {
        var userRef = firebase.firestore().collection('users').doc(userId);

        return userRef.get()
            .then(doc => {
                if (!doc.exists) {
                    console.log('Profile does not exist.');
                    return false;
                }
                else {
                    console.log('Profile found: ', doc.data());
                    return true;
                }
            })
            .catch(err => {
                console.log('Error checking existence of user profile:' + err);
                return false;
            });
    }

    var updateDisplayName = function(displayName, callback) {

        var user = firebase.auth().currentUser;
        if (user) {
            user.updateProfile({
                displayName: displayName,
            }).then(function() {
                callback();
            }).catch(function(error) {
                console.error("Updating display name for user failed: " + error);
            });

        }
        else {
            console.error("Updating display name for user failed: No user logged in");
        }
    }

    var updatePhotoUrl = function(photoUrl, callback) {
        var user = firebase.auth().currentUser;
        if (user) {
            user.updateProfile({
                photoURL: photoUrl,
            }).then(function() {
                callback();
            }).catch(function(error) {
                console.error("Updating photo url for user failed: " + error);
            });

        }
        else {
            console.error("Updating photo url for user failed: No user logged in");
        }
    }

    function hasVotedAlready(productId, fingerprint) {

        // Check if product exists
        var productRef = firebase.database().ref(productRatingsPath + "/" + productId + "/votees");
        return productRef.once('value').then((v) => {

            var votees = v.val();
            if (votees === null) {
                return false;
            }
            else {

                var keys = Object.keys(votees);
                return keys.some((v) => {
                    return v == fingerprint;
                })
            }
        });
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
                resolve(result);
            });
        });
    }

    /* The functions exposed by this module */
    return {
        initialize: initialize,

        // User
        login: login,
        logout: logout,
        loggedUser: loggedUser,
        onLoginChanged: onLoginChanged,
        register: register,

        // User Profile
        updateDisplayName: updateDisplayName,
        updatePhotoUrl: updatePhotoUrl,
        setUserProfile: setUserProfile,

        // Products
        setProductsPath: setProductsPath,
        productExists: productExists,
        getProductRating: getProductRating,
        rateProductAnonymously: rateProductAnonymously
    }

})();
