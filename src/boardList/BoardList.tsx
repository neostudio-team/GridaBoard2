import React, { useEffect, useState } from 'react';
import { Link, NavLink, Redirect, useHistory } from 'react-router-dom';
import { AppBar, Button, makeStyles, MuiThemeProvider } from '@material-ui/core';
import { turnOnGlobalKeyShortCut } from 'GridaBoard/GlobalFunctions';
import Cookies from 'universal-cookie';
import { useDispatch, useSelector } from 'react-redux';
import GridaDoc from 'GridaBoard/GridaDoc';
import { InkStorage } from 'nl-lib/common/penstorage';
import * as neolabTheme from 'GridaBoard/theme';
import Header from './layout/Header';
import Leftside from './layout/Leftside';
import MainContent from './layout/MainContent';
import { setDate, setDocId, setDocName, setIsNewDoc } from '../GridaBoard/store/reducers/docConfigReducer';
import { RootState } from '../GridaBoard/store/rootReducer';
import { showGroupDialog, hideGroupDialog, changeGroup } from 'GridaBoard/store/reducers/listReducer';
import CombineDialog from './layout/component/dialog/CombineDialog';
import GlobalDropdown from './layout/component/GlobalDropdown';
import { getCategoryArray, setDefaultCategory, getDatabase } from "./BoardListPageFunc2"
import LoadingCircle from "GridaBoard/Load/LoadingCircle";
import { setLoadingVisibility } from 'GridaBoard/store/reducers/loadingCircle'
import { forceUpdateBoardList } from '../GridaBoard/store/reducers/appConfigReducer';
import { languageType } from 'GridaBoard/language/language';
import InformationButton from 'GridaBoard/components/buttons/InformationButton';
import HelpMenu, { setHelpMenu } from "GridaBoard/components/CustomElement/HelpMenu";
import { MappingStorage, PdfDocMapper } from '../nl-lib/common/mapper';
import NDP from "NDP-lib";

const useStyle = makeStyles(theme => ({
  mainBackground: {
    width: '100%',
    height: '100%',
    background: theme.palette.background.default,
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    display: 'flex',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    maxHeight: 'calc(100% - 72px)',
  },
  information : {
    right: "24px",
    bottom: "24px",
    display: "flex",
    position : "fixed",
    zIndex: 100,
    "& > button": {
      marginTop: "16px",
      boxShadow: "2px 0px 24px rgba(0, 0, 0, 0.15), inset 0px 2px 0px rgba(255, 255, 255, 1)",
      borderRadius: "50%",
      display: "block"
    }
  }
}));

const BoardList = () => {
  const cookies = new Cookies();
  const [theme, settheme] = useState(neolabTheme.theme);
  const [docsObj, setDocsObj] = useState({
    docs: [],
    category: [],
  });
  const [category, setCategory] = useState('recent');
  const userId = cookies.get('user_email');
  const dispatch = useDispatch();
  
  const history = useHistory();

  const updateCount = useSelector((state: RootState) => state.appConfig.updateCount);
  const isShowDialog = useSelector((state: RootState) => state.list.dialog.show);
  const isShowDropdown = useSelector((state: RootState) => state.list.dropDown.show);
  const isCategoryChange = useSelector((state: RootState) => state.list.isChange.group);
  const selectedCategory = useSelector((state: RootState) => state.list.dialog.selected);
  
  const categoryChange = async ()=>{
    const dataArr = await getCategoryArray();

    for (let i = 0; i < dataArr.length; i++) {
      dataArr[i][3] = i;
    }

    if(!isNaN(Number(category)) && Number(category) >= dataArr.length){
      setCategory((dataArr.length-1).toString());
    }
    if(selectedCategory){
      if(!isNaN(Number(selectedCategory[3])) && dataArr[selectedCategory[3]][1] === -1){
        setCategory("0");
      }
    }
    
    setDocsObj({
      ...docsObj,
      category: dataArr,
    });
    dispatch(forceUpdateBoardList());
  }
  
  useEffect(()=>{
    changeGroup(false);

    if(isCategoryChange){
      categoryChange();
    }
  },[isCategoryChange]);

  turnOnGlobalKeyShortCut(false);

  useEffect(() => {
    const getDb = async ()=>{
      const data = await getDatabase();
      if(data === false) return false;

      for (let i = 0; i < data.category.length; i++) {
          data.category[i][3] = i;
      }
      
      
      setDocsObj({
        docs: data.docs,
        category: data.category,
      });
    }
    if (userId !== undefined) {
      getDb();
    }
  }, [updateCount]);



  for (let i = 0; i < docsObj.category.length; i++) {
    docsObj.category[i][2] = 0;
  }
  for (let i = 0; i < docsObj.docs.length; i++) {
    const now = docsObj.docs[i];
    // console.log(docsObj.category, now);
    if (now.dateDeleted === 0) {
      docsObj.category[now.category][2] += 1;
    }
  }
 

  const selectCategory = (select: string) => {
    setCategory(select);
  };
  const classes = useStyle();
  
  if (userId === undefined) {
    //로그인으로 자동으로 넘기기
    useEffect(()=>{
      NDP.getInstance().onAuthStateChanged(async userId => {
        // user.email
        console.log(userId);
        if(userId !== null){
          //로그인 완료
          console.log("logined", userId);
          const expirationTime = new Date(NDP.getInstance().tokenExpired);
          cookies.set("user_email", userId, {
            expires: expirationTime
          });
          const user = await NDP.getInstance().User.getUserData();
          localStorage.GridaBoard_userData = JSON.stringify(user);
          dispatch(forceUpdateBoardList());
        } else {
          history.push("/");
        }
      });
    },[])
  }
  
  const firstHelp = cookies.get("firstHelp_2_1");
  
  if(!(firstHelp === "true")){//쿠키에 저장될때 문자열로 변환되어서 이렇게 검사해야함
    if(languageType == "ko") //한글만 준비되어 있음
      setHelpMenu(true, 2, 1);
  }


  return (
    <MuiThemeProvider theme={theme}>
      <HelpMenu />
      <div className={classes.mainBackground}>
        <AppBar position="relative" color="transparent" elevation={0}>
          <Header />
        </AppBar>
        <div className={classes.main}>
          {(languageType === "ko") ? <InformationButton className={classes.information} tutorialMain={2} tutorialSub={1} /> : ""}
          <Leftside selected={category} category={docsObj.category} selectCategory={selectCategory} />
          <MainContent selected={category} category={docsObj.category} docs={docsObj.docs} selectCategory={selectCategory}  />
        </div>
      </div>
      <LoadingCircle />
      <CombineDialog open={isShowDialog} docsObj={docsObj} />
      <GlobalDropdown open={isShowDropdown} category={docsObj.category} />
    </MuiThemeProvider>
  );
};

export default BoardList;