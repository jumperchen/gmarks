var GMS = Components.classes["@mozilla.org/gmarks;1"]
  .getService(Components.interfaces.nsIGMarksService).wrappedJSObject;
var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("gmarks.");
var strbundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService)
          .createBundle("chrome://gmarks/locale/gmarks.properties");

var AllLabels;
var bkmks=new Array();
/* Editing */
var originalBkmk=null;
/* Auto Complete variables */
var labelTextbox;
var matched=new Array();
var selStart;
var selEnd;
var position;
var lblPopup=null;
var cancelExit=false;
/* Loading...
The passed in grid is a grid element containing the gmarks elements
in the editbookmark window, its the only grid
in the addBookmarkOverlay, its the second grid
*/
function  gmarksAddEditLoad(grid){
  AllLabels=GMS.getLabels();
  lblPopup=document.getElementById("labelAutoComplete-popup");
  if (lblPopup==null)
    lblPopup=document.getElementsByAttribute("id","labelAutoComplete-popup")[0];
}
/* Adding just one bookmark
addeditmode, adding=0, editing=1
The passed in grid is a grid element containing the gmarks elements
*/
function gmarksAddEditBookmark(grid, addeditmode, aURL, aName, aLabels, aNotes, aMode){
  var bkmk;
  var menulist=null;
  if (GMS.mode=="simpy"){//Show visibility option
    var visRow=grid.getElementsByAttribute("id","visRow")[0];
    visRow.setAttribute("hidden","false");
    menulist=document.getElementsByAttribute("id","visList")[0];
    menulist.selectedIndex=GMS.com.visibility;
  }
  if (addeditmode==1){
    bkmk=GMS.createNewBookmark();
    bkmk.title=aName;
    bkmk.url=aURL;
    bkmk.labels=aLabels;
    bkmk.notes=aNotes;
    bkmk.mode=aMode;
  } else{
    var index=GMS.isBookmarked(aURL);
    if (index){
      bkmk=GMS.bookmarkArray[index];
      if (gArg){
        gArg.name=bkmk.title;
        gArg.labels=bkmk.labels;
        gArg.description=bkmk.notes;
      }
    }
    else{
      bkmk=GMS.createNewBookmark(0,aURL,aName,aLabels,aNotes);
    }
    var selection=getBrowserSelection();
    if (selection!=null && selection.length>0)
      bkmk.notes=selection;
  }
  if (bkmk.mode!=null && bkmk.mode>-1 && menulist!=null){
    menulist.selectedIndex=bkmk.mode;
  }

  var txts=grid.getElementsByTagName("textbox");
  var lblBox=txts[2];
  loadFilters();
  if (addeditmode==0){//aka adding, not editing.
    bkmk=getSuggestedLabels(AllLabels,bkmk);
    if (bkmk.newLabels && bkmk.newLabels.length>0){
      if (bkmk.labels!=null && bkmk.labels.length!=0){
        var lblLabels=grid.childNodes[1].childNodes[2].childNodes[1].childNodes[0].childNodes[0];//txts[2].previousSibling();//document.getElementById('lblLabels');
        lblLabels.setAttribute('hidden','false');
        lblLabels.value=bkmk.labels;
      }

      lblBox.value=bkmk.newLabels+", ";
      lblBox.setSelectionRange(0,lblBox.textLength);
    }
    else
      lblBox.value=bkmk.labels;
  }
  else{
    bkmk=checkFilters(bkmk);
    lblBox.value=bkmk.labels;
  }

  lblBox.focus();
  labelTextBox=lblBox;
  txts[0].value=bkmk.title;
  txts[1].value=bkmk.url;
  txts[3].value=bkmk.notes;
}
/* Adding multiple urls, generally from Ctrl+Shift+D */
function gmarksAddBookmarks(grid){
  loadFilters();
  var rows=grid.getElementsByTagName("row");
  var rowList=rows[0].parentNode;

  rowList.removeChild(rows[4]);
  //rowList.removeChild(rows[3]);
  rowList.removeChild(rows[1]);
  rowList.removeChild(rows[0]);

  labelTextBox=grid.getElementsByTagName("textbox")[0];
  labelTextBox.value="[Label Name]";

  var chkRow=document.createElement('row');
  var chkFilters=document.createElement('checkbox');
  chkFilters.setAttribute('label',strbundle.GetStringFromName('applyFilters'));
  chkFilters.setAttribute('checked',"true");
  chkFilters.setAttribute('id',"chkFilters");
  chkRow.appendChild(document.createElement('spacer'));
  chkRow.appendChild(chkFilters);
  rowList.appendChild(chkRow);
}

