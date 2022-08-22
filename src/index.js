// import React from 'react';
// import ReactDOM from 'react-dom';
// import Root from './client/Root';
// import registerServiceWorker from './registerServiceWorker';
// import './index.css';

// ReactDOM.render(<Root />, document.getElementById('root'));
// registerServiceWorker();

import 'bootstrap/dist/css/bootstrap.css';
import "./index.css";
import "gridaConfig.js";

import React from 'react';
import ReactDOM from 'react-dom';
import Root from './GridaBoard/client/Root';
import './index.css';
import * as serviceWorker from './serviceWorker';

// import "./electron-starter.js";

ReactDOM.render(

    <Root />

  ,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

