var GMS;

var GM={
  lastKeyPress: 0,
  star: null,
  getURL: function(){
    return document.popupNode.getAttribute('value');
  },
  addRemove: function(event){
    if (event.button==1){
      if (!this.removeGMark()){
        this.addGMark();
      }
    }
  },
  removeGMark: function(){
    var index;
    if ((index=GMS.isBookmarked(window.content.location.href))){
      GMS.onRemoveBookmark(index, true, false);
      this.star.className="star-off";
      return true;
    }
    return false;
  },
  quickAddGMark: function(title, url, label){
    var theUrl = url ? url : window.content.location.href;
    var docTitle = title ? title : window.content.document.title;
    var labels = label ? [label] : new Array();
    var notes=window.content.getSelection().toString();
    //createNewBookmark: function(aId, aURL, aTitle, aLabels, aNotes, aDate, aImage,
    var bkmk=GMS.createNewBookmark(null, theUrl, docTitle, labels, notes);
    this.star.className="star-on";
    GMS.updateBookmark(bkmk,true);
    GMS.sendUpdateBookmark(bkmk);
  },
  addGMark : function(title, url,label){
    var theUrl = url ? url : window.content.location.href;
    var docTitle = title ? title : window.content.document.title;
    var labels = label ? [label] : new Array();
    var notes=""//document.getSelection();
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
      getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Components.interfaces.nsIVersionComparator);
    var FF3 = (versionChecker.compare(appInfo.version, "3.0a") >= 0);
    if (prefs.getBoolPref('.ctrlD')==true && !FF3){
      var arg=new addGMarkArgs(docTitle,theUrl,labels,notes,1);
      window.openDialog("chrome://browser/content/bookmarks/addBookmark2.xul","","chrome,centerscreen,modal",arg);
    }
    else{
      this.editOK=false;
      window.openDialog("chrome://gmarks/content/editBookmark.xul","","chrome,centerscreen,modal",docTitle, theUrl,labels,notes,0,null,true);
      //if (this.editOK){
      //  GMS.updateBookmark(this.editBookmark,true);
      //  GMS.sendUpdateBookmark(this.editBookmark);
      //}
    }
  },
  _getTabInfo: function(){
    var tabList = [];
    var seenURIs = [];
    var browsers = getBrowser().browsers;
    for (var i = 0; i < browsers.length; ++i) {
      var webNav = browsers[i].webNavigation;
      var uri = webNav.currentURI;
      // skip redundant entries
      if (uri.spec in seenURIs)
        continue;
      // add to the set of seen URIs
      seenURIs[uri.spec] = true;
      tabList.push(uri);
    }
    return tabList;
  },
  addGMarks : function(title, url,label){
    var info = {
      action: "add",
      type: "folder",
      hiddenRows: ["description"],
      URIList: GM._getTabInfo()
    };
    PlacesUIUtils._showBookmarkDialog(info, true);
    return;  
    var theUrl = url ? url : window.content.location.href;
    var docTitle = title ? title : window.content.document.title;
    var labels = label ? [label] : new Array();
    var notes=""//document.getSelection();
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
      getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Components.interfaces.nsIVersionComparator);
    var FF = (versionChecker.compare(appInfo.version, "3.0a") >= 0);
    if (prefs.getBoolPref('.ctrlD')==true && !FF3){
      var arg=new addGMarkArgs(docTitle,theUrl,labels,notes,1);
      window.openDialog("chrome://browser/content/bookmarks/addBookmark2.xul","","chrome,centerscreen,modal",arg);
    }
    else{
      this.editOK=false;
      window.openDialog("chrome://gmarks/content/editBookmark.xul","","chrome,centerscreen,modal",docTitle, theUrl,labels,notes,0,null,true);
    }
  },
  onEditBookmark : function(bm) {
    bm=GMS.getBookmark(bm);
    this.editBookmark=bm;
    this.editOK=false;
    this.delBkmk=null;
    window.openDialog("chrome://gmarks/content/editBookmark.xul","","chrome,centerscreen,modal",bm.title, bm.url,bm.labels,bm.notes,bm.id,bm.mode,false);

  },
  onPageChange : function(event){
    if (window.content && window.content.location){
      var url=window.content.location.href;
      var index=GMS.isBookmarked(url);
      if (!GM.star || GM.star == null) GM.star=document.getElementById("GM-star");
      if (index && GM.star && GM.star != null){
        GM.star.className="star-on";
      }
      else if (GM.star){
        GM.star.className="star-off";
      }
    }
  },
  updateURL : function(url){
    bm=GMS.getBookmark(url);
    var newURL=window.content.location.href;
    GMS.onRemoveBookmark(bm,false);
    bm.url=newURL;
    GMS.updateBookmark(bm,true);
    GMS.sendUpdateBookmark(bm);
  },
  organizeGMarks: function(){
    window.open('chrome://gmarks/content/gmarksOrganize.xul','','chrome,resizable');
  },
  openOptions: function(){
    window.openDialog('chrome://gmarks/content/options.xul','','chrome,titlebar,toolbar,centerscreen,resizable');
  },
  manageOnline: function(){
    //dump("Mange Online\n");
    //dump("URL: "+GMS.manageOnlineURL+"\n");
    openUILinkIn(GMS.manageOnlineURL,"tab");
  },
  editFilters: function(){
    window.open("chrome://gmarks/content/editFilters.xul","","chrome,centerscreen,resizable");
  },
  signIn: function(){
    //dump("signin\n");
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
      getService(Components.interfaces.nsIPrefService).getBranch("gmarks.");
    var pass = GMS.getPassInfo();
    var username = {value: pass.user?pass.user:null};              // default the username to user
    var password = {value: pass.password?pass.password:null};              // default the password to pass
    var check = {value: prefs.getBoolPref("signin")};                   // default the checkbox to true
    var checktext = GMS.strbundle.GetStringFromName("autosignin");
    var title = GMS.strbundle.GetStringFromName("signintitle");
    var text = GMS.strbundle.GetStringFromName("enteruserandpass");
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(Components.interfaces.nsIPromptService);
    var result = prompts.promptUsernameAndPassword(null, title, text,
                                                   username, password, checktext, check);
    //dump("result: "+result+"|"+username.value+"|"+password.value+"|"+check.value+"\n");
    if (result){
      prefs.setBoolPref("signin",check.value);
      if (check.value){
        GMS.savePassInfo(username.value,password.value);
      }
      var sidebar = document.getElementById("sidebar");
      if (sidebar){
        try{
          sidebar.contentDocument.getElementById("signedOffContainer").setAttribute("hidden","true");
        }catch(e){

        }
      }

      GMS.onSignIn(false,username.value,password.value);
    }
  },
  observer: {
    observe: function(subject, topic, data) {
      try{
        if (topic=="star-change"){
          this.star=document.getElementById("GM-star");
          if (data=="on"){
            this.star.className="star-on";
          } else {
            this.star.className="star-off";
          }
        }
        else if (topic=="gmarks-onload"){
          insertInToolbar();
          initGMarksMenu()
        }
        else if (topic="gmarks-quickrefresh" || topic=="gmarks-onrefresh" || topic=="gmarks-refreshttoolbar"){
          insertInToolbar(data);
          initGMarksMenu()
        }
        else if (topic=="gmarks-updateToolbarImage"){
          var pos=data.indexOf("\n");
          var id=data.substring(0,pos);
          var img=data.substring(pos+2);
          document.getElementById("gmBkmk_"+id).setAttribute("image",img);
        }
        else if (topic=="gmarks-url-added"){
          //dump("urladded: "+data+"\n");
          if (data==window.content.location){
            this.star=document.getElementById("GM-star");
            this.star.className="star-on";
          }
        }
        else if (topic=="gmarks-url-removed"){
         //dump("urlremoved: "+data+"\n");
         if (data==window.content.location){
            this.star=document.getElementById("GM-star");
            this.star.className="star-off";
         }
        }
      }
      catch(e){}
    },
    register: function() {
      var observerService = Components.classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);
      observerService.addObserver(this, "star-change", false);
      observerService.addObserver(this, "gmarks-onrefresh", false);
      observerService.addObserver(this, "gmarks-quickrefresh", false);
      observerService.addObserver(this, "gmarks-refreshtoolbar", false);
      observerService.addObserver(this, "gmarks-onload", false);
      observerService.addObserver(this, "gmarks-updateToolbarImage", false);
      observerService.addObserver(this, "gmarks-url-added", false);
      observerService.addObserver(this, "gmarks-url-removed", false);
    },
    unregister: function() {
      var observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
      observerService.removeObserver(this, "star-change");
      observerService.removeObserver(this, "gmarks-onrefresh");
      observerService.removeObserver(this, "gmarks-quickrefresh");
      observerService.removeObserver(this, "gmarks-onload");
      observerService.removeObserver(this, "gmarks-refreshtoolbar");
      observerService.removeObserver(this, "gmarks-updateToolbarImage");
      observerService.removeObserver(this, "gmarks-url-added");
      observerService.removeObserver(this, "gmarks-url-removed");
    }
  },
  doSearch: function(event){
    var d=new Date();
    var time=d.valueOf();//*1000+d.getMilliseconds();
    if (time-GM.lastKeyPress< 700 && time-GM.lastKeyPress>5){
      for (var p in event){
        if (p.toString().substring(0,7)=="DOM_VK_" && event[p]==event.keyCode){
          GMS.qsKey=p.toString().substring(7,8)+p.toString().substring(8).toLowerCase();
          break;
        }
      }
      window.openDialog("chrome://gmarks/content/quicksearch.xul","","chrome,hidechrome,titlebar=no,top="+((screen.height/2)-200)+
        ",left="+(screen.width/2-200));
    }
    else
      GM.lastKeyPress=time;
  },
  handleKeyUp: function(event){
    if (GMS.qsKeyCode>0 && GMS.qsKeyCode==event.keyCode && event.keyCode>0){
      GM.doSearch(event);
    }
    else
      GM.lastKeyPress=0;
  },
  starMouseMove: function(isIn){
    if (GM.star){
      if (GM.star.className=='star-on'){
        GM.star.className='star-off';
      }
      else{
        GM.star.className='star-on';
      }
    }
  }
}

