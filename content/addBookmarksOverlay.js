var GMarksNameBox;
var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("gmarks.");

var strbundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService)
					.createBundle("chrome://gmarks/locale/gmarks.properties");

var GMS = Components.classes["@mozilla.org/gmarks;1"]
                     .getService(Components.interfaces.nsIGMarksService).wrappedJSObject;

var toBoth;
var closeWindow=false;
var showBookmarksTree=false;
function gmarksAddBookmarkLoad(){//Note, startup is called first
	var show=false;
  var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                      .getService(Components.interfaces.nsIXULAppInfo);
  var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                 .getService(Components.interfaces.nsIVersionComparator);
  var FF3 = (versionChecker.compare(appInfo.version, "3.0a") >= 0);
	if (gArg.feedURL) show=false;
	else if (gArg.bNeedKeyword) show=false;
	else show=prefs.getBoolPref('ctrlD') && !FF3;
	//show=false;
	if (show){
		toBoth=document.getElementsByTagName("checkbox")[0];
		var grids=document.getElementsByTagName("grid");
		var gmarksgrid=grids[1];
		var seps=document.getElementsByTagName("separator");
		var tabpanels=document.getElementsByTagName("tabpanel");
		//var foldertree=document.getElementById("folder-tree");

		tabpanels[0].appendChild(seps[0]);
		tabpanels[0].appendChild(grids[0]);
		tabpanels[0].appendChild(seps[1]);

		gBookmarksTree.id="folder-tree2";
		gBookmarksTree.hidden=true;

		var newtree=document.createElement("bookmarks-tree");
		newtree.id="folder-tree";
		newtree.flex=1;
		newtree.collapsed=true;
		newtree.selType="single";
		newtree.persist="height";
		newtree.setAttribute("type","folders");
		newtree.setAttribute("rows","6");
    newtree.setAttribute("onselect","selectTreeFolder();");
		gBookmarksTree=tabpanels[0].appendChild(newtree);
		//gBookmarksTree.parentNode.removeChild(gBookmarksTree);
		//tabpanels[0].appendChild(gBookmarksTree);
		/*
		 <bookmarks-tree id="folder-tree" flex="1" type="folders" collapsed="true"
                  seltype="single" persist="height" rows="6"
                  onselect="selectTreeFolder();"/>
		*/

		//The inputField of the keyword textbox disapears when its moved,
		//this is the only way I know of to fix it, since inputField is read only
		var keywordTxt=document.createElement("textbox");
		keywordTxt.setAttribute("id","keyword");
		keywordTxt.setAttribute("oninput","onFieldInput();");
		gKeyword.parentNode.replaceChild(keywordTxt,gKeyword);
		gKeyword=keywordTxt;

		var main=document.getElementById("addBookmarkDialog");
		main.setAttribute('ondialogaccept','return doOKSwitch(event);');

		fixExpandTree();

		//General Stuff
		gmarksAddEditLoad(grids[1]);
		if (!gArg.bBookmarkAllTabs)
			gmarksAddEditBookmark(grids[1],0,gArg.url,gArg.name,gArg.labels,gArg.description);
		else
			gmarksAddBookmarks(grids[1]);
			//setupGMarksForTabs()
		selectLastTab();
	}
	else{
		var tabbox=document.getElementsByTagName("tabbox")[0];
		tabbox.parentNode.removeChild(tabbox);
	}
	sizeToContent();
	setResizable(true);
}

function selectLastTab(){
  var selected=gArg.selectedTab;
  try{
    if (!selected)
      selected=prefs.getIntPref('addbookmark.lastSelectedTab');
  }catch(e){
    selected = 0;
  }
  document.getElementsByTagName("tabbox")[0].selectedIndex=selected!=2?selected:1;
  if (selected==0){
    toBoth.setAttribute('disabled','true');
    gName.select();
    gName.focus();
    setTimeout(function(){gName.focus();},1000);
  }
  else{
    toBoth.setAttribute('disabled','false');
    var grid=document.getElementsByAttribute("id","gmarksgrid")[0];
    var txts=grid.getElementsByTagName("textbox");
    var lblBox=txts[2];
    setTimeout(function(){lblBox.focus();},0);
    if (selected==2) toBoth.setAttribute('checked','true');
  }
}

