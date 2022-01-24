import React from "react";
import '../../styles/buttons.css';
import { useSelector, useDispatch } from 'react-redux';
import { setPointerTracer } from '../../store/reducers/pointerTracer';
import $ from "jquery";
import { RootState } from '../../store/rootReducer';
import { IconButton, makeStyles, SvgIcon, Theme, Tooltip, TooltipProps } from '@material-ui/core';
import GridaToolTip from "../../styles/GridaToolTip";
import getText from "../../language/language";
import SimpleTooltip from "../SimpleTooltip";

const pointerStyle = {
  marginLeft: "16px",
  padding: "8px"
  // backgroundColor: "white"
} as React.CSSProperties;

const GestureButton = () => {
  const isTrace = useSelector((state: RootState) => state.pointerTracer.isTrace)
  const dispatch = useDispatch();

  const setEnable = (sw: boolean) => {
    if (sw) {
      const $elem = $("#btn_gesture").find(".c2");
      $elem.addClass("checked");
      $('#btn_gesture').css('background', '#E8ECF5');
      $('#btn_gesture').css('borderRadius', '8px');
      $('#gesture_svg_icon').css('color', '#688FFF');
    } else {
      const $elem = $("#btn_gesture").find(".c2");
      $elem.removeClass("checked");
      $('#btn_gesture').css('background', 'none');
      $('#gesture_svg_icon').css('color', '#58627D');
    }
  }

  const onToggleGesture = () => {
    dispatch(setPointerTracer(!isTrace));
    setEnable(!isTrace);
  }

  setEnable(true);

  return (
    <IconButton id="btn_gesture" style={pointerStyle} onClick={() => onToggleGesture()}>
      {/* <GridaToolTip open={true} placement="left" tip={{
          head: "Trace Point",
          msg: "펜의 위치를 화면에 보여주는 버튼입니다.",
          tail: "단축키 Q로 선택가능합니다."
        }} title={undefined}> */}
        <SimpleTooltip title={getText("nav_pointer")}>
          <SvgIcon id="gesture_svg_icon" className="c2 checked">
          <path
            d="M12.677 2.408L14 .833V5h-3.5l1.456-1.733c-.371-.575-1.008-1.05-1.904-1.442C9.156 1.433 8.141 1.25 7 1.25c-1.134 0-2.156.183-3.052.575-.896.392-1.533.867-1.904 1.442L3.5 5H0V.833l1.323 1.575C1.848 1.667 2.618 1.092 3.64.65 4.655.208 5.775 0 7 0s2.345.208 3.36.65c1.022.442 1.792 1.017 2.317 1.758zM6.529 4.181A.283.283 0 016.797 4c.121 0 .229.073.27.181L8.121 7.02v1.173c.99.2 1.735 1.058 1.735 2.084v1.518c0 1.154.959 2.09 2.141 2.09 1.658 0 3.002 1.311 3.002 2.929V21H4V10.124c0-.911.632-1.679 1.492-1.908V7.02l1.037-2.838z"
          />
          </SvgIcon>
        </SimpleTooltip>
      {/* </GridaToolTip> */}
    </IconButton>
  );
}
export default GestureButton;