function GMarks_isFF3(){
  var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                      .getService(Components.interfaces.nsIXULAppInfo);
  var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                 .getService(Components.interfaces.nsIVersionComparator);
  var FF3 = (versionChecker.compare(appInfo.version, "3.0a") >= 0);
  return FF3;
}
function doGMarksLoad(event){
  GMS=Components.classes["@mozilla.org/gmarks;1"]
          .getService(Components.interfaces.nsIGMarksService).wrappedJSObject;
  GM.star=document.getElementById("GM-star");
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].
      getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
  
  initGMarksMenu();
  prefs = Components.classes["@mozilla.org/preferences-service;1"].
               getService(Components.interfaces.nsIPrefService).getBranch("gmarks.");
  var key_open=document.getElementById("key_GMOpenSidebar");//
  if (key_open==null){
     var keys=document.getElementsByTagName("key");
     for (var i=0;i<keys.length;i++){
       var k=keys[i].getAttribute('id');
       if (k=="key_GMOpenSidebarr"){
         key_open=keys[i];
         break;
       }
     }
  }
  if (key_open!=null){
    key_open.setAttribute('key',prefs.getCharPref('keys.sidebar.key'));
    key_open.setAttribute('modifiers', prefs.getCharPref('keys.sidebar.modifiers'));
  }
  if (GMarks_isFF3 && prefs.getBoolPref("ctrlD")){
    var addbkmk = document.getElementById("Browser:AddBookmarkAs");
    addbkmk.setAttribute("oncommand","GM.addGMark()");
  }
  var gmarks_tbox = getBrowser().mTabBox;
  gmarks_tbox.addEventListener("load", GM.onPageChange, true);
  gmarks_tbox.addEventListener("select", GM.onPageChange, true);
  gmarks_tbox.addEventListener("pageshow", GM.onPageChange, true);
  document.getElementById("cmd_CustomizeToolbars").addEventListener("DOMAttrModified", function(aEvent) {
    if (aEvent.attrName == "disabled" && !aEvent.newValue) {
      insertInToolbar();
    }
  }, false);
  GM.observer.register();
  insertInToolbar();
}
function initGMarksMenu(){
  //dump("initGMarksMenu\n");
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].
      getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
  var label = "";
  var menu=document.getElementById("gmarksMenu");
  if (!menu) return;
  label = menu.getAttribute("name");
  if (prefs.getBoolPref(".menu.hidden")){
    menu.setAttribute("hidden","true");
    return;
  }
  if (prefs.getBoolPref(".menu.hidebookmarks")){
    var bmenuID=GMarks_isFF3?"bookmarksMenu":"bookmarks-menu";
    var bmenu = document.getElementById(bmenuID);
    bmenu.hidden=true;
    bmenu.setAttribute("hidden","true");
    if (prefs.getBoolPref(".menu.rename")){
      label = bmenu.getAttribute("label");
    }
  }
  menu.setAttribute("label",label);
  menu.label = label;
  var itemIDs=prefs.getCharPref(".menu.items").split(",");
  if (itemIDs.length==0) return;
  var popup=document.getElementById("gmarksMenuPopup");
  /* clear old items */
  while (popup.lastChild) popup.removeChild(popup.lastChild);
  itemIDs.forEach(function(id,idx,arr){
    try{
    var ele=null;
    switch(id){
      case "addeditbookmark":
        ele=document.createElement("menuitem");
        ele.setAttribute("id","gmarks_menu_"+id);
        ele.setAttribute("oncommand","GM.addGMark();");
        break;
      case "bookmarktabs":
        ele=document.createElement("menuitem");
        ele.setAttribute("id","gmarks_menu_"+id);
        ele.setAttribute("oncommand","GM.addGMarks();");
        break;
      case "removebookmark":
        ele=document.createElement("menuitem");
        ele.setAttribute("id","gmarks_menu_"+id);
        ele.setAttribute("oncommand","GM.removeGMark();");
        break;
      case "organize":
        ele=document.createElement("menuitem");
        ele.setAttribute("id","gmarks_menu_"+id);
        ele.setAttribute("oncommand","GM.organizeGMarks();");
        break;
      case "gotosite":
        ele=document.createElement("menuitem");
        ele.setAttribute("id","gmarks_menu_"+id);
        ele.setAttribute("oncommand","GM.manageOnline();");
        break;
      case "options":
        ele=document.createElement("menuitem");
        ele.setAttribute("id","gmarks_menu_"+id);
        ele.setAttribute("oncommand","GM.openOptions();");
        break;
      case "editfilters":
        ele=document.createElement("menuitem");
        ele.setAttribute("id","gmarks_menu_"+id);
        ele.setAttribute("oncommand","GM.editFilters();");
        break;
      case "refresh":
        ele=document.createElement("menuitem");
        ele.setAttribute("id","gmarks_menu_"+id);
        ele.setAttribute("oncommand","GMS.getBookmarksFeed('onrefresh',true);");
        break;
      case "mostrecent":
        if (GMS.recent.length>0){
          ele=document.createElement("menu");
          ele.setAttribute("id","gmarks_menu_"+id);
          ele.className="bookmark-item menu-iconic";
          ele.setAttribute("container","true");
          ele.setAttribute("query","true");
          ele.appendChild(createFolderItem(GMS.recent));
        }
        break;
      case "mostused":
        if (GMS.frequent.length>0){
          ele=document.createElement("menu");
          ele.setAttribute("id","gmarks_menu_"+id);
          ele.className="bookmark-item menu-iconic";
          ele.setAttribute("container","true");
          ele.setAttribute("query","true");
          ele.appendChild(createFolderItem(GMS.frequent));
        }
        break;
      case "bookmarkstree":
        //dump("bookmarkstree: "+GMS.isSignedIn+"\n");
        if (GMS.isSignedIn){
          var bkmks=getTreeData("",false,"menu");
          for (var i=0;i<bkmks.length;i++){
            var btn;
            if (bkmks[i].type==0){//Its a folder!
              btn=document.createElement('menu');
              btn.setAttribute('value',bkmks[i].fullTitle)
              btn.setAttribute('label',bkmks[i].title);
              btn.className="bookmark-item menu-iconic";
              btn.setAttribute("container","true");
              btn.addEventListener('click',function(event){
                if (event.button==1){
                  var url=event.target.getAttribute('value');
                  openGMarkLabelInTabs(event);
                }
              },false);
              btn.appendChild(createFolderItem(bkmks[i].data));
              btn.setAttribute('context',"gm-labelPopup");
            }
            else{
              btn=createBookmarkItem('menuitem',bkmks[i]);
            }
            popup.appendChild(btn);
          }
        }
        else{
          id = "signin";
          var ele = document.createElement("menuitem");
          ele.setAttribute("id","gmarks_menu_signin");
          ele.setAttribute("oncommand","GM.signIn();");
        }
        break;
      case "separator":
        ele=document.createElement("menuseparator");
        ele.setAttribute("class","groove");
        break;
    }
    if (ele){
      if (id!="separator" && id!="bookmarkstree")
        ele.setAttribute("label",GMS.strbundle.GetStringFromName(id));
      popup.appendChild(ele);
    }
    }
    catch(e){
      dump("error in menu loop:\n"+e+"\n");
    }
  });
  //dump("gmarks menu complete\n");
}
function insertInToolbar(data){
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].
      getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
  try{
    GMS.toolbarFolder=prefs.getComplexValue(".toolbarFolder",
          Components.interfaces.nsISupportsString).data;
  }
  catch(e){
    if (prefs.prefHasUserValue(".toolbarFolder"))
      GMS.toolbarFolder=prefs.getCharPref(".toolbarFolder");
  }
  if (!GMS)
    GMS=Components.classes["@mozilla.org/gmarks;1"]
                     .getService(Components.interfaces.nsIGMarksService).wrappedJSObject;
  gmarksToolbar=document.getElementById("gmarksToolbar");
  if (gmarksToolbar){
    gmarksToolbar.setAttribute('value',GMS.toolbarFolder);
    for (var i=gmarksToolbar.childNodes.length-1;i>=0;i--){
      gmarksToolbar.removeChild(gmarksToolbar.childNodes[i]);
    }
    var bkmks=getTreeData(GMS.toolbarFolder,true);
    if (bkmks && bkmks.length>0){
      if (GMS.toolbarFolder==""){
        var btn=document.createElement('toolbarbutton');
        btn.setAttribute('type','menu');
        btn.setAttribute('label',"Bookmarks");
        btn.setAttribute('show-text','always');
        btn.className="gmarks-personalfolder-all";
        btn.appendChild(createFolderItem(bkmks));
        gmarksToolbar.appendChild(btn);
      }
      else{
        for (var i=0;i<bkmks.length;i++){
          var btn;
          if (bkmks[i].type==0){//Its a folder!
            btn=document.createElement('toolbarbutton');
            btn.setAttribute('type','menu');
            btn.setAttribute('value',bkmks[i].fullTitle)
            if (!GMS.toolbarShowIconsOnly)
              btn.setAttribute('label',bkmks[i].title);
            if (!GMS.toolbarShowIconsOnly)
              btn.setAttribute('show-text','always');
            else{
              btn.setAttribute('show-text','never');
              btn.setAttribute('tooltiptext',bkmks[i].title);
            }
            if (GMS.showIcons)
              btn.className="gmarks-personalfolder";
            else
              btn.className="gmarks-personalfolder-all";
            btn.addEventListener('click',function(event){
              if (event.button==1){
                var url=event.target.getAttribute('value');
                openGMarkLabelInTabs(event);
              }
            },false);
            btn.appendChild(createFolderItem(bkmks[i].data));
            btn.setAttribute('context',"gm-labelPopup");
          }
          else{
            btn=createBookmarkItem('toolbarbutton',bkmks[i]);
          }
          gmarksToolbar.appendChild(btn);
        }
      }
    }
  }
}

