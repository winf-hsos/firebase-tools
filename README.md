# Firebase Tools
A toolset to simplify common processes in Web Engineering when using Firebase as a platform. Developed at the University of Applied Sciences in Osnabrueck for the course Web Enginnering.

# Documentation

## General Usage

You can link the current version of the firebasetool library like this:

`<script src="https://cdn.jsdelivr.net/gh/winf-hsos/firebase-tools@0.80/src/firebase-tools.js"></script>`

## Function Overview

- **User Authentication**
    - `login(email, password, callback)`
    - `logout(callback)`
    - `loggedUser()` - Returns the currently signed in user object
    - `onLoginChanged(callback)` - Called when the authentication status changes
    - `register(email, password, errorCallback)`
    - `setUserProfile(profile)` - Sets the profile in Firestore for the currently signed in user
    - `getUserProfile()` - Gets the user profile from Firestore for the currently signed in user
    - `profileExists()` - Returns true if the currently signed in user has already a profile in Firestore
    - `updateDisplayName(displayName, callback)` - Updates the display name field in the Firebase user profile
    - `updatePhotoUrl(photoUrl, callback)`
     photo url

- **Firestore**
    - `getContentItems(collectionName, callback)`
    - `addContentItem(collectionName, item, callback)`
    - `updateContentItem(collectionName, itemId, item, callback)`
    - `removeContentItem(collectionName, itemId, callback)`
    
- **Storage**
    - `uploadFile(path, file, callback)`
    - `uploadUserImage(file, callback)` - Upload an image file to Firebase storage and sets the user's

- **Helper**
    - `sortArrayBy(arrayToSort, propertyName, asc = true)`
    - `filterArrayBy(arrayToFilter, propertyName, propertyValue)`
    - `getURLParameterByName(name, url)`
 

## Login & Logout

The function `firebasetools.login()` tries to sign in a user. If you don't specify the parameters `email` and `password`, the function assumes that there exists the following two input fields from which to fetch the corresponding values:

```html
<input type="text" id="email"></input>
<input type="password" id="password"></input>
```

Alternatively, you can pass the two parameters:

```js
firebasetools.login(email, password);
```

As a third argument, you can pass a callback function that is called when something goes wrong:

```js
firebasetools.login(email, password, handleError);

function handleError(error) {
    console.error(error);
}
```

## File Upload

### User Profile Image Upload

The function `firebasetools.uploadUserImage(image, callbackFinished)` lets us upload a user profile image. The following assumptions are made by the function to simplify:

- User images are stored in the folder `userphotos`
- Each user has a folder with the UID of the user as a subfolder of `userphotos`. E.g. `userphotos/DMpMS4IY5wauWoV4gOq6vC8lp4t2/`
- The function automatically sets the property `photoURL` of the Firebase Auth Profile after each successful image upload
- A user must be logged in to upload a profile image (you get an error on the console if not)

Let's assume you have a file input field in your HTML with the ID `#userImage`. Then, the following code does the upload for you:

```js
var image = document.getElementById("userImage").files[0];
firebasetools.uploadUserImage(image, uploadFinished);

function uploadFinished(snapshot, downloadUrl) {
    console.log("Image was uploaded to: " + downloadUrl);
}
```

### Generic File Upload