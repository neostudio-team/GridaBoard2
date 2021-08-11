import React from "react";
import { IconButton, IconButtonProps, makeStyles, SvgIcon, Theme, Tooltip, TooltipProps } from '@material-ui/core';
import { useSelector } from "react-redux";

import { RootState } from "GridaBoard/store/rootReducer";
import SimpleTooltip2 from "../SimpleTooltip2";
import { showAlert } from "../../store/reducers/listReducer";
import getText from 'GridaBoard/language/language';

const PageClearButton = (props: IconButtonProps) => {
  const activePageNo = useSelector((state: RootState) => state.activePage.activePageNo);

  const handlePageClearBtn = () => {
    if(activePageNo === -1) return ;

    showAlert({
      type: "clearPage",
      selected: null,
    })
  }

  return (
    <IconButton onClick={handlePageClearBtn} {...props} >
        <SimpleTooltip2 title={getText('sideMenu_clearPage')}>
          <SvgIcon width="21" height="19" viewBox="0 0 21 19">
            <path d="M17.4664 5.61525C17.2715 5.42021 17.0401 5.26548 16.7853 5.15991C16.5306 5.05434 16.2575 5 15.9817 5C15.7059 5 15.4328 5.05434 15.178 5.15991C14.9232 5.26548 14.6918 5.42021 14.4969 5.61525L10.1435 9.96881L16.0321 15.8552L20.3855 11.5016C20.779 11.1079 21 10.5742 21 10.0178C21 9.46136 20.779 8.92766 20.3855 8.53395L17.4664 5.61525ZM7.61517 12.4969L9.15456 10.9571L15.0418 16.8449L13.5024 18.3848C13.3075 18.5798 13.0761 18.7345 12.8213 18.8401C12.5665 18.9457 12.2934 19 12.0176 19C11.7418 19 11.4687 18.9457 11.214 18.8401C10.9592 18.7345 10.7278 18.5798 10.5329 18.3848L7.61517 15.466C7.22128 15.0723 7 14.5383 7 13.9815C7 13.4247 7.22128 12.8907 7.61517 12.4969Z" />
            <path d="M11.8182 4L0 4L0 6L11.8182 6L11.8182 4Z" />
            <path d="M7.63636 8L0 8L0 10L7.63636 10L7.63636 8Z"/>
            <path d="M15 0L0 0L0 2L15 2V0Z" />
            <path d="M4.45455 12H0L0 14H4.45455L4.45455 12Z" />
          </SvgIcon>
        </SimpleTooltip2>
      </IconButton>
  );
}

export default PageClearButton;