/* Saving Bookmark */
function gmarksSaveBookmark(aID)
{
  var grid=document.getElementsByAttribute("id","gmarksgrid")[0];
  var txts=grid.getElementsByTagName("textbox");

  var title=txts[0].value;
  var url=txts[1].value;
  if (!url || url=="") return false;//it has to have a url, other values are optional.
  var labels="";
  var lblLbls=txts[2].previousSibling.value;
  var txtLbls=txts[2].value;
  if (lblLbls){
    labels=lblLbls;
    if (txtLbls) labels+=","+txtLbls;
    labels=labels.split(/,\s*/);
  }
  else if (txtLbls) labels=txtLbls.split(/,\s*/);
  for (var i=0;i<labels.length;i++){
    labels[i]=labels[i].replace(/^\s*|\s*$/g,"");
    if (labels[i].length==0 || labels[i]==" " || labels[i].match(/^\s+$/))
      labels.splice(i,1);
  }
  var notes=txts[3].value;
  var visibility=GMS.visibility;
  if (GMS.mode=="simpy"){
    var visList=document.getElementsByAttribute("id","visList")[0]
    visibility=visList.selectedIndex;
  }
  try{
    if (gArg){
      gName.value=title;
      gArg.url=url;
      gArg.description=notes;
    }
  }
  catch(e){}
  var bm=null;
  var idx=-1;
  if (originalBkmk){
    if (originalBkmk.url!=url){
      GMS.com.onRemoveBookmark(originalBkmk);
    }
    var idx=GMS.getBookmarkIndex(originalBkmk);
    if (idx>-1){
      bm=GMS.bookmarkArray[idx];
      var origtitle=bm.title;
      var obj2=new Array();
      obj2.push({type: "title",title: originalBkmk.title});
      obj2.push({type: "url",url: originalBkmk.url});
      obj2.push({type: "labels",labels: originalBkmk.labels.toString()});
      obj2.push({type: "notes",notes: originalBkmk.notes});
      /* Create a bookmark action so it can be undone */
      GMS.generateBkmkAction("bookmark","properties", bm,obj2);

      if (originalBkmk.url!=url) bm.id=0;
      bm.url=url;
      bm.title=title;
      bm.labels=labels; bm.notes=notes;
      bm.mode=visibility;
      bm.date=new Date();
      if ((bm.title!=origtitle && GMS.sortBy=="title") ||
          GMS.sortBy=="date"){
        //Move to new location
        GMS.removeBookmark(idx);
        GMS.addBookmark(bm);
      }
      else
        GMS.updateRecent(bm);
      GMS.sendUpdateBookmark(bm);
      GMS.doCommand("quickrefresh");
    }
  }
  if (idx<=-1){//New bkmk
    bm=GMS.createNewBookmark(aID,url,title,labels,notes);
    bm.mode=visibility;
    GMS.tabGroup=[bm];
    Components.classes["@mozilla.org/observer-service;1"]
         .getService(Components.interfaces.nsIObserverService)
         .notifyObservers(null, "star-change", "on");
  }
  return true;
}
/* Saving BookmarkS */
function gmarksSaveBookmarks(){
  var labels=labelTextBox.value.split(/\s*,\s*/);
  for (var i=0;i<labels.length;i++){
    labels[i]=labels[i].replace(/^\s*|\s*$/g,"");
    if (labels[i].length==0 || labels[i]==" " || labels[i].match(/^\s+$/))
      labels.splice(i,1);
  }
  var visibility=GMS.visibility;
  if (GMS.mode=="simpy"){
    var visList=document.getElementsByAttribute("id","visList")[0]
    visibility=visList.selectedIndex;
  }
  var useFilters=document.getElementById('chkFilters').checked;
  bkmks=new Array();
  for (var i=0;i<gArg.objGroup.length;i++){
    var bm=GMS.createNewBookmark(0,gArg.objGroup[i].url,
                     gArg.objGroup[i].name,
                     labels.slice(),"");
    bm.mode=visibility;
    if (useFilters) {
      bm=getSuggestedLabels(AllLabels,bm);//Apply Filters
      for (var b=0;b<bm.newLabels.length;b++){
        bm.labels.push(bm.newLabels[b]);
      }
    }
    bkmks.push(bm);
  }
  //setTimeout(function(){
  Components.classes["@mozilla.org/observer-service;1"]
         .getService(Components.interfaces.nsIObserverService)
         .notifyObservers(null, "star-change", "on");
  GMS.tabGroup=bkmks;
  //},10);
  return true;
}

