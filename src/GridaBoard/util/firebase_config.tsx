import firebase from "firebase";

type FirebaseConfig = {
  apiKey: string,
  authDomain: string,
  projectId: string,
  databaseURL: string,
  storageBucket: string,
  messagingSenderId: string,
  appId: string,
  measurementId?: string
}
let cloudfunctionsUrl = "";
let firebaseConfig:FirebaseConfig = null;
let secondaryFirebaseConfig:FirebaseConfig = null;

if(window.firebaseSetting === "dev"){
  //neostudio staging(http://localhost:5001/neostudio-staging/us-central1/createEmail).  
  // cloudfunctionsUrl = "http://localhost:5001/neostudio-staging/us-central1";
  cloudfunctionsUrl = "https://us-central1-neostudio-staging.cloudfunctions.net";
  firebaseConfig = {
    apiKey: "AIzaSyD7Yh_sCRUO-vmsF5dURj5xOLBeP8ekVto",
    authDomain: "neostudio-staging.firebaseapp.com",
    databaseURL: "https://neostudio-staging.firebaseio.com",
    projectId: "neostudio-staging",
    storageBucket: "neostudio-staging.appspot.com",
    messagingSenderId: "382410551029",
    appId: "1:382410551029:web:9fa2a23bfc9c7e3f955fbc"
  };
  // //v2 test
  secondaryFirebaseConfig = {
    apiKey: "AIzaSyCQ7i4k-LLa4nEVv8zi9inyT7T68l0-1RI",
    authDomain: "gridaboard-v2-test.firebaseapp.com",
    projectId: "gridaboard-v2-test",
    databaseURL: "https://gridaboard-v2-test-default-rtdb.asia-southeast1.firebasedatabase.app/",
    storageBucket: "gridaboard-v2-test.appspot.com",
    messagingSenderId: "380346205591",
    appId: "1:380346205591:web:d1148a041c72a385dcf0d2",
    measurementId: "G-K6TXR3674W"
  };
}else{ //if(window.firebaseSetting === "live"){
  cloudfunctionsUrl = "https://us-central1-neonotes2-d0880.cloudfunctions.net";
  firebaseConfig = {
    apiKey: "AIzaSyAY7MrI37TvkDerHsShcvOsueDpi4TGihw",
    authDomain: "neonotes2-d0880.firebaseapp.com",
    databaseURL: "https://neonotes2-d0880.firebaseio.com",
    projectId: "neonotes2-d0880",
    storageBucket: "neonotes2-d0880.appspot.com",
    messagingSenderId: "693506452621",
    appId: "1:693506452621:web:8b6600b884b8822d",
    measurementId: "G-44CKW86QHE"
  };
 
  secondaryFirebaseConfig = {
    apiKey: "AIzaSyC4ma_RkypycwcVEXe4JNq5LijhYZxqz2Y",
    authDomain: "gridaboard.firebaseapp.com",
    databaseURL: "https://gridaboard.firebaseio.com",
    projectId: "gridaboard",
    storageBucket: "gridaboard.appspot.com",
    messagingSenderId: "1033649847481",
    appId: "1:1033649847481:web:1fd9dadea5c6432ef2af68",
    measurementId: "G-NKPH8TEGM6"
  };
}
//v2 dev
// const firebaseConfig = {
//   apiKey: "AIzaSyBZehYzHuEQM59oXiJVgXGigSTfKQeyDQQ",
//   authDomain: "gridaboard-v2-dev.firebaseapp.com",
//   projectId: "gridaboard-v2-dev",
//   storageBucket: "gridaboard-v2-dev.appspot.com",
//   messagingSenderId: "899078621847",
//   appId: "1:899078621847:web:4d8b9a562e57e737e1f7d2"
// };


// Initialize Firebase
const mainFirebase = firebase.initializeApp(firebaseConfig);
export const secondaryFirebase = firebase.initializeApp(secondaryFirebaseConfig, "secondary");
export const firebaseAnalytics = secondaryFirebase.analytics();




