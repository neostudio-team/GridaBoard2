import { store } from "../../client/pages/GridaBoard";

const SET_ACTIVATED_LONG_PRESSURE = 'SET_ACTIVATED_LONG_PRESSURE';
const SET_IS_LONG_PRESSURE = 'SET_IS_LONG_PRESSURE';

const INITIALIZE_DIAGONAL = 'INITIALIZE_DIAGONAL';
const SET_LEFT_TO_RIGHT_DIAGONAL = 'SET_LEFT_TO_RIGHT_DIAGONAL';
const SET_RIGHT_TO_LEFT_DIAGONAL = 'SET_RIGHT_TO_LEFT_DIAGONAL';

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

// 초기 상태
const initialState = {
  longPressure: {
    isLongPressure: true,
    activatedLongPressure: false,
  },
  crossLine: {
    leftToRightDiagonal: false,
    rightToLeftDiagonal: false
  }
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
    default:
      return state;
  }
}