//Stops it from shrinking the window when minimizing the tree
//replaces resizeTo with sizeToContent
function fixExpandTree()
{
	var newFunct=expandTree.toString().
      replace("resizeTo(window.outerWidth, window.outerHeight + (willCollapse ? - WSucks : + WSucks));","sizeToContent();");
      //replace('resizeTo(window.outerWidth, window.outerHeight+(willCollapse?-WSucks:+WSucks));', 'sizeToContent();');
    //dump("NewFunct: "+newFunct+"\n");
    eval("expandTree = " + newFunct);
    //dump("ExpandTree: "+expandTree.toString()+"\n");
}

function TabSelected(){
	var tabs=document.getElementsByTagName("tabs")[0];
	if (!toBoth) toBoth=document.getElementsByTagName("checkbox")[0];
	if (tabs.selectedIndex==0)
		ffTabSelected();
	else
		gmarksTabSelected();
}

//collapse folder tree and get rid of 'new folder' button
function gmarksTabSelected(){
	if (!gBookmarksTree.collapsed){
		showBookmarksTree=true;
		document.documentElement.buttons = "accept,cancel";
	    WSucks = gBookmarksTree.boxObject.height;
		gBookmarksTree.collapsed = true;
		var outerwidth=window.outerWidth;
		sizeToContent();
		resizeTo(outerwidth,window.outerHeight);
	}
	toBoth.setAttribute('disabled','false');
}
function ffTabSelected(){
	if (showBookmarksTree){
		setFolderTreeHeight();
		document.documentElement.buttons = "accept,cancel,extra2";
	    if (!gBookmarksTree.treeBoxObject.view.isContainerOpen(0))
	      gBookmarksTree.treeBoxObject.view.toggleOpenState(0);
	    selectFolder(gSelectedFolder);
	    gBookmarksTree.focus();
		gBookmarksTree.collapsed = false;
		var outerwidth=window.outerWidth;
		sizeToContent();
		resizeTo(outerwidth,window.outerHeight);
	}
	showBookmarksTree=false;
	toBoth.setAttribute('disabled','true');
}

function doOKSwitch(s){
	//dump("doOKSwitch: "+cancelExit+"|"+closeWindow+"\n");
	if (!cancelExit){
		if (closeWindow==true) {
			return true;
		}
		else{
			var selected=document.getElementsByTagName("tabbox")[0].selectedIndex;
			//Save last used tab.
			if (selected==1 && toBoth.checked==true) selected=2;
			prefs.setIntPref('addbookmark.lastSelectedTab',selected);

			if (selected==0){//Firefox
				var ret=onOK();
				return ret;
			}
			else{//GMarks
				return doOKGMarks();
			}
		}
	}
	else{
		cancelExit=false;
		return false;
	}
}
function doOKGMarks(){
	var val;

	if (gArg.bBookmarkAllTabs){
		val = gmarksSaveBookmarks();
	}else
		val = gmarksSaveBookmark();

	if (toBoth.checked){
		onOK();
	}
	return val;
}

function gmarksAddBookmarkUnload(){
	var isCollapsed = gBookmarksTree.collapsed;
	//if (!isCollapsed)
	//	gBookmarksTree.setAttribute("height", gBookmarksTree.boxObject.height);
	//gBookmarksTree.collapsed=false;
	//gBookmarksTree.parentNode.removeChild(gBookmarksTree);
	//gBookmarksTree=null;
	gName=null;
	gKeywordRow=null;
	gKeyword=null;
	gExpander=null;
	gMenulist=null;
}
window.addEventListener('load', gmarksAddBookmarkLoad, false);
window.addEventListener('unload',gmarksAddBookmarkUnload,false);
