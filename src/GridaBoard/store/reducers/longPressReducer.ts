import { store } from "../../client/pages/GridaBoard";

const SET_LONG_PRESS_PEN = 'SET_LONG_PRESS_PEN';
const SET_LONG_PRESS_IMPOSSIBLE = 'SET_LONG_PRESS_IMPOSSIBLE';

// 액션 생성 함수
export const setLongPressPen = (isLongPress) => {
  store.dispatch({
    type: SET_LONG_PRESS_PEN, isLongPress
  });
};

export const setLongPressImpossible = (impossible) => {
  store.dispatch({
    type: SET_LONG_PRESS_IMPOSSIBLE, impossible
  });
};

// 초기 상태
const initialState = {
  impossible: false,
  isLongPress: false,
};

// 리듀서
export default function longPressReducer(state = initialState, action) {
  switch (action.type) {
    case SET_LONG_PRESS_PEN:
      return {
        ...state,
        isLongPress: action.isLongPress
      };
    case SET_LONG_PRESS_IMPOSSIBLE:
      return {
        ...state,
        impossible: action.impossible
      };
    default:
      return state;
  }
}