var GMS;
var txt;
var results=new Array();
var position=0;
var lblPopup;
var lastKeyPress=0;
var strbundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService)
          .createBundle("chrome://gmarks/locale/gmarks.properties");
var statusImg;
var qsObserver=null;
function closeSearch(){
  var d=new Date();
  var time=d.valueOf();
  if (time-lastKeyPress<700){
    doGMQSUnload();
  }
  else
    lastKeyPress=time;
}

function handleKeypress(event){
  var keycode=event.keyCode;
  if (keycode==13){
    //Enter
    if (results.length>0)
      openBookmark(results[position].url,event);
    else{/* Act like URL bar */
      var url = txt.value;
      doGMQSUnload();
      var where=event.altKey?"tab":whereToOpenLink(event,false,true);
      openUILinkIn(url,where,true);

      // Firstly, fixup the url so that (e.g.) "www.foo.com" works
      //const nsIURIFixup = Components.interfaces.nsIURIFixup;
      //if (!gURIFixup)
      //  gURIFixup = Components.classes["@mozilla.org/docshell/urifixup;1"]
      //                                .getService(nsIURIFixup);
      //url = gURIFixup.createFixupURI(url, nsIURIFixup.FIXUP_FLAGS_MAKE_ALTERNATE_URI).spec;
    }
  }
  else if (keycode==38){
    //Up
    lblPopup.childNodes[position].className="gmPopupNormal";
    position--;
    if (position<0) position=results.length-1;
    var selectedItem=lblPopup.childNodes[position];
    selectedItem.className="gmPopupSelected";
    var arrowbox=document.getAnonymousElementByAttribute(lblPopup,"class","popup-internal-box");
    arrowbox.ensureElementIsVisible(selectedItem);
  }
  else if (keycode==40){
    //Down
    lblPopup.childNodes[position].className="gmPopupNormal";
    position++;
    if (position>=results.length) position=0;
    var selectedItem=lblPopup.childNodes[position];
    selectedItem.className="gmPopupSelected";
    var arrowbox=document.getAnonymousElementByAttribute(lblPopup,"class","popup-internal-box");
    arrowbox.ensureElementIsVisible(selectedItem);
  }
}

function qsHandleKeyUp(event){
  if (GMS.qsKeyCode==event.keyCode){
    closeSearch();
  }
  else if (event.keyCode==27){
    doGMQSUnload();
  }
}
window.addEventListener('keyup',qsHandleKeyUp,false);

function onMouseOver(i){
  lblPopup.childNodes[position].className="gmPopupNormal";
  position=i;
  lblPopup.childNodes[position].className="gmPopupSelected";
}

function onTooltipShowing(event){
  var tooltip=event.target;
  var title=document.createElement('description');
    title.setAttribute('value',strbundle.GetStringFromName('title')+" "+results[position].title);
  var url=document.createElement('description');
    url.setAttribute('value',strbundle.GetStringFromName('url')+" "+results[position].url);
  var lbls=document.createElement('description');
    lbls.setAttribute('value',strbundle.GetStringFromName('labels')+" "+results[position].labels);
  var notes=document.createElement('description');
    notes.setAttribute('value',strbundle.GetStringFromName('notes')+" "+results[position].notes);

  tooltip.appendChild(title);
  tooltip.appendChild(url);
  tooltip.appendChild(lbls);
  tooltip.appendChild(notes);
}

function onTooltipHidden(event){
  var tooltip=event.target;
  for (var i=tooltip.childNodes.length-1;i>=0;i--){
    tooltip.removeChild(tooltip.childNodes[i]);
  }
}

