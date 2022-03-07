import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { Route } from 'react-router-dom';
import { Login, BoardList, GridaBoard, LoginCheck } from "./pages"
import { store } from '../client/pages/GridaBoard';
import BeforeGrida from './pages/BeforeGrida';

declare global {
  interface Window {
    firebaseSetting: "dev" | "live";
  }
}


const App = ()=>{
    /**
     * 커밋할 경우 true로 고정
     */
    const isOnlyGrida = false;
    if(isOnlyGrida){
        // 기본 경로를 그리다로 고정
        return (<div>
            <Route path="/" component={GridaBoard}/>
        </div>);
    }else{
        // 경로 옵션 사용하고 싶을떄
        return (<div style={{position:"relative", width:"100%", height:"100%"}}>
          <Provider store={store}>
            <Route exact path="/" component={Login}/>
            <Route exact path="/list" component={BoardList}/>
            <Route exact path="/app" component={GridaBoard}/>
            <Route exact path="/before" component={BeforeGrida}/>
          </Provider>
          <Route exact path="/loginCheck" component={LoginCheck}/>
        </div>);
    }
}

export default App;