var GMARKS_CONTRACTID = '@mozilla.org/gmarks;1';
var GMARKS_CID = Components.ID('{47eddc3e-b79f-11db-8314-0800200c9a66}');
var GMARKS_IID = Components.interfaces.nsIGMarksService;

var gGMarks;

function nsGMarksService() {
  //Who needs interfaces anyway
  this.wrappedJSObject = this;
  this.strbundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://gmarks/locale/gmarks.properties");
  this.loadPrefs();
  gGMarks=this;
  try{
    var combundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService)
      .createBundle("chrome://gmarks/locale/com.properties");
    this.mode=combundle.GetStringFromName("identifier");
  } catch(e){
    this.mode="google";
  }
  this.com=Components.classes["@mozilla.org/gmarks/com/"+this.mode+";1"]
    .getService(Components.interfaces.nsIGMarksCom).wrappedJSObject
  this.com.setGMS(this);
  this.getBookmarksFeed("onload",false);
}
nsGMarksService.prototype = {
  com: null,
  bookmarkArray: new Array(),
  labelArray: new Array(),
  //the last 10 bookmarks added
  recent: new Array(),
  //10 most frequently visited bookmarks.
  frequent: new Array(),
  searchArray: null,
  recievedBookmarks: 0,
  isSignedIn: false,
  showIcons: true,
  showFavs: true,
  sortBy: 'title',
  qsKey: "",
  qsKeyCode: 36,
  hidden: "",
  unlabeled: "",
  readerLabel: "Google Reader",
  _tabGroup: null,
  validateFavs: false,
  toolbarFolder: null,
  toolbarShowIconsOnly: false,
  signingIn: false,
  loading: false,
  actionHist: new Array(),
  get manageOnlineURL(){
    return this.com.manageOnlineURL;
  },
  loadPrefs: function(){
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
      getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
    this.showIcons=prefs.getBoolPref('.showIcons');
    this.showFavs=prefs.getBoolPref('.showFav');
    if (!this.showIcons){
      this.showFavs=false;
    }
    this.sortBy=prefs.getCharPref('sortby');
    try{
      var t=prefs.getCharPref('.keys.quicksearch.key');
      prefs.clearUserPref('.keys.quicksearch.key');
    }
    catch(e){}
    this.qsKeyCode=prefs.getIntPref('.keys.quicksearch.key');
    this.hidden=prefs.getComplexValue(".hiddenLabels",
      Components.interfaces.nsISupportsString).data;
    this.hidden=this.hidden.split(/\s*,\s*/);
    this.unlabeled=prefs.getComplexValue(".unlabeled",
      Components.interfaces.nsISupportsString).data;
    this.readerLabel=prefs.getCharPref('.readerLabel');
    this.validateFavs=prefs.getBoolPref(".icons.validate");
    try{
      this.toolbarFolder=prefs.getComplexValue(".toolbarFolder",
        Components.interfaces.nsISupportsString).data;
    }
    catch(e){
      this.toolbarFolder=prefs.getCharPref(".toolbarFolder");
    }
    this.toolbarShowIconsOnly=prefs.getBoolPref(".toolbarShowIconsOnly");
    this.nestedChar=prefs.getCharPref(".nestedChar");
    this.showCount=prefs.getBoolPref('.showCount');
    this.confirmDelete=prefs.getBoolPref(".confirmDelete");
    this.showRecent=prefs.getBoolPref(".showRecent");
    this.showFreq=prefs.getBoolPref(".showFreq");
    this.searchType=prefs.getIntPref(".search");
  },
  /* The url the passwords are saved to in Firefox's password manager. With GMarks, its chrome://gmarks */
  getPassLoc : function(){
    return this.com.passLoc;
  },
  /*
   * Adds bookmarks to a queue to be submitted to Google
   */
  set tabGroup(bkmks){
    this._tabGroup=new Array();
    for (var n=0;n<bkmks.length;n++){
      var bm=this.createNewBookmark();
      for (var obj in bkmks[n]){
        bm[obj]=bkmks[n][obj];
      }
      bm.labels=new Array();
      for (var j=0;j<bkmks[n].labels.length;j++)
        bm.labels.push(bkmks[n].labels[j]);
      var idx=this.updateBookmark(bm,n==(bkmks.length-1));
      this._tabGroup.push(bm);
    }
    this.updateMultipleBookmarks(this._tabGroup,0);
  },
  /*
   * Used to undo actions...
   * type=label or bookmark
   * label actions=rename,delete,deletebkmks
   * bkmk  actions=delete,properties [change], add
   */
  generateBkmkAction: function(aType,aAction,aObj1,aObj2){
    var newaction={
      type: aType, action: aAction,
      obj1: aObj1, obj2: aObj2
    };
    this.actionHist.push(newaction);
    //dump("Action added, type="+aType+" action="+aAction+"\n");
    return newaction;
  },
  undoLastAction: function(stopRefresh){
    //dump("History Depth: "+this.actionHist.length+"\n");
    var histaction=this.actionHist.pop();
    if (!histaction) return;
    var type=histaction.type,action=histaction.action;
    //dump("Undo Action: "+type+"|"+action+"\n");
    /*
     * Hopefully these references to removed bkmks stay in tact
     */
    if (type=="label"){
      if (action=="rename"){
        var children=histaction.obj1;
        var bkmks=new Array();
        children.forEach(function(child){
          var oldlbl=child.oldlbl;
          var newlbl=child.newlbl;
          var bkmk  =child.bkmk;
          var idx=bkmk.labels.indexOf(newlbl);
          if (idx>-1)
            bkmk.labels[idx]=oldlbl;
          bkmks.push(bkmk);
        });
        this.updateMultipleBookmarks(bkmks,0);
      }
      else if (action=="add"){
        var bkmks=histaction.obj1;
        var lbl=histaction.obj2;
        bkmks.forEach(function(bkmk){
          /* remove label from bookmark */
          var idx=bkmk.labels.indexOf(lbl);
          if(idx>-1)
            bkmk.labels.splice(idx,1);
        });
        this.updateMultipleBookmarks(bkmks,0);
      }
      else if (action=="delete"){
        var children=histaction.obj1;
        var bkmks=new Array();
        children.forEach(function(child){
          child.bkmk.labels.push(child.label);
          bkmks.push(child.bkmk);
        });
        this.updateMultipleBookmarks(bkmks,0);
      }
      else if (action=="deletebkmks"){
        var bkmks=histaction.obj1;
        bkmks.forEach(function(bkmk){
          this.addBookmark(bkmk);
        },this);
        this.updateMultipleBookmarks(bkmks,0);
      }
    }
    else if (type=="bookmark"){
      if (action=="delete"){/* Add it back */
        var deleted=histaction.obj1;
        this.addBookmark(deleted);
        this.sendUpdateBookmark(deleted,true);
      }
      else if (action=="add"){
        var bkmk=histaction.obj1;
        /* Remove from lists */
        this.removeBookmark(bkmk);
        /* Removes the bookmark from the online service */
        this.com.onRemoveBookmark(bkmk);
      }
      else if (action=="properties"){
        var bkmk=histaction.obj1;
        var changes=histaction.obj2;
        this.removeBookmark(bkmk);
        changes.forEach(function(change){
          //dump("change: "+change.type+"\n");
          if (change.type=="url" && bkmk.url!=change.url){
            this.com.onRemoveBookmark(bkmk);
            bkmk.url=change.url;
            bkmk.id=0;
          }
          else if (change.type=="add label"){
            var lbl=change.label;
            /* remove label from bookmark */
            var idx=bkmk.labels.indexOf(lbl);
            if(idx>-1)
              bkmk.labels.splice(idx,1);
          }
          else if (change.type=="remove label"){
            var lbl=change.label;
            /* add label to bookmark */
            var idx=bkmk.labels.indexOf(lbl);
            if (idx<0)
              bkmk.labels.push(lbl);
          }
          else if (change.type=="title")
            bkmk.title=change.title;
          else if (change.type=="labels"){
            bkmk.labels=change.labels.split(',');}
          else if (change.type=="notes")
            bkmk.notes=change.notes;
        },this);
        this.addBookmark(bkmk);
        this.sendUpdateBookmark(bkmk,true);
      }
    }
    else if (type=="all"){
      if (action=="complex action"){
        histaction.obj1.forEach(function(item){
          this.actionHist.push(item);
          this.undoLastAction(true);
        },this);
      }
    }
    //dump("Action undoifying complete\ntype="+type+" | action="+action+"\nobj1="+histaction.obj1+"\nobj2="+histaction.obj2+"\n");
    if (!stopRefresh)
      this.doCommand("quickrefresh");
  },
  /*
   * Removes a bookmark from Google, if checkConfirm is true and the users preference to confirm on delete is true, it prompts them before deleting
   * bm can be either the url, the index, or the bookmark
   * star is the state of thee GMarks star, "on" and "off" If the current url is being removed, the star should change back to clear.
   *
   * onRemoveBookmark also removes the bookmark from the local bookmarkArray
   */
  onRemoveBookmark : function(bm,refresh,checkConfirm) {
    //dump("onRemoveBookmark: "+bm+"\n");
    if (checkConfirm && this.confirmDelete){
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
      var result= prompts.confirm(null, "",
        this.strbundle.GetStringFromName("removeBookmark")+' "'+bm.title+'"');
      if (!result){
        return;
      }
    }
    /*
     * Checks to see if its the current url, if so, it needs to change the star from bookmarked to not bookmarked
     */
    var topWindowOfType = this.getBrowserWindow();
    /*
    if (topWindowOfType) {
      var url=null;
      if (typeof bm=='string')
        url=bm;
      else if (typeof bm!='number')
        url=bm.url;
      if (url==topWindowOfType.content.location.href){
        star=star?star:"off";
        Components.classes["@mozilla.org/observer-service;1"]
         .getService(Components.interfaces.nsIObserverService)
         .notifyObservers(null, "star-change", star);
      }
    }
    */
    var idx;
    if (typeof bm=='string')
      idx=this.isBookmarked(bm);
    else if (typeof bm=='number')
      idx=bm;
    else{
      idx=this.isBookmarked(bm.url);
    }
    var bkmk=this.bookmarkArray[idx];
    //dump("remove bookmark at "+idx+" with url: "+bkmk.url+"\n");
    /* Create a bookmark action so it can be undone */
    this.generateBkmkAction("bookmark","delete",bkmk);
    /* Remove from lists */
    var id=this.removeBookmark(idx,refresh);
    /* Removes the bookmark from the online service */
    this.com.onRemoveBookmark(bkmk);
  },
  /*
   * Renames oldLabel to newLabel, modifies the label in the bookmarkArray and online
   * If there is no new label, it removes the old label
   */
  onRenameLabel: function(oldLabel, newLabel,refresh){
  if (!newLabel || newLabel=="") {this.onRemoveLabel(oldLabel,true,true); return;}
    var children=new Array();
    for (i=0; i < this.bookmarkArray.length; i++){
      for (j=0; j < this.bookmarkArray[i].labels.length; j++) {
        if (this.bookmarkArray[i].labels[j] == oldLabel){
          children.push({bkmk: this.bookmarkArray[i],oldlbl: oldLabel, newlbl: newLabel});
          this.bookmarkArray[i].labels[j] = newLabel; break;
        }
      }
    }
    /* Create a bookmark action so it can be undone */
    this.generateBkmkAction("label","rename", children);

    this.com.onRenameLabel(oldLabel,newLabel);
    if (refresh) this.doCommand("quickrefresh");
  },
  /*
   * Removes the label locally and online, does not delete the bookmarks belonging to the label
   */
  onRemoveLabel: function(label,refresh,checkConfirm){
    if (checkConfirm && this.confirmDelete){
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
      var result= prompts.confirm(null, "",
        this.strbundle.GetStringFromName("removeLabel")+' "'+label+'"');
      if (!result){
        return;
      }
    }
    var children=new Array();
    for (i=0; i < this.bookmarkArray.length; i++)
      for (j=0; j < this.bookmarkArray[i].labels.length; j++)
        if (this.bookmarkArray[i].labels[j] == label){
          children.push(this.bookmarkArray[i]);
          this.bookmarkArray[i].labels.splice(j,1);
        }

    /* Create a bookmark action so it can be undone */
    this.generateBkmkAction("label","delete", children,label);

    this.com.onRemoveLabel(label);
    if (refresh) this.doCommand("quickrefresh");
  },
  /*
   * Adds a label to the bookmark, if no label exists it prompts the user for a label
   * bm can be a url or a bookmark object
   *
   * updates the bookmark locally and online
   */
  addLabelToBookmark: function(bm,label,refresh){
    if (label==null || label.length==0){
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
      var input = {value: ""};
      var checked = {value: false};
      var result = prompts.prompt(null, "",
          this.strbundle.GetStringFromName('addLabelToBookmarkPrompt'),
          input,null,checked);
      label=input.value;
      if (!result || label==null || label.length==0)
        return;
    }
    if (typeof bm=='string') //string==its a url
      bm=this.getBookmark(bm);

    if (this.hasLabel(bm.labels,label)) return;//No point in adding a duplicate label...
    var labels=label.split(/,\s*/);
    for (var i=0;i<labels.length;i++){
      labels[i]=labels[i].replace(/^\s*|\s*$/g,"");
      if (labels[i].length==0 || labels[i]==" " || labels[i].match(/^\s+$/))
        labels.splice(i,1);
    }
    bm.labels=bm.labels.concat(labels);//Add label
    this.updateBookmark(bm,refresh);

    /* Create a bookmark action so it can be undone */
    var obj2=new Array();
    for (var i=0;i<labels.length;i++)
      obj2.push({type: "add label",label: labels[i]});
    this.generateBkmkAction("bookmark","properties", bm,obj2);

    this.com.onAddLabelsToBookmark(bm,labels);
  },
  /*
   * Removes the label from the bookmark
   * bm can be either a url or a bookmark object
   *
   * updates the bookmark locally and online...
   */
  removeLabelFromBookmark: function(bm,label,refresh){
    if (typeof bm=='string')
      bm=this.getBookmark(bm);

    var newLabels=new Array();

    for (var i=0;i<bm.labels.length;i++){
      if (bm.labels[i] != label)
        newLabels.push(bm.labels[i]);
    }
    bm.labels=newLabels;
    this.updateBookmark(bm,refresh);

    /* Create a bookmark action so it can be undone */
    this.generateBkmkAction("bookmark","properties", bm,[{type: "remove label",label: label}]);

    this.com.onRemoveLabelFromBookmark(bm,label);
  },
  /*
   * Renames the bookmark, prompts the user if necessary
   * bm == url || bookmark objec
   *
   * updates the bookmark locally and online
   */
  onRenameBookmark: function(bm,title,refresh){
    if (typeof bm=='string')
      bm=this.getBookmark(bm);
    if (title==null || title.length==0){
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
      var input = {value: bm.title};
      var checked = {value: false};
      var result= prompts.prompt(null, "",
        this.strbundle.GetStringFromName("renameBookmark"), input,null,checked);
      title=input.value;
      if (!result || title==null || title.length==0)
        return;
    }
    if (title){
      //id, url, title, labels, notes, date, image
      var old=this.createNewBookmark(bm.id, bm.url, bm.title,bm.labels, bm.notes,
          bm.date,bm.image);
      this.removeBookmark(old);

      /* Create a bookmark action so it can be undone */
      var obj=new Array({type: "title",title: bm.title});
      this.generateBkmkAction("bookmark","properties", bm,obj);

      bm.title=title;
      this.updateBookmark(bm,refresh);

      this.com.onRenameBookmark(bm,title);
    }
  },
  sendUpdateBookmark: function(bm,async){
    this.com.sendUpdateBookmark(bm,async);
  },
  errorSendingBookmark: function(bm){
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
          .getService(Components.interfaces.nsIPromptService);
    var result= prompts.alert(this.getBrowserWindow(), "",
      this.strbundle.GetStringFromName("submissonError")+"\n"+
      bm.title+"\n"+bm.url);
  },
  /*
   * Updates a group of bookmarks one at a time, sending too many bookmarks at a time causes the requests to be lost
   */
  updateMultipleBookmarks: function(bkmks,i){
    if (i==null){
      for (var n=0;n<bkmks.length;n++){
        this.updateBookmark(bkmks[n],n==(bkmks.length-1));
      }
      i=0;
    }
    this.com.updateMultipleBookmarks(bkmks,i);
  },
  /*
   * Returns a new bookmark object with the current date and the passed in properties
   */
  createNewBookmark: function(aId, aURL, aTitle, aLabels, aNotes, aDate, aImage,
      aService, aMode,aFreq){//aId, aURL, aTitle, aLabels, aNotes, aDate, aImage
    if (aDate==null){
      var d=new Date();
      aDate=d;
      //aDate=d.valueOf()*1000+d.getMilliseconds();
    }
    if (aLabels && typeof aLabels=="string") aLabels=[aLabels];
    aService=aService?aService:"bookmarks";
    if (this.mode=="simpy")
      aMode=aMode?aMode:this.com.visibility;
    else
      aMode=0;
    return {
      id: aId, url: aURL, title: aTitle, pageTitle: aTitle, mode: aMode,
      labels: aLabels?aLabels:new Array(), notes: aNotes?aNotes:"",
      date: aDate, image: aImage, serv: aService, freq: aFreq
    };
    /*
    toString: function(){
        return 'id='+id +'&url='+url+ '&title='+title+'&labels='+labels+ '&notes='+notes;
     */
  },
  getPassInfo: function(){
    var hostString = this.getPassLoc();//'chrome://gmarks';
    //FF2
    if (Components.classes["@mozilla.org/passwordmanager;1"]){
      var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                    .getService(Components.interfaces.nsIPasswordManager);
      var e = passwordManager.enumerator;
      while (e.hasMoreElements()) {
        try {
          // get an nsIPassword object out of the password manager.
          // This contains the actual password...
          var pass = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
          if (pass.host == hostString) {
             // found it!
             return pass;
          }
        } catch (ex) {//Decrypting Failed
          continue;
        }
      }
    }
    else if (Components.classes["@mozilla.org/login-manager;1"]){
      var formSubmitURL = '/';
      var httprealm = null;
      var password;

      try {
         // Get Login Manager
         var passwordManager = Components.classes["@mozilla.org/login-manager;1"]
          .getService(Components.interfaces.nsILoginManager);
         // Find users for the given parameters
         var logins = passwordManager.findLogins({}, hostString, formSubmitURL, httprealm);
         if (logins.length>0)
          return {user: logins[0].username, password: logins[0].password};
      }
      catch(ex) {
         // This will only happen if there is no nsILoginManager component class
      }
    }
    return {user: null, password: null};
  },
  savePassInfo: function(user,password){
    if (Components.classes["@mozilla.org/passwordmanager;1"]){
      var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
          .getService(Components.interfaces.nsIPasswordManager);
       try{
        var pass=this.getPassInfo();
        while (pass!=null && (pass.user!=user || pass.password!=password)){
          passwordManager.removeUser(this.getPassLoc(),pass.user);
          pass=this.getPassInfo();
        }
      }
      catch(e){}
      if (user && user.length>0)
        passwordManager.addUser(this.getPassLoc(), user, password);
    }
    else if (Components.classes["@mozilla.org/login-manager;1"]){//FF3
      var passwordManager = Components.classes["@mozilla.org/login-manager;1"]
        .getService(Components.interfaces.nsILoginManager);
      var hostString = this.getPassLoc();
      var formSubmitURL = '/';
      var httprealm = null;
      var logins = passwordManager.findLogins({}, hostString, formSubmitURL, httprealm);
      var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
        Components.interfaces.nsILoginInfo);
      var extLoginInfo = new nsLoginInfo();
      extLoginInfo.init(this.getPassLoc(), '/', null, user, password, '', '');
      if (logins.length==0){
        if (user && user.length>0)
          passwordManager.addLogin(extLoginInfo);
      }
      else if (user && user.length>0)
        passwordManager.modifyLogin(logins[0],extLoginInfo);
      else
        passwordManager.removeLogin(logins[0]);
      }
  },
  /*
   * Checks to see if you are signed in or not
   */
  checkSignedCookie: function(){
    return this.com.checkSignedCookie();
  },
  /*
   * Signs in
   */
  onSignIn: function(refresh,email,pass,action,sidebar,start,num) {
    this.com.onSignIn(refresh,email,pass,action,sidebar,start,num);
  },
  signOut: function(){
    this.bookmarkArray=new Array();
    this.searchArray=new Array();
    this.recent=new Array();
    this.frequent=new Array();
    this.isSignedIn=false;
    this.loading=false;
    this.isSignedIn=false;
    this.recievedBookmarks=0;
    this.com.signOut();
    this.doCommand("quickrefresh");
  },
  /*
   * Downloads the bookmark xml feed and calls the command passed in (action)
   * There are so many try and catches because I got fed up with people complaining of all these obscure errors.
   */
  getBookmarksFeed: function(action,sidebar,start,num){
    this.doCommand("bookmarks-load-start");
    this.actionHist=new Array();
    this.com.getBookmarksFeed(action,sidebar,start,num);
  },
  /*
   * Same as the getBookmarksFeed, but returns only those which fit the query
   */
  getSiteSearch: function(query, action, sidebar){
    if (this.searchType==0)
      this.com.getSiteSearch(query,action,sidebar);
    else{
      this.searchArray = this.getMatchingBookmarks(query);
      this.doCommand(action);
    }
  },
  /*
   * Retrieves the starred items from Google Reader
   * This is not called by default, there is an option to turn this on.
   */
  getReaderStars : function(action){
    this.com.getReaderStars(action);
  },
  /*
   * Gets the id of the last added bookmark so it can be removed during the current session.
   */
  getID : function(bm){
    this.com.getId(bm);
  },
  //returns the favicon at domain.tld/favicon.ico of a url
  getIcon : function(bmUrl){
    if (!this.showIcons || !this.showFavs && bmlURL!="about:blank") return null;
    var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
    try{
    var url = ioservice.newURI(bmUrl, null, null);
    var scheme = url.scheme;
    if (url.hostPort && scheme){
      if (scheme=="https") 
        url.scheme = scheme ="http";
      if (scheme=="http")
        return ioservice.newURI(scheme + "://" + url.hostPort + "/favicon.ico", null, null);
    }
    }catch(e){}
    return null;
  },
  //Sets the icon of bookmark, checks if the favicon exists first if validate favicons is enabled
  getImage: function(bkmkIdx,type){
    if (!this.showIcons || !this.showFavs) return;
    type=type==null?0:type;
    var bkmk;
    if (type==0){
      bkmk=this.bookmarkArray[bkmkIdx];
    }
    else{
      bkmk=this.searchArray[bkmkIdx];
    }
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
      getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
    var lookup = prefs.getCharPref(".favicons");
    //Check if its in the notes
    var pos=bkmk.notes.lastIndexOf("data:image");
    if (pos>-1){//Old style
      //Google removes + signs, replaces them with spaces.
      var newImage=bkmk.notes.substring(pos).replace(/\s/g,"+");
      bkmk.image=newImage;
    }
    else if ((pos=bkmk.notes.lastIndexOf("favicon:"))>-1){//New style
      var newImage=bkmk.notes.substring(pos+8);
      bkmk.image=newImage;
    }
    else if (lookup == "gmarks" &&
             Components.classes["@mozilla.org/browser/favicon-service;1"]){//FF3
      try{
      var faviconService = Components.classes["@mozilla.org/browser/favicon-service;1"]
                 .getService(Components.interfaces.nsIFaviconService);
      var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
      var uri = ioservice.newURI(bkmk.url, null, null);
      bkmk.image=faviconService.getFaviconImageForPage(uri).spec;
      }catch(e){
        //dump(e+"\nUrl Error: "+bkmk.url+"\n");
      }

    }//FF2
    else if (!this.validateFavs) {
      var icon=this.getIcon(bkmk.url);
      if (icon)
        bkmk.image=icon.spec;
      else
        bkmk.image=null;
    }
    else{
      try{
        if (bkmk.image==null && bkmk.url.substring(0,4)=="http"){
          var img=this.getIcon(bkmk.url);
          if (img!=null){
            var uriChecker = Components.classes["@mozilla.org/network/urichecker;1"].createInstance()
                  .QueryInterface(Components.interfaces.nsIURIChecker);
            uriChecker.init(img);
            uriChecker.asyncCheck(new imageURIChecker(bkmkIdx,type,bkmk.url),img);
          }
        }
      }
      catch(e){
        Components.utils.reportError(e+"\nType: "+type);
      }
    }
  },
  //Gets all the images..
  getImages : function(searching){
    //dump("get images1\n");
    if (!this.showIcons || !this.showFavs || !this.validateFavs) return;
    //dump("get images2\n");
    var bkmks=!searching?GMS.bookmarkArray:GMS.searchArray;
    this.favResponses=0;
    for (var i=0;i<bkmks.length;i++){
      this.getImage(bkmks[i],(searching==true?1:0));
    }
    //dump("redraw images\n");
    this.doCommand("redrawImages");
  },


  connectionError: function(bm){
    debug("connection error\n");
    if (bm!=null)
      this.doCommand("connectionerror",bm.url+"|"+bm.title);
  },
  //Shouldnt be in here...I put it in here and the xpt when testing how to make an XPCOM component
  reverseIt: function(s) {
    var a = s.split("");
    a = a.reverse();
    return a.join("");
  },
  //Sends the commands to the sidebar and toolbar, or whatever else is observing the commands
  doCommand: function(command,data){
    //if (command=="quickfresh")
    //dump("doCommand: gmarks-"+command+"\n");
    if (command!=null)
      Components.classes["@mozilla.org/observer-service;1"]
         .getService(Components.interfaces.nsIObserverService)
         .notifyObservers(null, "gmarks-"+command, data);

  },
  removeFromRecent: function(bkmk){
    if (this.recent.length>0)
      if (bkmk.date>this.recent[this.recent.length-1].date){
        var j;
        for (j=this.recent.length-1;j>=0 && bkmk.date>=this.recent[j].date;j--){
          if (bkmk.url==this.recent[j].url){
            this.recent.splice(j,1);
            return true;
          }
        }
      }
    return false;
  },
  removeFromFrequent: function(bkmk){
    if (this.frequent.length>0)
      if (bkmk.freq>this.frequent[this.frequent.length-1].freq){
        var j;
        for (j=this.frequent.length-1;j>=0 && bkmk.freq>=this.frequent[j].freq;j--){
          if (bkmk.url==this.frequent[j].url){
            this.frequent.splice(j,1);
            return true;
          }
        }
      }
    return false;
  },
  updateRecent: function(bkmk){
    var addedbkmk=false;
    if (this.recent.length<10 ||
      (this.recent.length>0 && bkmk.date>
      this.recent[this.recent.length-1].date)){

      var currentIndex=-1;
      var moveToIndex=-1;
      for (var j=0;j<this.recent.length;j++){
        if (moveToIndex==-1 && bkmk.date>this.recent[j].date){
          moveToIndex=j;
        }
        if (bkmk.url==this.recent[j].url){
          currentIndex=j;
          break;
        }
      }
      if (moveToIndex!=-1){
        if (currentIndex==-1){
          this.recent.splice(moveToIndex,0,bkmk);
          addedbkmk=true;
        }
        else if (moveToIndex>currentIndex && currentIndex!=-1){
          this.recent.splice(currentIndex,1);
          this.recent.splice(moveToIndex,0,bkmk);
          addedbkmk=true;
        }
      }
      if (this.recent.length<10 && !addedbkmk){
        this.recent.push(bkmk);
        addedbkmk=true;
      }
      if (this.recent.length>10)
        this.recent.splice(10,1);
    }
    return addedbkmk;
  },
  updateFrequent: function(bkmk){
    var addedbkmk=false;
    for (var j=0;j<this.frequent.length;j++){
      if (bkmk.freq>this.frequent[j].freq){
        this.frequent.splice(j,0,bkmk);
        addedbkmk=true;
        break;
      }
    }
    if (this.frequent.length<10 && !addedbkmk && bkmk.freq>0){
      this.frequent.push(bkmk);
      addedbkmk=true;
    }
    if (this.frequent.length>10)
      this.frequent.splice(10,1);
    return addedbkmk;
  },
  /*
   * returns a bookmark object. Index can be either the url or index in the bookmarksArray.
   */
  getBookmark: function(index) {
    if (typeof index=='string'){//if its a url
      index=this.isBookmarked(index);
    }
    if (index && index>=0 && index<this.bookmarkArray.length)
      return this.bookmarkArray[index];
    else
      return null;
  },
  /*
   * sets a bookmark at index in bookmarkArray equal to the passed in bookmark
   */
  setBookmark: function(index, aBookmark) {this.bookmarkArray[index]=aBookmark;},
  /*
   * Removes a bookmark. bkmk can be either the index in bookmarkArray or a url. If refresh is true the quicksearch command is sent to all observers(such as the GMarks sidebar)
   * returns the id of the bookmark removed [The bookmark's id is the only parameter taken by Google in order to delete a bookmark]
   */
  removeBookmark: function(bkmk,refresh){
    var idx=typeof bkmk=='number'?bkmk:this.isBookmarked(bkmk.url);
    if (idx>=0) {
      this.removeFromRecent(this.bookmarkArray[idx]);
      this.removeFromFrequent(this.bookmarkArray[idx]);
      var id=this.bookmarkArray[idx].id;
      var url=this.bookmarkArray[idx].url;
      this.bookmarkArray.splice(idx,1);
      this.doCommand('url-removed',url);
      if (refresh) this.doCommand("quickrefresh");
      return id;
    }
    else
      return null;
  },
  /*
   * Adds a bookmark to the bookmarkArray
   */
   addBookmark: function(bkmk,refresh){
    var idx=this.getBookmarkIndex(bkmk);
    if (idx<0){
      idx=-(idx+1)
      this.bookmarkArray.splice(idx,0,bkmk);
    }
    else if (this.bookmarkArray.length==0 || (idx==0 && this.bookmarkArray[0].url!=bkmk.url)){
      this.bookmarkArray.splice(0,0,bkmk);
    }
    this.updateRecent(bkmk)
    if (!this.loading)
      this.doCommand("url-added",bkmk.url);
    if (refresh) this.doCommand("quickrefresh");
    return idx;
   },
  /*
   * Updates a bookmark's details and updates the date in the bookmarkArray.
   * Does NOT submit an update to Google(or any other site)
   * bkmk is a bookmark object
   *
   * returns the index where the bookmark is
   */
  updateBookmark: function(bkmk,refresh,idx, noimage){
    //var d=new Date();
    if (idx==null){
      idx=this.getBookmarkIndex(bkmk);
    }
    var getNewImage=false;
    if (idx<0){
      idx=-(idx+1)
      this.bookmarkArray.splice(idx,0,bkmk);
      if (!this.loading)
        this.doCommand("url-added",bkmk.url);
      getNewImage=true;
    }
    else if (this.bookmarkArray.length==0 || (idx==0 && this.bookmarkArray[0].url!=bkmk.url)){
      this.bookmarkArray.splice(0,0,bkmk);
      getNewImage=true;
    }
    else{
      if (this.bookmarkArray[idx].url==bkmk.url){
        bkmk.image=this.bookmarkArray[idx].image;
      }
      else
        getNewImage=true;
      this.bookmarkArray[idx]=bkmk;
    }
    this.updateRecent(bkmk);
    if (getNewImage && !noimage)
      this.getImage(idx,0);
    if (refresh) this.doCommand("quickrefresh");
    if (idx>=0)
      return idx;
    else
      return -idx;
  },
  //Searches for the bookmark
  getBookmarkIndex: function(value, a, startPos,endPos){//Binary Search
    a=a?a:this.bookmarkArray;
    startPos=startPos?startPos:0; endPos=endPos?endPos: a.length-1;
    var result=null;
    if (this.sortBy=="title")
      result= this.getTitleIndex(value,a,startPos,endPos);
    else if (this.sortBy=="date")
      result= this.getDateIndex(value,a,startPos,endPos);
    else if (this.sortBy=="freq")
      result= this.getFreqIndex(value,a,startPos,endPos);
    return result;
  },
  findBookmarkByTitle: function(value,a,i){
    var j,k;
    for (var j=i;j<a.length;j++){
      if (value.url==a[j].url){
        //dump("found match("+j+" )"+a[j].url+"\n");
        return j;
      }
      else if (value.title!=a[j].title) break;
    }
    for (var k=i;k>=0;k--){
      if (value.url==a[k].url){
        //dump("found match("+k+" )"+a[k].url+"\n");
        return k;
      }
      else if (value.title!=a[k].title) break;
    }
    return -i;
  },
  GM_dump: function(msg,check){
    check=check?check:msg;
    if (check.indexOf("GMarks")>-1 || true){
      //dump(msg);
    }
  },
  getTitleIndex: function(value,a,low,high){
    if (high==-1) return -1;
    var mid, midVal;
    var title=value.title.toLowerCase();
    while (low <= high) {
      mid = Math.floor(low + ((high - low) / 2));
      midVal=a[mid].title.toLowerCase();
      if (title<midVal)
        high = mid - 1;
      else if (title>midVal)
        low = mid + 1;
      else{
        if (value.url==a[mid].url)
          return mid;
        else
          return this.findBookmarkByTitle(value,a,mid);
      }
    }
    if (title<midVal)
      return -mid-1;
    else
      return -mid-2;
  },
  getDateIndex: function(value,a,low,high){
    if (high==-1) return -1;
    var mid, midVal;
    var date=value.date.getTime();
    while (low <= high) {
      mid = Math.floor(low + ((high - low) / 2));
      midVal=a[mid].date.getTime();
      if (date<midVal)
        high = mid - 1;
      else if (date>midVal)
        low = mid + 1;
      else{
        if (value.url==a[mid].url)
          return mid;
        else
          return this.findBookmarkByTitle(value,a,mid);
      }
    }
    if (date>midVal)
      return -mid-1;
    else
      return -mid-2;
  },
  getFreqIndex: function(value,a,low,high){
    if (high==-1) return -1;
    var mid, midVal;
    var freq=value.freq;
    while (low <= high) {
      mid = Math.floor(low + ((high - low) / 2));
      midVal=a[mid].freq;
      if (freq>midVal)
        high = mid - 1;
      else if (freq<midVal)
        low = mid + 1;
      else{
        if (value.url==a[mid].url)
          return mid;
        else
          return this.findBookmarkByTitle(value,a,mid);
      }
    }
    if (freq>midVal)
      return -mid-1;
    else
      return -mid-2;
  },
  queryMatchesBookmark: function(query, bm){
    var realStart;
    var urlPos=0;
    var pChar;
    if ((realStart=bm.title.toLowerCase().indexOf(query))>-1){
      if (realStart==0 || bm.title.substring(realStart-1,realStart)==" ")
        return 0;
      else
        return 1;;
      //break;
    }
    if ((urlPos=bm.url.toLowerCase().indexOf(query))==0){
      return 0;
    }
    if ((realStart=bm.url.indexOf("://"))>-1
        && bm.url.substring(realStart+3,realStart+3+query.length).toLowerCase()==query){
      return 0;
    }
    if (urlPos>0 && (pChar-bm.url.substring(urlPos-1,urlPos))=="." || pChar=="/" || pChar=="-" || pChar=="_" || pChar=="+"){
      return 0;
    }
    if (urlPos>-1){
      return 2;
    }
    if (bm.labels.toString().toLowerCase().indexOf(query)>-1){
      return 3;
    }
    if (bm.notes.toString().toLowerCase().indexOf(query)>-1){
      return 4;
    }
    var qlbls = query.split(/\s*,\s*/);
    var lbls = bm.labels.toString().toLowerCase().split(/\s*,\s*/);
    var matchedLbls = true;
    for (var j = 0;matchedLbls && j<qlbls.length;j++){
      var qlbl = qlbls[j];
      matchedLbls = lbls.some(function(item){
         return item.substring(0,qlbl.length) == qlbl;
      });
    }
    if (matchedLbls){
      return 3;
    }
    return -1;
  },
  //Used by the quick search
  getMatchingBookmarks: function(query, exactQuery){
    var matching=new Array();
    var secondMatching=new Array();
    var url2Matching=new Array();
    var lblsMatching=new Array();
    var notesMatching=new Array();
    var spacesMatching=new Array();
    var matchLevels = [
      matching,
      secondMatching,
      url2Matching,
      lblsMatching,
      notesMatching,
      spacesMatching
    ];
    query=query.toLowerCase();
    for (var i=0;i<this.bookmarkArray.length;i++){
      try{
        var bm=this.bookmarkArray[i];
        var level = this.queryMatchesBookmark(query,bm);
        if (!exactQuery && level == -1 ){
          var words = query.split(/\s+/);
          var matched = true;
          for (var j = 0;matched && j<words.length;j++){
            var word = words[j];
            level = this.queryMatchesBookmark(word,bm);
            matched = level != -1;
          }
          if (matched)
            level = matchLevels.length-1;
          else
            level = -1;
        }
        if (level>-1)
          matchLevels[level].push(bm);
      }
      catch(e){
        Components.utils.reportError("Bookmark search error:\n"+e);
      }
    }
    matching=matching.concat(secondMatching,url2Matching, lblsMatching, notesMatching, spacesMatching);
    //matching=matching.concat(lblsMatching);
    //matching=matching.concat(notesMatching);
    return matching;
  },
  getBookmarkVisits: function(aURL,RDF,HISTDS){
    if (Components.classes["@mozilla.org/browser/nav-history-service;1"]){//FF3
      try{
        var historyService = Components.classes["@mozilla.org/browser/nav-history-service;1"]
                                    .getService(Components.interfaces.nsINavHistoryService);
       var options = historyService.getNewQueryOptions();
       var query = historyService.getNewQuery();
       var ios = Components.classes["@mozilla.org/network/io-service;1"]
                     .getService(Components.interfaces.nsIIOService);
       query.uri = ios.newURI(aURL, null, null);
       var result = historyService.executeQuery(query, options);
       var cont=result.root;
       cont.containerOpen = true;
       if (cont.childCount>0)
         return cont.getChild(0).accessCount;
      }
      catch(e){/* History error/malformed uri */}
    }
    else{
      var kRDFLITIID = Components.interfaces.nsIRDFLiteral;
      var kRDFINTIID = Components.interfaces.nsIRDFInt;
      var NC_NS = "http://home.netscape.com/NC-rdf#";
      var rSource = RDF.GetResource(aURL);
      var nameArc = RDF.GetResource(NC_NS+"Name");
      var urlArc = RDF.GetResource(NC_NS+"URL");
      var visitArc = RDF.GetResource(NC_NS+"VisitCount");
      var rName     = HISTDS.GetTarget(rSource, visitArc, true);
      var visits  = rName ? rName.QueryInterface(kRDFINTIID).Value : -1;
      return visits;
    }
    return -1;
  },
  //Functions used to query the bookmarkArray
  getBookmarkById: function(id){
    var i;
    for (i=0; i < this.bookmarkArray.length; i++)
    if (this.bookmarkArray[i].id == id)
      return this.bookmarkArray[i];
    return false;
  },
  getBookmarksByLabel: function(label) {
    var i, j;
    var ret = new Array();
    for (i=0; i < this.bookmarkArray.length; i++)
      for (j=0; j < this.bookmarkArray[i].labels.length; j++)
        if (this.bookmarkArray[i].labels[j] == label)
          ret.push(this.bookmarkArray[i]);
    return ret;
  },
  getLabels: function() {
    var i, j;
    var ret = new Array();
    var source=this.bookmarkArray;
    for (i=0; i < this.bookmarkArray.length; i++) {
      for (j=0; j < this.bookmarkArray[i].labels.length; j++)
        if (!this.hasLabel(ret,this.bookmarkArray[i].labels[j]))
          ret.push(this.bookmarkArray[i].labels[j]);
    }
    if (this.sortBy=="title" || true){
      //Sort labels alphabetically
      ret.sort(function (x, y){
        if (x.toString().toLowerCase() < y.toString().toLowerCase())
          return -1;
        else if (x.toString().toLowerCase() > y.toString().toLowerCase())
          return 1;
        return 0;
      });
    }
    return ret;
  },
  hasLabel: function(ret, label) {
    for (var i=0;i < ret.length; i++){
      if (ret[i] == label)
        return true;
    }
    return false;
  },
  isBookmarked: function(url) {
    var i;
    for (i=0; i < this.bookmarkArray.length; i++)
      if (this.bookmarkArray[i].url == url)
        return i;

    return false;
  },
  getUnlabeled: function(){
    var ret=new Array();
    for (var i=0; i < this.bookmarkArray.length; i++)
      if (this.bookmarkArray[i].labels.length==0)
        ret.push(this.bookmarkArray[i]);

    return ret;
  },
  isInToolbar: function(bkmk){
    if (this.toolbarFolder.length==0)
      return false;
    if (bkmk.labels.indexOf(this.toolbarFolder)>-1)
      return true;
    for (var i=0;i<bkmk.labels.length;i++){
      if (bkmk.labels[i]+this.nestedChar==
          this.toolbarFolder.substring(0,bkmk.labels[i].length+this.nestedChar.length))
        return true;
    }
    return false;
  },
  /*
   * Util function used to alert/prompt the user, check if text is selected, etc.
   */
  getBrowserWindow: function(){
    var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].
        getService();
    var windowManagerInterface = windowManager.QueryInterface(
        Components.interfaces.nsIWindowMediator);
    var topWindowOfType = windowManagerInterface.getMostRecentWindow(
        "navigator:browser" );
    return topWindowOfType;
  },
  alertUser: function(msg){
    var browser=this.getBrowserWindow();
    browser.alert(msg);
  },
  //Required
  QueryInterface: function(iid) {
    if (!iid.equals(Components.interfaces.nsISupports) &&
      !iid.equals(GMARKS_IID))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
};
function debug(msg,force){
  if (force){
    dump(msg);
  }
  else{
    //dump(msg);
  }
}
function imageURIChecker(idx,type, url)
{
  this.idx  = idx;
  this.type = type;
  this.url  = url;
}