function doQuickSearchBookmarks(){
  var query=txt.value;
  position=0;
  if (query.length>0 && GMS.bookmarkArray.length>0){
    for (var i=lblPopup.childNodes.length-1;i>=0;i--){
      lblPopup.removeChild(lblPopup.childNodes[i]);
    }
    results=GMS.getMatchingBookmarks(query);
    if (results.length>0){
      for (var i=0;i<results.length;i++){
        var vbox=document.createElement("vbox");
        var hbox=document.createElement("hbox");
        hbox.setAttribute("flex","1");
        vbox.setAttribute("flex","1");
        vbox.setAttribute("style","padding: 2px;");
        var mainlbl=document.createElement("label");
        mainlbl.setAttribute("value",results[i].title+" - "+results[i].url);
        if (GMS.showIcons){
          var img=document.createElement("image");
          if (results[i].image!=null){
            var img=document.createElement("image");
            img.setAttribute("style",'list-style-image: url("'+results[i].image+'");');

          }else{
            img.setAttribute("style",
              'list-style-image: url("chrome://global/skin/icons/folder-item.png"); -moz-image-region: rect(0px, 16px, 16px, 00px) !important;');
          }
          img.setAttribute("width", "16");
          img.setAttribute("height","16");
          hbox.appendChild(img);
        }
        hbox.appendChild(mainlbl);
        vbox.appendChild(hbox);
        if (results[i].notes!=null && results[i].notes.length>0){
          var notes=document.createElement("label");
          notes.setAttribute("value",results[i].notes);
          notes.setAttribute("style","padding-left: 35px;");
          vbox.appendChild(notes);
        }
        //vbox.setAttribute("oncommand",'openBookmark("'+results[i].url+'",event);');
        vbox.setAttribute("onclick",'if (event.button!=2) openBookmark("'+results[i].url+'",event);');
        vbox.setAttribute("onmouseover",'onMouseOver('+i+');');
        vbox.setAttribute('value',i);
        vbox.setAttribute('id',"r_"+i);
        vbox.setAttribute('tooltip','gmqsTooltip');

        if (i>0) vbox.className="gmPopupNormal";
        else vbox.className="gmPopupSelected";

        lblPopup.appendChild(vbox);

      }

      lblPopup.showPopup(txt,txt.boxObject.screenX-20,txt.boxObject.screenY+txt.boxObject.height,"popup");
    }
    else
      lblPopup.hidePopup();
  }
  else{
    lblPopup.hidePopup()
  }
}

function openBookmark(url,event){
  var bookmarkPrefs=Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("extensions.tabmix.");
  var gmarksPrefs=Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
  var bkmkNewTab;
  try{
    bkmkNewTab=bookmarkPrefs.getBoolPref("opentabfor.bookmarks");
  }
  catch(e){bkmkNewTab=false;}
  bkmkNewTab=bkmkNewTab || gmarksPrefs.getBoolPref('.openinnewtab') || event.altKey;
  doGMQSUnload();
  if (!bkmkNewTab){
    openUILink(url,event,false,true);
  }
  else{
    if (event.shiftKey==true)
      openUILinkIn(url,"tabshifted");
    else
      openUILinkIn(url,"tab");
  }
}

function doGMQSLoad(){
  GMS=Components.classes["@mozilla.org/gmarks;1"]
                     .getService(Components.interfaces.nsIGMarksService).wrappedJSObject;
    if (GMS.qsKey!="Home"){
      var lbl=document.getElementById("qSearchLabel");
      lbl.value=lbl.value.replace('Home',GMS.qsKey);
    }
  txt=document.getElementById("gmarks-txtQuickSearch");
  lblPopup=document.getElementById("gmqsResults");
  setTimeout(function(){txt.focus()},0);
  statusImg=document.getElementById("statusImg");

  if (GMS.recievedBookmarks==0 && !GMS.isSignedIn && GMS.bookmarkArray.length==0){
    if (GMS.checkSignedCookie()){
      statusImg.setAttribute("hidden","false");
      qsObserver=new GM_QSObserverControl();
      GMS.getBookmarksFeed("onload",true);
    }
    else{
      var prefs = Components.classes["@mozilla.org/preferences-service;1"].
          getService(Components.interfaces.nsIPrefService).
          getBranch("gmarks");
      var auto=prefs.getBoolPref(".signin");
      if (auto){
        var pass=GMS.getPassInfo();
        if (pass){
          statusImg.setAttribute("hidden","false");
          qsObserver=new GM_QSObserverControl();
          GMS.onSignIn(false,pass.user,pass.password,"onload",false);
        }

      }
    }
  }
}

function doGMQSUnload(){
  lblPopup.hidePopup
  if (qsObserver!=null)
    qsObserver.unregister();
  window.close();
}

function GM_QSObserverControl()
{
  this.register();
}
GM_QSObserverControl.prototype = {
    observe: function(subject, topic, data) {
    if (topic=="gmarks-onload"){
      statusImg.setAttribute("hidden","true");
    }
    },
    register: function() {
      var observerService = Components.classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);
      observerService.addObserver(this, "gmarks-onload", false);
    },
    unregister: function() {
      var observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
      observerService.removeObserver(this, "gmarks-onload");
  }
}
window.addEventListener('load',doGMQSLoad,false);
