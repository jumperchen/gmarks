var prefs = Components.classes["@mozilla.org/preferences-service;1"].
              getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
var GMS;
var strbundle;
var gmarksObserver=null;
var favResponses=0;

function showConnectError(bm){
  var errBox=document.getElementById("submissionError");
  if (errBox.getAttribute('hidden')=="true"){
    errBox.setAttribute('hidden',false);
  }
  var lblTitle=document.getElementById("bookmarkTitleLabel");
  lblTitle.textContent=bm.title;

  var lblURL=document.getElementById('bookmarkURLLabel');
  lblURL.textContent=bm.url;

  setTimeout(function(){errBox.setAttribute('hidden','true')},10000);
}

function doSignIn(){
  var email=document.getElementById("txtEmail").value;
  var password=document.getElementById("txtPassword").value;
  var auto=document.getElementById("autosignin");
  if (auto){
    var signin=auto.checked;
    prefs.setBoolPref(".signin",signin);
    if (signin){
      GMS.savePassInfo(email,password);
    }
  }
  treeInit();
  document.getElementById("signedOffContainer").setAttribute("hidden","true");

  GMS.onSignIn(true,email,password);
}

var GM = {
  editBookmark: null,
  editOK: false,
  delBkmk: null,
  onRetryLoad : function(){
    var container=document.getElementById("signedOffContainer");
    container.setAttribute("hidden","true");
    document.getElementById("gmarkList").setAttribute('hidden','false');

    GMS.getBookmarksFeed("onload",true);
  },
  onLoad : function() {
    if (GMS.isSignedIn){
      treeInit();
      GM.updateBookmarkCount();
      var container=document.getElementById("signedOffContainer");
      document.getElementById("gmarkList").setAttribute('hidden','false');
      container.setAttribute("hidden","true");
    }
    else{
      GM.loadSignInDialog();
    }
  },
  loadSignInDialog: function(fillPass){
    var container=document.getElementById("signedOffContainer");
    container.setAttribute("hidden","false");
    var pass=GMS.getPassInfo();
    if (pass){
      if (fillPass==null){
        document.getElementById("txtEmail").value=pass.user;
        document.getElementById("txtPassword").value=pass.password;
      }
    }
    document.getElementById("autosignin").checked=prefs.getBoolPref(".signin");//setAttribute("checked",prefs.getBoolPref(".signin"));
    var tree = document.getElementById("gmarkList");
    var treeview = getTreeView(tree);
    if (treeview && treeview.data){
      treeview.data = [];
    }
    tree.hidden=true;//setAttribute('hidden','true');
  },
  signOut: function(event){
    var req=GMS.com.getSignOffRequest();
    if (req!=null){
      req.send(null);
      req.onreadystatechange = function(ev){
        if(req.readyState == 4)
        {
          var status = -1;
          try {status = req.status} catch(e) {}
          if(status == 200 || status == 302){
            dump("signout status: "+status+"\n");
            GMS.signOut();
            document.getElementById("txtEmail").value="";
            document.getElementById("txtPassword").value="";
            GM.loadSignInDialog(false);
          }
        }
      }
    }
    else{
      GMS.signOut();
      document.getElementById("txtEmail").value="";
      document.getElementById("txtPassword").value="";
      GM.loadSignInDialog(false);
    }
  },
  signinKey: function(event){
    if (event.keyCode==13){//enter
      doSignIn();
    }
  },
  //Gets the new feed
  refresh : function(event) {
    if (treeView!=null){
      if (!treeView.treeBox){
        treeInit();
      }
    }
    else{
      treeInit();
    }

    var quick=true;
    if (searchBox.value.length>0) searchBox.value="";
    GMS.getBookmarksFeed("onrefresh",true);
  },
  //After we've gotten the new feed
  onRefresh: function(hideImages){
    //dump("onrefresh\n");
    if (treeView==null || treeView.getTreeBox()==null) treeInit();
    if (GMS.isSignedIn){
      if (!treeView)
        doOrganizeLoad();
      treeView.getTreeBox().beginUpdateBatch();
      var lbls,container;
      if (treeView.type=="complete"){
        document.getElementById("gmarkList").setAttribute('hidden','false');
        container=document.getElementById("signedOffContainer");
        container.setAttribute("hidden","true");
        GM.updateBookmarkCount();
      }
      if (searchBox.value.length==0){
        //dump("treeviewtype: "+treeView.type+"\n");
        if (treeView.type=="complete"){
          document.getElementById("gmarkList").setAttribute('hidden','false');
          container.setAttribute("hidden","true");
          lbls=treeView.getOpened();
          treeView.data=getVisibleData("complete");
          treeView.restoreContainers(lbls);
          var tree=document.getElementById("gmarkList");
          if (tree.currentIndex>=treeView.data.length){
            tree.currentIndex=0;
          }
        }
        else{
          lblsTreeView.treeBox.beginUpdateBatch();
          lbls=lblsTreeView.getOpened();
          var curIndex = lblsTreeView.selection.currentIndex;
          if (curIndex>-1 && curIndex<lblsTreeView.data.length && lblsTreeView.data[curIndex]){
            var selected = lblsTreeView.data[curIndex].title;
            lblsTreeView.data=getVisibleData("labels");
            lblsTreeView.restoreContainers(lbls, selected);
            lblsTreeView.treeBox.endUpdateBatch();
            curIndex = lblsTreeView.selection.currentIndex
            if (curIndex==-1 || !lblsTreeView.data[curIndex] ||
                (lblsTreeView.data[curIndex].title!=selected)){
              //The current label has been removed, select the first label
              lblsTreeView.selection.select(0);
              treeView.parentLbl = lblsTreeView.data[0].title;
            }
          }
          var tree=document.getElementById("gmarkLabels");

          lbls=treeView.getOpened();
          treeView.data=getTreeData(treeView.parentLbl,true);
          treeView.restoreContainers(lbls);
          tree=document.getElementById("gmarkDetails");

        }
      }
      else{
        //dump("in search\n");
        var lvl=treeView.type=="complete" ? 0 : 1;
        treeView.data=new Array();
        for (var i=0;i<GMS.searchArray.length;i++){
          treeView.data.push(new BookmarkData(1,GMS.searchArray[i],lvl));
        }
      }
      treeView.treeBox.endUpdateBatch();
    }
    else if (treeView.type=="complete"){
      var container=document.getElementById("signedOffContainer");
      container.setAttribute("hidden","false");
      var pass=GMS.getPassInfo();
      if (pass){
        document.getElementById("txtEmail").value=pass.user?pass.user:""
        document.getElementById("txtPassword").value=pass.password?pass.password:"";
      }
      document.getElementById("autosignin").checked=prefs.getBoolPref(".signin");
      document.getElementById("gmarkList").setAttribute('hidden','true');
    }
    //dump("done refresh\n");
  },
  quickRefresh : function(){
    if (treeView.treeBox==null) treeInit();
    GM.onRefresh(true);
  },
  updateBookmarkCount: function(){
    var col=document.getElementById("mainCol");
    if (col){
      var label=col.getAttribute("label");
      var pos=label.indexOf(" (");
      if (pos>-1)
        label=label.substring(0,pos);
      if (GMS.showCount)
        label+=" ("+GMS.bookmarkArray.length+")";
      col.setAttribute("label",label)
    }
  },
  getImages : function(){},

  addGMark : function(title, url,label){
    var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].
        getService();
    var windowManagerInterface = windowManager.QueryInterface(
        Components.interfaces.nsIWindowMediator);
    var recentWindow = windowManagerInterface.getMostRecentWindow(
        "navigator:browser" );

    var theUrl = url ? url : recentWindow.content.location.href;
    var docTitle = title ? title : recentWindow.content.document.title;
    var labels = label ? [label] : new Array();
    var notes=""//document.getSelection();
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Components.interfaces.nsIVersionComparator);
    var FF3 = (versionChecker.compare(appInfo.version, "3.0a") >= 0);
    if (prefs.getBoolPref('.ctrlD')==true && !FF3){
      var arg=new wArg(docTitle,theUrl,labels,notes,1);
      window.openDialog("chrome://browser/content/bookmarks/addBookmark2.xul",strbundle.getString("addBookmarkTitle"),"chrome,centerscreen,modal",arg);
    }
    else{
      this.editOK=false;
      window.openDialog("chrome://gmarks/content/editBookmark.xul",strbundle.getString("addBookmarkTitle"),"chrome,centerscreen,modal",docTitle, theUrl,labels,notes,0,null,true);
      //if (this.editOK){
      //  GMS.updateBookmark(this.editBookmark,true);
      //  GMS.sendUpdateBookmark(this.editBookmark);
      //}
    }
  },
  onEditBookmark : function(bm) {
    this.editBookmark=bm;
    this.editOK=false;
    this.delBkmk=null;
    window.openDialog("chrome://gmarks/content/editBookmark.xul",strbundle.getString("editBookmarkTitle"),"chrome,centerscreen,modal",bm.title, bm.url,bm.labels,bm.notes,bm.id,bm.mode,false);
  },
  updateURL : function(bm){
    var newURL=window.content.location.href;
    GMS.onRemoveBookmark(bm,false,false);
    GMS.actionHist.pop();
    var obj2=new Array();
    obj2.push({type: "url",url: bm.url});
    /* Create a bookmark action so it can be undone */
    GMS.generateBkmkAction("bookmark","properties", bm,obj2);
    bm.url=newURL;
    bm.id=0;
    GMS.updateBookmark(bm,true);
    GMS.sendUpdateBookmark(bm);
  },
  customFavicon: function(event){
    var tree=document.popupNode.parentNode;
    var view=getTreeView(tree);
    var visibleData=view.data;
    var index=pops.getBookmarkIndex();
    if (index>-1){
      var bkmk=visibleData[index];
      //this.dataCustomFavicon(bkmk);
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
      var rValue={},rTemp={};
      var result= prompts.prompt(window, strbundle.getString("customFaviconTitle"),
        strbundle.getString("customFaviconURL"),rValue,null,rTemp);
      if (result){
        var url=rValue.value
        if (url && url.length>0){
        bkmk.image=url;
        if (bkmk.notes.length>0)
          bkmk.notes+=" favicon:"+url;
        else
          bkmk.notes="favicon:"+url;
        GMS.sendUpdateBookmark(bkmk);
        view.invalidate();
        }
      }
    }
  },
  //Old
  dataCustomFavicon: function(bkmk){
    try {
      var kFilePickerContractID = "@mozilla.org/filepicker;1";
      var kFilePickerIID = Components.interfaces.nsIFilePicker;
      var kFilePicker = Components.classes[kFilePickerContractID].createInstance(kFilePickerIID);

      var kTitle = strbundle.getString("customFaviconTitle");
      kFilePicker.init(window, kTitle, kFilePickerIID["modeOpen"]);
      kFilePicker.appendFilters(kFilePickerIID.filterImages | kFilePickerIID.filterAll);
      var file;
      if (kFilePicker.show() != kFilePickerIID.returnCancel) {
        file = kFilePicker.file;
        if (!file) return;
      }
      else return;
      var data=generateDataURI(file);
      var pos=bkmk.notes.indexOf("data:image");
      if (pos>-1){
        if (pos==0)
          bkmk.notes=data;
        else
          bkmk.notes=bkmk.notes.substring(0,pos)+data;
      }
      else if (bkmk.notes.length>0)
        bkmk.notes+=" "+data;
      else
        bkmk.notes=data;
      bkmk.image=data;
      GMS.sendUpdateBookmark(bkmk);
      view.invalidateRow(index);
    }
    catch(e){
      Components.utils.reportError(e);
    }
  }
}

