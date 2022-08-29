import React, { useEffect, useState } from "react";
import {BrowserRouter} from "react-router-dom";
import App from "./App";


// const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
// export const store = createStore(rootReducer, composeEnhancers(applyMiddleware(thunk)));



const Root = () => {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}



export default Root;
