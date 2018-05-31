# Firebase Tools
A toolset to simplify common processes in Web Engineering when using Firebase as a platform. Developed at the University of Applied Sciences in Osnabrueck for the course Web Enginnering.

# Documentation

## General Usage

You can link the current version of the firebasetool library like this:

`<script src="https://cdn.jsdelivr.net/gh/winf-hsos/firebase-tools@0.70/src/firebase-tools.js"></script>`


## Login & Logout

The function `firebasetools.login()` tries to sign in a user. If you don't specify the parameters `email` and `password`, the function assumes that there exists the following two input fields from which to fetch the corresponding values:

```
<input type="text" id="email"></input>
<input type="password" id="password"></input>
```

Alternatively, you can pass the two parameters:

```
firebasetools.login(email, password);
```

As a third argument, you can pass a callback function that is called when something goes wrong:

```
firebasetools.login(email, password, handleError);

function handleError(error) {
    console.error(error);
}
```