//From http://developer.mozilla.org/en/docs/The_data_URL_scheme
function generateDataURI(file) {
  var contentType = Components.classes["@mozilla.org/mime;1"].getService(Components.interfaces.nsIMIMEService).getTypeFromFile(file);
  var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
  inputStream.init(file, 0x01, 0600, 0);
  var stream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
  stream.setInputStream(inputStream);
  var encoded = btoa(stream.readBytes(stream.available()));
  return "data:" + contentType + ";base64," + encoded;
}

function GmarksObserverControl()
{
  this.register();
}
GmarksObserverControl.prototype = {
  observe: function(subject, topic, data) {
    //dump("observer: "+topic+"\n");
    if (topic=="gmarks-refresh"){
      if (data=="" || data==null)
        GM.refresh();
      else
        setTimeout('GM.refresh();',data);
    }
    else if (topic=="gmarks-redrawImages"){
      setTimeout(function(){
        if (treeView!=null){
          //redraw tree with new favicon images
          treeView.getTreeBox().invalidate();
        }
      },2000);
    }
    else if (topic=="gmarks-connectionerror"){
      data=data.split("|");
      if (data.length>1){
        bm=GMS.createNewBookmark();//new bookmark();
        bm.url=data[0]; bm.title=data[1];
        showConnectError(bm);
      }
    }
    else if (topic=="gmarks-onload"){
      setTimeout(function(){
        document.getElementById("loadingContainer").setAttribute("hidden","true");

        GM.onLoad();
      },5);
      if (treeView)
        treeView.loading=false;
    }
    else{
      var loadingContainer=document.getElementById("loadingContainer")
      if (topic=="gmarks-bookmarks-load-start"){
        if (loadingContainer) loadingContainer.setAttribute("hidden","false");
        if (typeof treeView != "undefined"){
          treeView.loading=true;
          if (treeView.treeBox){
            treeView.treeBox.beginUpdateBatch();
            treeView.treeBox.endUpdateBatch();
          }
        }
      }
      else if (topic=="gmarks-onrefresh"){
        setTimeout(function(){
          if (loadingContainer) loadingContainer.setAttribute("hidden","true");

          GM.onRefresh();
        },5);
        if (treeView)
          treeView.loading=false;
      }
      else if (topic=="gmarks-retryreload"){
        if (loadingContainer) loadingContainer.setAttribute("hidden","true");
        if (treeView)
          treeView.loading=false;
        GM.onRetryLoad();
      }
      else if (topic=="gmarks-quickrefresh"){
        if (loadingContainer) loadingContainer.setAttribute("hidden","true");
        if (treeView)
          treeView.loading=false;
        GM.quickRefresh();
      }
    }
  },
  register: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
              .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "gmarks-refresh", false);
    observerService.addObserver(this, "gmarks-onload", false);
    if (document.getElementById("gmarkList")!=null)
      observerService.addObserver(this, "gmarks-bookmarks-load-start", false);
    observerService.addObserver(this, "gmarks-retryreload", false);
    observerService.addObserver(this, "gmarks-onrefresh", false);
    observerService.addObserver(this, "gmarks-quickrefresh", false);
    observerService.addObserver(this, "gmarks-redrawImages", false);
  },
  unregister: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
              .getService(Components.interfaces.nsIObserverService);
    observerService.removeObserver(this, "gmarks-refresh");
    observerService.removeObserver(this, "gmarks-onload");
    if (treeView && treeView.type=="complete")
      observerService.removeObserver(this, "gmarks-bookmarks-load-start");
    observerService.removeObserver(this, "gmarks-retryreload");
    observerService.removeObserver(this, "gmarks-onrefresh");
    observerService.removeObserver(this, "gmarks-quickrefresh");
    observerService.removeObserver(this, "gmarks-redrawImages");
  }
}

function wArg(title,url,labels,notes,tab){
  this.name=title ? title : url;
  this.url=url;
  this.labels=labels;
  this.selectedTab=tab;
  this.description=notes;
}
