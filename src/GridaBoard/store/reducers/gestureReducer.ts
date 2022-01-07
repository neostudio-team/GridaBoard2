import { NeoDot } from "../../../nl-lib/common/structures";
import { store } from "../../client/pages/GridaBoard";

const SET_ACTIVATED_LONG_PRESSURE = 'SET_ACTIVATED_LONG_PRESSURE';
const SET_IS_LONG_PRESSURE = 'SET_IS_LONG_PRESSURE';

const INCREMENT_TAP_COUNT = 'INCREMENT_TAP_COUNT';
const INITIALIZE_TAP_COUNT = 'INITIALIZE_TAP_COUNT';
const SET_FIRST_TAP = 'SET_FIRST_TAP';

const INITIALIZE_DIAGONAL = 'INITIALIZE_DIAGONAL';
const SET_LEFT_TO_RIGHT_DIAGONAL = 'SET_LEFT_TO_RIGHT_DIAGONAL';
const SET_RIGHT_TO_LEFT_DIAGONAL = 'SET_RIGHT_TO_LEFT_DIAGONAL';

const SET_HIDE_CANVAS = 'SET_HIDE_CANVAS';

// 액션 생성 함수
export const setActivatedLongPressure = (activatedLongPressure: boolean) => {
  store.dispatch({
    type: SET_ACTIVATED_LONG_PRESSURE, activatedLongPressure
  });
};

export const setIsLongPressure = (isLongPressure: boolean) => {
  store.dispatch({
    type: SET_IS_LONG_PRESSURE, isLongPressure
  });
};

export const incrementTapCount = () => {
  store.dispatch({
    type: INCREMENT_TAP_COUNT
  });
};

export const initializeTapCount = () => {
  store.dispatch({
    type: INITIALIZE_TAP_COUNT
  });
};

export const setFirstTap = (firstDot: NeoDot) => {
  store.dispatch({
    type: SET_FIRST_TAP, firstDot
  });
};

export const setLeftToRightDiagonal = () => {
  store.dispatch({
    type: SET_LEFT_TO_RIGHT_DIAGONAL
  });
};

export const setRightToLeftDiagonal = () => {
  store.dispatch({
    type: SET_RIGHT_TO_LEFT_DIAGONAL
  });
};

export const initializeDiagonal = () => {
  store.dispatch({
    type: INITIALIZE_DIAGONAL
  });
};

export const setHideCanvas = (hideCanvas: boolean) => {
  store.dispatch({
    type: SET_HIDE_CANVAS, hideCanvas
  });
};

// 초기 상태
const initialState = {
  longPressure: {
    isLongPressure: true,
    activatedLongPressure: false,
  },
  doubleTap: {
    tapCount: 0,
    firstDot: null
  },
  crossLine: {
    leftToRightDiagonal: false,
    rightToLeftDiagonal: false
  },
  hideCanvas: false
};

// 리듀서
export default function gestureReducer(state = initialState, action) {
  switch (action.type) {
    case SET_ACTIVATED_LONG_PRESSURE:
      return {
        ...state,
        longPressure: {
          ...state.longPressure,
          activatedLongPressure: action.activatedLongPressure
        }
      };
    case SET_IS_LONG_PRESSURE:
      return {
        ...state,
        longPressure: {
          ...state.longPressure,
          isLongPressure: action.isLongPressure
        }
      };
    case INITIALIZE_TAP_COUNT:
      return {
        ...state,
        doubleTap: {
          tapCount: 0,
          firstDot: null
        }
      }
    case INCREMENT_TAP_COUNT:
      return {
        ...state,
        doubleTap: {
          ...state.doubleTap,
          tapCount: state.doubleTap.tapCount+1
        }
      };
    case SET_FIRST_TAP:
      return {
        ...state,
        doubleTap: {
          tapCount: 1,
          firstDot: action.firstDot
        }
      }
    case INITIALIZE_DIAGONAL:
      return {
        ...state,
        crossLine: {
          leftToRightDiagonal: false,
          rightToLeftDiagonal: false  
        }
      }
    case SET_LEFT_TO_RIGHT_DIAGONAL:
      return {
        ...state,
        crossLine: {
          ...state.crossLine,
          leftToRightDiagonal: true
        }
      }
    case SET_RIGHT_TO_LEFT_DIAGONAL:
      return {
        ...state,
        crossLine: {
          ...state.crossLine,
          rightToLeftDiagonal: true
        }
      }
    case SET_HIDE_CANVAS:
      return {
        ...state,
        hideCanvas: action.hideCanvas
      }
    default:
      return state;
  }
}