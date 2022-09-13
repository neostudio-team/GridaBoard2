import { makeStyles, Button, IconButton} from '@material-ui/core';
import { relative } from 'node:path';
import React, { useEffect, useState } from 'react';
import getText from "GridaBoard/language/language";
import { AccessTime, DeleteOutline, Add, MoreVert } from '@material-ui/icons';
import { showGroupDialog } from 'GridaBoard/store/reducers/listReducer';
import { showDropDown } from 'GridaBoard/store/reducers/listReducer';
import copylightLogo from "../copylight_logo.png";
import SideBanner from './component/dialog/detail/SideBanner';
const useStyle = makeStyles(theme=>({
  wrap : {
    background : theme.custom.white[50],
    borderRight: "1px solid " + theme.custom.grey[3],
    width : "321px",
    display : "flex",
    flexDirection: "column",
    position: "relative",
  },
  recentGroup : {
    marginTop : "16px",
    position : "relative",
    width : "320px",
    display: "flex",
    alignItems : "center",
    justifyContent : "center",
    flexDirection: "column",
    "& > div" : {
      paddingLeft : "8px",
      display: "flex",
      width: "100%",
      height : "56px",
      alignItems: "center",
      cursor : "pointer",
      "&:hover" : {
        backgroundColor: "rgba(18, 18, 18, 0.04)"
      },
      "& > *:first-child" : {
        margin: "16px",
        color : theme.custom.grey[4]
      },
      "& > *:nth-child(2)" : {
        fontStyle: "normal",
        fontWeight: "normal",
        fontSize: "16px",
        lineHeight: "19px",
        letterSpacing: "0.25px",
        height: "20px",
        color : theme.palette.text.primary
      }
    }
  },
  mainGroup : {
    position : "relative",
    width : "320px",
    display: "flex",
    alignItems : "center",
    flexDirection: "column",
    maxHeight: "calc(100% - 370px)",
    "& > div:first-child" : {
      paddingRight: "24px",
      paddingLeft: "32px",
      height : "48px",
      width : "100%",
      display: "flex",
      alignItems : "center",
      justifyContent : "space-between",
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      lineHeight: "19px",
      letterSpacing: "0.25px",
      
      color : theme.palette.text.disabled,
      fontSize: "14px",
      "&:hover" : {
        backgroundColor: ""
      },
    },
    "& > div.category" : {
      width : "320px",
      overflowY: "auto",
      position: "relative",
      "& > div" : {
        paddingRight: "24px",
        paddingLeft: "32px",
        height : "48px",
        width : "100%",
        display: "flex",
        alignItems : "center",
        justifyContent : "space-between",
        color : theme.custom.icon.mono[0],
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "normal",
        fontSize: "16px",
        lineHeight: "19px",
        letterSpacing: "0.25px",
        cursor : "pointer",
        "&:hover" : {
          backgroundColor: "rgba(18, 18, 18, 0.04)"
        },
      }
    }
  },
  addGroup: {
    border : "1px solid " + theme.custom.icon.mono[2],
    padding : "6px 4px",
    paddingRight : "13px",
    "& > span:first-child" : {
      textTransform: "initial",
      "&> *:first-child":{
        marginRight: "6px"
      }
    }
  },
  selected : {
    background : theme.custom.icon.blue[3],
    cursor : "context-menu !important",
    "&:hover" : {
      backgroundColor: theme.custom.icon.blue[3] + " !important"
    },
  },
  banner : {
    display: "flex",
    
    flexDirection: "column",
    bottom : "0px",
    width: "100%",
    position: "absolute",
    "& > .copylight" : {
      height: "70px",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      
      fontFamily: "Roboto",
      fontStyle: "normal",
      fontWeight: "normal",
      fontSize: "11px",
      lineHeight: "13px",
      /* identical to box height */

      letterSpacing: "0.25px",
      "& > span" : {
        marginLeft: "4px",
      }
    }
  }
}));
interface Props extends  React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  selected ?: string
  // categoryList ?: Array<{name:string, count:number}>,
  category ?: Array<any>,
  categoryKey ?: Array<string>
  selectCategory ?: (select:string|number)=>void,
  createCategory ?: (categoryName:string)=>void
}

const Leftside = (props : Props)=>{
  const classes = useStyle();
  const selected = props.selected;
  // const keyList = props.categoryKey;
  const category = [...props.category];
  /**
   * category Data
   * [Category Name, Order, Doc Count , DB Key]
   * 
   * #categoryData #카테고리 #카테고리 데이터
   */
  category.sort((a,b)=>a[1]-b[1]);
  // console.log(category);

  const selectCategory = (select)=>{
    if(select == selected) return ;

    props.selectCategory(select);
  }

  console.log(category)
  return (
    <div className={classes.wrap}>
      <div className={classes.recentGroup}>
        {["recent","trash"].map(el=>(
          <div key={el} onClick={e=>selectCategory(el)} className={selected === el? classes.selected : "" }>
            {el == "recent" ? <AccessTime /> : <DeleteOutline />}
            <span>{getText(`boardList_${el}`)}</span>
          </div>))}
      </div>
      <Liner />
      <div className={classes.mainGroup}>
        <div>
          <span>
            {getText("boardList_groupTitle")}
          </span>
          <Button className={classes.addGroup} variant="contained" color="secondary" disableElevation onClick={e=>{showGroupDialog({type:"newGroup"})}}>
            <Add />
            <span>{getText("boardList_add")}</span>
          </Button>
        </div>
        <div className="category">
          {category.map((el, idx)=>{
            if(el[1] == -1) return ;
            const title = el[3] === 0 ? getText("boardList_unshelved").replace("%d", el[2]) : el[0] + ` (${el[2]})`;
            return (
            <div key={el[1]} onClick={e=>selectCategory(el[3])} className={selected === el[3]? classes.selected : "" }>
              <span>{title}</span>
              {el[0] !== "Unshelved" ? (
                <IconButton onClick={(e)=>{
                  e.stopPropagation();
                  showDropDown({
                    type : "group",
                    event : e,
                    selected: el
                  });
                }}><MoreVert /></IconButton>
              ) : ""}
            </div>
            );
          })}
        </div>
      </div>
      <Liner />
      <div className={classes.banner}>
        <div className="banner">
          <SideBanner />
        </div>
        <div className="copylight">
          <img src={copylightLogo} alt=""/> 
          <span>© NEOLAB Convergence Inc. All Rights</span>
        </div>
      </div>
    </div>
  );
}

export default Leftside;




const LinerStyle = makeStyles(theme=>({
  default : {
    position: "relative",
    width : "320px",
    height : "33px",
    display: "flex",
    alignItems : "center",
    justifyContent : "center",
    "& > div" : {
      width: "264px",
      height : "1px",
      background : theme.custom.grey[3]
    }
  }
}));
type linerProps = {
  className ?: string
}
const Liner = (props : linerProps)=>{
  const classes = LinerStyle();
  return (<div className={`${classes.default} ${props.className}`}><div></div></div>)
}