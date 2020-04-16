/* Tools to facilitate common processes in Web Engineering
 * when using Firebase as the web apps backend */

/* global firebase, localStorage, Fingerprint2 */

var firebasetools = (function () {

    var app;

    var productsPath = 'products';
    var productRatingsPath = 'productratings';
    var userProductRatingsPath = 'userratings';
    var anonymousProductRatingsPath = 'anonymousratings';

    var initialize = function (config) {
        if (config.apiKey) {
            app = firebase.initializeApp(config);

            //_makeSureFirestoreWorks();
            console.info("Firebase app init complete");
        }
    }

    var setProductsPath = function (path) {
        productsPath = path;
    }

    /* Rates a product and sets a cookie to disallow duplicate ratings */
    var rateProductAnonymously = function (productId, rating) {

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

    var productExists = function (productId) {

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

    var getProductRating = function (productId) {

        var productRatingRef = firebase.database().ref(productRatingsPath + "/" + productId);
        return productRatingRef.once('value').then((pr) => {

            var productRating = pr.val();
            return productRating;
        });
    }

    /* This function assumes the username field has
     * the id #email and the password field #password */
    var login = function (email = null, password = null, errorCallback = null) {

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

    var logout = function (callback = null) {

        if (callback == null) {
            callback = function () {
                console.log("User successfully signed out.");
            }
        }

        firebase.auth().signOut().then(callback).catch(handleError);

        // Default error handler
        function handleError(err) {
            console.error(err);
        }

    }

    var loggedUser = function () {
        var user = firebase.auth().currentUser;

        if (user) {
            return user;
        }
        else {
            return "nobody";
        }
    }

    var onLoginChanged = function (callback) {
        firebase.auth().onAuthStateChanged(callback);
    }

    /* This function assumes the username field has
     * the id #email and the password field #password */
    var register = function (email = null, password = null, errorCallback = null, successCallback = null) {

        if (errorCallback == null)
            errorCallback = handleError;

        if (successCallback == null)
            successCallback = handleSuccess;

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

        firebase.auth().createUserWithEmailAndPassword(email, password).then(successCallback).catch(errorCallback);


        function handleSuccess(user) {
            console.dir(user);
            console.log("User with email >" + user.email + "< successfully registered!");
        }

        // Default error handler
        function handleError(err) {
            console.error("User registration error: " + err.message);
            return false;
        }
    }

    /* This function retrieves all items from the collection with 
     * the given name. */
    var getContentItems = function (collectionName, callback = null) {

        if (typeof collectionName == "undefined" || collectionName == null || collectionName.length == 0) {
            console.error("Error retrieving content items, no collection name given: " + collectionName);
        }

        var itemsRef = firebase.firestore().collection(collectionName);

        var itemsArray = [];

        return itemsRef.get()
            .then(items => {
                if (items.size == 0) {
                    console.error('Error retrieving content items. Collection >' + collectionName +
                        '< does not exist in database.');

                    if (callback !== null)
                        callback(null);

                    return [];
                }
                else {

                    items.forEach((item) => {
                        var newItem = item.data();
                        newItem.id = item.id;
                        itemsArray.push(newItem);
                    });

                    if (callback !== null)
                        callback(itemsArray);

                    return itemsArray;
                }
            })
            .catch((error) => { handleError(error, "getContentItems") });
    }

    /* This function listens to real-time updates on all items from the collection with 
     * the given name. Anytime the data changes, the callback is invoked. */
    var getContentItemsRealTime = function (collectionName, callback = null) {

        if (typeof collectionName == "undefined" || collectionName == null || collectionName.length == 0) {
            console.error("Error listening to content items, no collection name given: " + collectionName);
        }

        var itemsRef = firebase.firestore().collection(collectionName);

        itemsRef.onSnapshot(function (items) {
            var itemsArray = [];

            if (items.size == 0) {
                console.error('Error listenting to content items. Collection >' + collectionName +
                    '< does not exist in database.');

                if (callback !== null)
                    callback(null);

                return [];
            }
            else {

                items.forEach((item) => {
                    var newItem = item.data();
                    newItem.id = item.id;
                    itemsArray.push(newItem);
                });

                if (callback !== null)
                    callback(itemsArray);
            }

        }, (error) => { handleError(error, "getContentItems") });
    }

    /* This function add an item to the collection with the
     * given name */
    var addContentItem = function (collectionName, item, callback) {

        if (!_checkString(collectionName)) {
            console.error("Error adding content item, no collection name given: " + collectionName);
            return null;
        }

        if (!_checkObject(item)) {
            console.error("Error adding content item, no item to add was given: " + item);
            return null;
        }

        //_makeSureFirestoreWorks();

        var itemsRef = firebase.firestore().collection(collectionName);
        return itemsRef.add(item).then((newItemRef) => {

            item.id = newItemRef.id;

            return newItemRef.update({
                id: newItemRef.id
            })
                .then(function () {
                    callback(item);
                })
        }).catch((error) => { handleError(error, "addContentItem") });
    }

    /* This function updates an item in the collection */
    var updateContentItem = function (collectionName, itemId, item, callback) {

        if (!_checkString(collectionName)) {
            console.error("Error updating content item, no collection name given: " + collectionName);
            return null;
        }

        if (!_checkString(itemId)) {
            console.error("Error updating content item, no item ID given: " + itemId);
            return null;
        }

        if (!_checkObject(item)) {
            console.error("Error updating content item, no item to add was given: " + item);
            return null;
        }

        //_makeSureFirestoreWorks();

        return _contentItemExists(collectionName, itemId).then((exists) => {

            if (exists) {
                var itemRef = firebase.firestore().collection(collectionName).doc(itemId);
                return itemRef.update(item).then(callback).catch((error) => { handleError(error, "updateContentItem") });

            }
            else {
                console.error("Error updating content item, no item with ID found: " + itemId);
                return null;
            }

        })

    }

    /* This function removes an item from the collection with
     * the given id. */
    var removeContentItem = function (collectionName, itemId, callback) {

        if (!_checkString(collectionName)) {
            console.error("Error removing content item, no collection name given: " + collectionName);
            return null;
        }

        if (!_checkString(itemId)) {
            console.error("Error removing content item, no item id given: " + itemId);
            return null;
        }

        //_makeSureFirestoreWorks();

        return _contentItemExists(collectionName, itemId).then((exists) => {

            if (exists == true) {

                var itemRef = firebase.firestore().collection(collectionName).doc(itemId);
                return itemRef.delete().then(callback).catch((error) => { handleError(error, "removeContentItem") });
            }
            else {
                console.error("Error removing content item, no item with ID found: " + itemId);
                return null;
            }
        }).catch((error) => { handleError(error, "removeContentItem") });
    }

    /* This function creates or updates the user profile 
     * for the logged in user */
    var setUserProfile = function (profile) {

        var user = loggedUser();

        /* Only proceed if user is signed in */
        if (user !== "nobody") {

            profileExists(user.uid).then((exists) => {

                if (!exists) {
                    firebase.firestore().collection("users").doc(user.uid).set(profile)
                        .then(function () {
                            console.log("User profile successfully created!");
                        })
                        .catch(handleError);
                }
                else {
                    // TODO: Update profile
                    firebase.firestore().collection("users").doc(user.uid).update(profile)
                        .then(function () {
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

    /* This function retrieves the user profile from the firestore
     * Requires a logged in user, output an error to console otherwise */
    var getUserProfile = function (callback) {

        //_makeSureFirestoreWorks();

        var user = loggedUser();

        /* Only proceed if user is signed in */
        if (user) {
            var userRef = firebase.firestore().collection('users').doc(user.uid);

            return userRef.get()
                .then(doc => {
                    if (!doc.exists) {
                        console.warn('Warning: Profile for ' + user.email +
                            ' (UID: ' + user.uid + ') does not exist.');
                        callback({});
                        return {};
                    }
                    else {
                        callback(doc.data());
                        return doc.data();
                    }
                })
                .catch(handleError);
        }
        else {
            console.error("Error reading user profile: No user is signed in.");
        }

        function handleError(error) {
            console.error("Error reading user profile: " + error);
        }
    }

    /* This function checks if a profile for a userId exists */
    var profileExists = function (userId) {
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

    var updateDisplayName = function (displayName, callback) {

        var user = firebase.auth().currentUser;
        if (user) {
            user.updateProfile({
                displayName: displayName,
            }).then(function () {
                callback();
            }).catch(function (error) {
                console.error("Updating display name for user failed: " + error);
            });

        }
        else {
            console.error("Updating display name for user failed: No user logged in");
        }
    }

    var updatePhotoUrl = function (photoUrl, callback) {
        var user = firebase.auth().currentUser;
        if (user) {
            user.updateProfile({
                photoURL: photoUrl,
            }).then(function () {
                if (callback !== null)
                    callback();
            }).catch(function (error) {
                console.error("Error updating photo url for user: " + error);
            });

        }
        else {
            console.error("Error updating photo url for user: No user logged in");
        }
    }

    var uploadUserImage = function (file, callback) {

        if (typeof file == "undefined") {
            console.error("Error uploading user image: No file selected!");
            return;
        }

        if (!file.type.startsWith("image")) {
            console.error("Error uploading user image: Only image files allowed!")
            return;
        }

        if (file.type.endsWith("svg+xml")) {
            console.error("Error uploading user image: SVG is not allowed!")
            return;
        }

        var user = loggedUser();

        if (user) {

            var name = "userphotos/" + user.uid + "/" + file.name;
            var metadata = { contentType: file.type };
            var storageRef = firebase.storage().ref();

            storageRef.child(name).put(file, metadata).then((snapshot) => {



                snapshot.ref.getDownloadURL().then(function (downloadURL) {
                    console.log('Upload successful, see file at: ' + downloadURL);
                    updatePhotoUrl(downloadURL, null);
                    callback(snapshot, downloadURL);
                });


            });

        }
        else {
            console.error("Error uploading user image: No user logged in!");
        }
    }

    var uploadFile = function (path, file, callback) {

        if (typeof file == "undefined") {
            console.error("Error uploading file: No file selected!");
            return;
        }

        var user = loggedUser();

        if (user) {

            var name = path + "/" + file.name;
            var metadata = { contentType: file.type };
            var storageRef = firebase.storage().ref();

            storageRef.child(name).put(file, metadata).then((snapshot) => {

                snapshot.ref.getDownloadURL().then(function (downloadURL) {
                    console.log('Upload successful, see file at: ' + downloadURL);
                    callback(snapshot, downloadURL);
                });
            });

        }
        else {
            console.error("Error uploading file: No user logged in!");
        }
    }

    var sortArrayBy = function (arrayToSort, propertyName, asc = true) {

        return arrayToSort.sort(compare);

        function compare(a, b) {
            if (a[propertyName] < b[propertyName]) {
                return asc == true ? -1 : 1;
            }
            if (a[propertyName] > b[propertyName]) {
                return asc == true ? 1 : -1;
            }
            return 0;
        }
    }

    var filterArrayBy = function (arrayToFilter, propertyName, propertyValue) {

        return arrayToFilter.filter((item) => {
            return item[propertyName] == propertyValue;
        })
    }

    var getURLParameterByName = function (name, url) {

        // Take the current URL if none was given
        if (!url) url = window.location.href;

        name = name.replace(/[\[\]]/g, "\\$&");

        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);

        if (!results) return null;
        if (!results[2]) return '';

        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    function handleError(error, source) {
        console.error("Unexpected errror in function " + source + ": " + error.message);
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
            new Fingerprint2().get(function (result, components) {
                resolve(result);
            });
        });
    }

    function _makeSureFirestoreWorks() {
        // Required code for current version
        const settings = { timestampsInSnapshots: true };
        firebase.firestore().settings(settings);
    }

    /* This function checks if a content item exists */
    function _contentItemExists(collectionName, itemId, callback = null) {

        var itemRef = firebase.firestore().collection(collectionName).doc(itemId);

        return itemRef.get()
            .then(doc => {
                if (!doc.exists) {
                    //console.log('Item does not exist.');
                    if (callback !== null) {
                        callback(false);
                    }
                    return false;
                }
                else {
                    //console.log('Item found: ', doc.data());
                    if (callback !== null) {
                        callback(true);
                    }
                    return true;
                }
            })
            .catch(err => {
                console.log('Error checking existence of item:' + err);
                if (callback !== null) {
                    callback(false);
                }
                return false;
            });
    }

    function _checkObject(toCheck) {
        if (typeof toCheck == "object") {
            return true;
        }
        else return false;
    }

    function _checkInteger(toCheck) {
        if (isNaN(toCheck.parseInt())) {
            return false;
        }
        else return true;
    }

    function _checkDouble(toCheck) {
        if (isNaN(toCheck.parseFloat())) {
            return false;
        }
        else return true;
    }

    function _checkString(toCheck) {
        if (typeof toCheck !== "undefined" && toCheck !== null && toCheck.length !== 0)
            return true;
        else return false;
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
        getUserProfile: getUserProfile,
        uploadUserImage: uploadUserImage,
        uploadFile: uploadFile,

        // Dynamic Content
        getContentItems: getContentItems,
        getContentItemsRealTime: getContentItemsRealTime,
        addContentItem: addContentItem,
        updateContentItem: updateContentItem,
        removeContentItem: removeContentItem,

        // Products
        setProductsPath: setProductsPath,
        productExists: productExists,
        getProductRating: getProductRating,
        rateProductAnonymously: rateProductAnonymously,

        // Helper
        sortArrayBy: sortArrayBy,
        filterArrayBy: filterArrayBy,

        // URL
        getURLParameterByName: getURLParameterByName
    }

})();