imageURIChecker.prototype =
{
  onStartRequest: function(request, context) {
    /* Check for redirect */
    context = context.QueryInterface(Components.interfaces.nsIURI);
    var startUrl = context.spec.substring(context.spec.indexOf(context.scheme)+context.scheme.length+3);
    var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                           .getService(Components.interfaces.nsIIOService);
    var endUri = ioservice.newURI(request.name, null, null);
    var endUrl = request.name.substring(request.name.indexOf(endUri.scheme)+endUri.scheme.length+3)
    if (endUri.path.indexOf(".ico")<0){
      const NS_BINDING_ABORTED = 0x804b0002;
      request.cancel(NS_BINDING_ABORTED);
      //throw "GMarks URI Checker: No favicon exists";
    }
  },
  onStopRequest: function(request, context, status)
  {
    if (status==0){
      if (this.type==0){
        var idx=this.idx;
        while(
          idx<gGMarks.bookmarkArray.length &&
          this.url!=gGMarks.bookmarkArray[idx].url){
          idx++;
        }
        if (idx<gGMarks.bookmarkArray.length && idx>=0){
          gGMarks.bookmarkArray[idx].image=request.name;
          if (gGMarks.isInToolbar(gGMarks.bookmarkArray[idx]))
            gGMarks.doCommand("updateToolbarImage",gGMarks.bookmarkArray[idx].id+"\n"+
                gGMarks.bookmarkArray[idx].image);
        }
      }
      else{
        if (gGMarks.searchArray!=null && gGMarks.searchArray.length>this.idx){
          gGMarks.searchArray[this.idx].image=request.name;
        }
      }
    }
    else{
      if (this.type==0){
        if (this.idx<gGMarks.bookmarkArray.length && this.idx>=0)
          gGMarks.bookmarkArray[this.idx].image=null;
        else
          Components.utils.reportError("Error with image uri checker: "+this.idx);
      }
      else{
        gGMarks.searchArray[this.idx].image=null;
      }
    }
  }
}
var nsGMarksServiceModule = {
  registerSelf: function(compMgr, fileSpec, location, type) {
    compMgr =
    compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(GMARKS_CID,
                    "GMarks",
                    GMARKS_CONTRACTID,
                    fileSpec,
                    location,
                    type);
  },
  unregisterSelf: function(aCompMgr, aLocation, aType)
  {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(GMARKS_CID, aLocation);
  },
  getClassObject: function(compMgr, cid, iid) {
    if (!cid.equals(GMARKS_CID))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    if (!iid.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    return nsGMarksServiceFactory;
  },
  canUnload: function(compMgr) { return true; }
};
var nsGMarksServiceFactory = {
  createInstance: function (aOuter, aIID)
  {
  if (aOuter != null)
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  if (gGMarks == null){
    gGMarks = new nsGMarksService();
  }
  return gGMarks.QueryInterface(aIID);
  }
};
function NSGetModule() {
  return nsGMarksServiceModule;
}

function NSGetFactory() {
  return nsGMarksServiceFactory;
}