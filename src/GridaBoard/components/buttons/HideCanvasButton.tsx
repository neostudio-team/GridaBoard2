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

const HideCanvasButton = () => {
  const isTrace = useSelector((state: RootState) => state.pointerTracer.isTrace)
  const dispatch = useDispatch();

  const setEnable = (sw: boolean) => {
    if (sw) {
      const $elem = $("#btn_hidecanvas").find(".c2");
      $elem.addClass("checked");
      $('#btn_hidecanvas').css('background', '#E8ECF5');
      $('#btn_hidecanvas').css('borderRadius', '8px');
      $('#hidecanvas_svg_icon').css('color', '#688FFF');
    } else {
      const $elem = $("#btn_hidecanvas").find(".c2");
      $elem.removeClass("checked");
      $('#btn_hidecanvas').css('background', 'none');
      $('#hidecanvas_svg_icon').css('color', '#58627D');
    }
  }

  const onToggleGesture = () => {
    dispatch(setPointerTracer(!isTrace));
    setEnable(!isTrace);
  }

  setEnable(true);

  return (
    <IconButton id="btn_hidecanvas" style={pointerStyle} onClick={() => onToggleGesture()}>
      {/* <GridaToolTip open={true} placement="left" tip={{
          head: "Trace Point",
          msg: "펜의 위치를 화면에 보여주는 버튼입니다.",
          tail: "단축키 Q로 선택가능합니다."
        }} title={undefined}> */}
        <SimpleTooltip title={getText("nav_pointer")}>
          <SvgIcon id="hidecanvas_svg_icon" className="c2 checked">
          <path
            d="M2.052 11.684C2.073 11.617 4.367 5 12 5c7.633 0 9.927 6.617 9.949 6.684l.105.316-.106.316C21.927 12.383 19.633 19 12 19c-7.633 0-9.927-6.617-9.949-6.684L1.946 12l.106-.316zM4.074 12c.502 1.154 2.575 5 7.926 5 5.348 0 7.422-3.842 7.926-5-.502-1.154-2.575-5-7.926-5-5.348 0-7.422 3.842-7.926 5zm5.81-2.116A3.02 3.02 0 0112 9c1.641 0 3 1.359 3 3 0 1.642-1.359 3-3 3a3.02 3.02 0 01-3-3 3.02 3.02 0 01.884-2.116z"
          />
          </SvgIcon>
        </SimpleTooltip>
      {/* </GridaToolTip> */}
    </IconButton>
  );
}
export default HideCanvasButton;