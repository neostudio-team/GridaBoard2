
import { combineReducers } from 'redux';
import activePageReducer from "./reducers/activePageReducer"

import authorizationReducer from './reducers/authorization';
import pointerTracer from './reducers/pointerTracer';
import rotate from './reducers/rotate';
import loadingCircle from './reducers/loadingCircle';
import viewFitReducer from './reducers/viewFitReducer';
import uiReducer from './reducers/ui';
import progressDlgReducer from "./reducers/progressDlgReducer";
import calibrationReducer from "./reducers/calibrationReducer";
import calibrationDataReducer from "./reducers/calibrationDataReducer";
import appConfigReducer from './reducers/appConfigReducer';
import docConfigReducer from './reducers/docConfigReducer';
import zoomReducer from './reducers/zoomReducer';
import listReducer from './reducers/listReducer';
import activePenReducer from './reducers/activePenReducer';
import gestureReducer from "./reducers/gestureReducer";
import ndpClient from './reducers/ndpClient';


const rootReducer = combineReducers({
  progress: progressDlgReducer,

  calibration: calibrationReducer,
  calibrationDataReducer,
  appConfig: appConfigReducer,
  docConfig: docConfigReducer,

  auth: authorizationReducer,
  ui: uiReducer,
  ndpClient: ndpClient,
  pointerTracer,
  rotate,
  loadingCircle,
  viewFitReducer,
  activePage: activePageReducer,
  activePen: activePenReducer,
  zoomReducer,
  list : listReducer,

  gesture: gestureReducer
});

export default rootReducer;

export type RootState = ReturnType<typeof rootReducer>;