function createBookmarkItem(elementType,bkmk){
  var btn=document.createElement(elementType);
  btn.setAttribute('id',"gmBkmk_"+bkmk.id);
  if (!(GMS.toolbarShowIconsOnly && elementType=="toolbarbutton"))
    btn.setAttribute('label',bkmk.title);
  btn.setAttribute('value',bkmk.url);
  if (GMS.showIcons){
    //if (elementType=="menuitem"){
      btn.className="menuitem-iconic bookmark-item";//gmarks-personalbkmk
    //}else
    //  btn.className="gmarks-personalbkmk";//bookmark-item
  }
  else{
    btn.className="gmarks-personalbkmk";
  }
  if (!GMS.toolbarShowIconsOnly && elementType=="toolbarbutton")
    btn.setAttribute('show-text','always');
  else{
    btn.setAttribute('show-text','never');
  }
  if (GMS.toolbarShowIconsOnly && elementType=="toolbarbutton")
    btn.setAttribute('tooltiptext',bkmk.title);
  else
    btn.removeAttribute('tooltiptext');
  try{
    if (GMS.showIcons && GMS.showFavs){
      if (bkmk.image)
        btn.setAttribute('image',bkmk.image);
    }
  }catch(e){}
  btn.addEventListener('command',function(event){
      var url=event.target.getAttribute('value');
      openGMark(url,event);
      if (event.target.parentNode.hidePopup)
        event.target.parentNode.hidePopup();
    },false);
  btn.addEventListener('click',function(event){
      if (event.button==1){
        var url=event.target.getAttribute('value');
        openGMark(url,event);
        var last = null;
        var cur = event.target.parentNode;
        while(cur && (cur.tagName == "popup" || cur.tagName == "menupopup" || cur.tagName == "menu" || (cur.tagName=="button" && cur.type=="menu"))){
          if (cur.tagName == "popup" || cur.tagName == "menupopup"){
            last = cur;
          }
          cur = cur.parentNode;
        }
        if (last)
          last.hidePopup();
      }
    },false);
  btn.setAttribute('context',"gm-bookmarkPopup");
  return btn;
}
function createFolderItem(bkmks){
  var folder=document.createElement('menupopup');
  for (var i=0;i<bkmks.length;i++){
    var item;
    if (bkmks[i].type==0){
      item=document.createElement('menu');
      item.setAttribute('label',bkmks[i].title);
      item.setAttribute('value',bkmks[i].fullTitle)
      item.setAttribute('show-text','always');
      if (GMS.showIcons)
        item.className="menu-iconic bookmark-item";//gmarks-personalfolder
      else
        item.className="gmarks-personalfolder-all";
      item.setAttribute("container","true");
      item.appendChild(createFolderItem(bkmks[i].data));
      item.setAttribute('context',"gm-labelPopup");
      item.addEventListener('click',function(event){
        if (event.button==1){
          var url=event.target.getAttribute('value');
          openGMarkLabelInTabs(event);
        }
      },false);
    }
    else{
      item=createBookmarkItem('menuitem',bkmks[i]);
    }
    folder.appendChild(item);
  }
  return folder;
}
function doGMarksUnload(){
  GM.observer.unregister()
}