/* Auto Complete */
function doLabelAutoComplete(){
  var txtbox=labelTextBox;
  var val=txtbox.value;
  var point=txtbox.selectionEnd;
  var end;
  if (!txtbox.selectionStart!=point){
    var curLabel="";
    var pos=val.substring(0,point).lastIndexOf(",");
    if (pos>-1){
      if (pos<val.length-1){
        curLabel=val.substring(pos+1,point).replace(/^\s*|\s*$/g,"");
        start=pos+1;
      }
    }
    else{
      start=0;
      curLabel=val.substring(0,point);
    }
    if (!curLabel==""){
      curLabel=curLabel.toLowerCase();
      matched=new Array();

      for(var i=0;i<AllLabels.length;i++){
        var lbl=AllLabels[i].toLowerCase();
        var pos2=lbl.indexOf(curLabel);
        var match;
        if (pos2==0 || (pos2>1 && ((match=lbl.substring(pos2-GMS.nestedChar.length,pos2))==GMS.nestedChar || match==" "))){
          matched.push(AllLabels[i]);
        }
      }
      selStart=start; selEnd=point;
      if (matched.length>0)
        createAndShowPopup(curLabel,txtbox);
      else{
        matched=new Array();
        lblPopup.hidePopup();
      }
    }
    else{
      matched=new Array();
      lblPopup.hidePopup();
    }
  }
  else{
    matched=new Array();
    lblPopup.hidePopup();
  }
}
/* Auto Complete popup */
function createAndShowPopup(current,parent){
  for (var i=lblPopup.childNodes.length-1;i>=0;i--){
    lblPopup.removeChild(lblPopup.childNodes[i]);
  }
  position=0;
  for (var i=0;i<matched.length;i++){
    var vbox=document.createElement("vbox");
    vbox.setAttribute("flex","1");
    vbox.setAttribute("style","padding: 2px;");
    var mainlbl=document.createElement("label");
    mainlbl.setAttribute("value",matched[i]);
    vbox.appendChild(mainlbl);
    vbox.setAttribute("onclick",'lblComplete("'+matched[i]+'");');
    vbox.setAttribute("onmouseover",'onMouseOver('+i+');');
    if (i==0)
      vbox.className="gmPopupSelected";
    else
      vbox.className="gmPopupNormal";
    lblPopup.appendChild(vbox);
  }

  lblPopup.showPopup(parent,parent.boxObject.screenX,parent.boxObject.screenY+parent.boxObject.height,"popup");
}
function handleKeypress(event){
  var keycode=event.keyCode;
  if (keycode==13){
    //Enter
    if (matched.length>0){
      lblComplete(matched[position]);
      event.stopPropagation();
      cancelExit=true;
    }
  }
  else if (keycode==38){
    //Up
    lblPopup.childNodes[position].className="gmPopupNormal";
    position--;
    if (position<0) position=matched.length-1;
    lblPopup.childNodes[position].className="gmPopupSelected";
  }
  else if (keycode==40){
    //Down
    lblPopup.childNodes[position].className="gmPopupNormal";
    position++;
    if (position>=matched.length) position=0;
    lblPopup.childNodes[position].className="gmPopupSelected";
  }
  event.stopPropagation();
}
function onMouseOver(i){
  lblPopup.childNodes[position].className="gmPopupNormal";
  position=i;
  lblPopup.childNodes[position].className="gmPopupSelected";
}
function lblComplete(label){
  var txtbox=labelTextBox;
  var val=txtbox.value;
  txtbox.value=val.substring(0,selStart)+label+", "+val.substring(selEnd);
  matched=new Array();
  lblPopup.hidePopup();
}
function hidePopup(){
  if (lblPopup!=null)
    lblPopup.hidePopup();
}

/* Filters && Suggestions */
function getSuggestedLabels(allLabels, bkmk){
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("gmarks.");
  if (prefs.getBoolPref('suggest')==true){
    var suggested=new Array();//Array of labels that might fit the current bookmark.
    var cTitle=bkmk.title.toLowerCase();
    var titleParts=cTitle.replace("-"," ").split(/\s+/);
    for (var i=0;i<allLabels.length;i++){
      var regexp=new RegExp(GMS.nestedChar);
      var lblWords=allLabels[i].split(regexp);
      if (cTitle==allLabels[i].toLowerCase()){
        suggested.push(allLabels[i]);
      }
      else{
        var hasmatch=false;
        lblWords.forEach(function(word,index,arr){
          var matched=false;
          titleParts.forEach(function(part,index2,arr2){
            if (part==word.toLowerCase() && !matched){
              matched=true;
              var newlbl=arr[0];
              for(var j=1;j<=index;j++)
                newlbl+=GMS.nestedChar+arr[j];

              if (suggested.indexOf(newlbl)==-1)
                suggested.push(newlbl);
            }
          });
          if (matched && index>0 && hasmatch){
            suggested.splice(suggested.length-2,1);
          }
          else if (matched) hasmatch=true;
        });
      }
    }
    //Make sure we don't suggest a label thats already added
    for (var i=0;i<bkmk.labels.length;i++){
      for (var j=0;j<suggested.length;j++){
        if (suggested[j]==bkmk.labels[i]){
          suggested.splice(j,1);
          break;
        }
      }
    }
    bkmk.newLabels=suggested;
  }
  bkmk=checkFilters(bkmk);
  return bkmk;
}

function checkFilters(bkmk){
  for (var i=0;i<filters.length;i++){
    if (filters[i].matches(bkmk)){
      bkmk=filters[i].applyFilter(bkmk);
    }
  }
  return bkmk;
}

/* Util Functions */
function getBrowserSelection(){
  var w=getTopWin();
  var browser = w.document.getElementById("content");
  return w.content.getSelection().toString();
}
function getTopWin()//For the notes!
{
    var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService();
    var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator);
    var topWindowOfType = windowManagerInterface.getMostRecentWindow( "navigator:browser" );

    if (topWindowOfType) {
        return topWindowOfType;
    }
    return null;
}

function d(s){
  //dump(s+'\n');
}
