import { store } from "../../client/pages/GridaBoard";
import {NeoDot} from "../../../nl-lib/common/structures";

const INCREMENT_TAP_COUNT = 'INCREMENT_TAP_COUNT';
const INITIALIZE_TAP_COUNT = 'INITIALIZE_TAP_COUNT';
const SET_FIRST_TAP = 'SET_FIRST_TAP';
const SET_LEFT_DIAGONAL = 'SET_LEFT_DIAGONAL';
const SET_RIGHT_DIAGONAL = 'SET_RIGHT_DIAGONAL';
const INITIALIZE_DIAGONAL = 'INITIALIZE_DIAGONAL';

// 액션 생성 함수
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
    type: SET_FIRST_TAP,
    firstDot: firstDot
  });
};

export const setLeftDiagonal = () => {
  store.dispatch({
    type: SET_LEFT_DIAGONAL
  });
};

export const setRightDiagonal = () => {
  store.dispatch({
    type: SET_RIGHT_DIAGONAL
  });
};

export const initializeDiagonal = () => {
  store.dispatch({
    type: INITIALIZE_DIAGONAL
  });
};

// 초기 상태
const initialState = {
  count: null,
  firstDot: null,
  leftDiagonal: false,
  rightDiagonal: false
};

// 리듀서
export default function tapReducer(state = initialState, action) {
  switch (action.type) {
    case INCREMENT_TAP_COUNT:
      return {
        ...state,
        count: state.count + 1
      };
    case INITIALIZE_TAP_COUNT:
      return {
        ...state,
        count: null,
        firstDot: null
      }
    case SET_FIRST_TAP:
      return {
        ...state,
        count: 1,
        firstDot: action.firstDot
      }
    case INITIALIZE_DIAGONAL:
      return {
        ...state,
        leftDiagonal: false,
        rightDiagonal: false
      }
    case SET_LEFT_DIAGONAL:
      return {
        ...state,
        leftDiagonal: true
      }
    case SET_RIGHT_DIAGONAL:
      return {
        ...state,
        rightDiagonal: true
      }
    default:
      return state;
  }
}