function addGMarkArgs(title,url,labels,notes,tab){
  this.name=title ? title : url;
  this.url=url;
  this.labels=labels;
  this.selectedTab=tab;
  this.description=notes;
}

function openGMark(url,event){
  var bookmarkPrefs=Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("extensions.tabmix.");
  var bkmkNewTab;
  try{
    bkmkNewTab=bookmarkPrefs.getBoolPref("opentabfor.bookmarks");
  }
  catch(e){bkmkNewTab=false;}
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
  bkmkNewTab=bkmkNewTab || prefs.getBoolPref('.openinnewtab');
  //if (window.content.location.href=="about:blank" || window.content.location.href==""){
  //  openUILinkIn(url,"current");
  //}
  //else
  if (!bkmkNewTab)
    openUILink(url,event,false,true);
  else{
    if (event.shiftKey==true)
      openUILinkIn(url,"tabshifted");
    else
      openUILinkIn(url,"tab");
  }
}
function openGMarkLabelInTabs(event){
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].
      getService(Components.interfaces.nsIPrefService).getBranch("gmarks.");
  var replace = prefs.getBoolPref("loadLabelAndReplace");
  if (replace){
    var childNodes = gBrowser.tabContainer.childNodes;
    for (var i = childNodes.length - 1; i > 0; --i) {
      gBrowser.removeTab(childNodes[i]);
    }
  }
  var label=getGMarksLabel(event);
  var labelArray = new Array();
  labelArray = GMS.getBookmarksByLabel(label);
  for (var i = 0; i < labelArray.length; i++)
    openUILinkIn(labelArray[i].url, "tabshifted");
  if (replace)
    gBrowser.removeTab(gBrowser.tabContainer.childNodes[0]);
}
function getGMarksLabel(event){
  var parent=document.popupNode;
  if (parent!=null){
    if (parent.tagName=="menu" || parent.getAttribute('type')=="menu"){
      return parent.getAttribute('value');
    }
    else{
      return event.target.getAttribute('value');
    }
  }
  else
    return event.target.getAttribute('value');
  return parent.getAttribute('value');
}
window.addEventListener('keyup',GM.handleKeyUp,false);
window.addEventListener('load',doGMarksLoad,false);
window.addEventListener('unload',doGMarksUnload,false);
