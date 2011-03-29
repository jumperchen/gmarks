var cookieManager = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager);
var prefs = Components.classes["@mozilla.org/preferences-service;1"].
    getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
var GMS=Components.classes["@mozilla.org/gmarks;1"]
                     .getService(Components.interfaces.nsIGMarksService).wrappedJSObject;
var strbundle;
var isSignedIn, calls=0, nestedChar, qsShortcut, chkQS, qsKeyCode,menu_list=null,menu_list_options=null;
var commandIDs=["addeditbookmark","removebookmark","organize","gotosite", //bookmarktabs
        "options","editfilters","refresh","separator","mostrecent","mostused",
        "bookmarkstree"];

function initWindow(event){
  strbundle=document.getElementById("gmarksBundle");
  initQSKey();
  initPassInfo();
  initMenuConfig();
  initVisList();
  document.getElementById("grShow").checked=document.getElementById('grLabel').value!="";
}
function initQSKey(){//for the key that triggers the Quick Search
  qsShortcut=document.getElementById("qsShortcut");
  chkQS=document.getElementById("disableQS");
  qsKeyCode=GMS.qsKeyCode;
  if (GMS.qsKeyCode==-1){
    chkQS.checked=true;
    qsShortcut.value="Disabled";
  }
  else{
    qsShortcut.value=getKeyCodeText(qsKeyCode);
  }
}
function initPassInfo(){
  try{
    var pass=GMS.getPassInfo();
    if (pass!=null){
      document.getElementById("txtEmail").value=pass.user;
      document.getElementById("txtPassword").value=pass.password;
    }
  }
  catch(e){}
}
function initMenuConfig(){
  if (!menu_list)
    menu_list=document.getElementById("gmarks_menu_items");
  while(menu_list.firstChild)
    menu_list.removeChild(menu_list.lastChild);
  if (!menu_list_options)
    menu_list_options=document.getElementById("unused_gmarks_menu_items");
  while(menu_list_options.firstChild)
    menu_list_options.removeChild(menu_list_options.lastChild);
  var menupref=document.getElementById("pDisplay").preferenceForElement(menu_list).value;//prefs.getCharPref(".menu.items");
  var itemIDs=menupref.split(",");
  var unusedIDs=commandIDs.slice();
  itemIDs.forEach(function(id,idx,arr){
    menu_list.appendChild(createListItem(id));
    if (id!="separator"){
      var pos=unusedIDs.indexOf(id);
      unusedIDs.splice(pos,1);
    }
  });
  unusedIDs.forEach(function(id,idx,arr){
    var ele=createListItem(id);
    menu_list_options.appendChild(ele);
  });
  menu_list.setAttribute("value",itemIDs.join(","));
  menu_list_options.setAttribute("value",unusedIDs.join(","));
  menu_list.value=itemIDs.toString();//itemIDs.join(",");
  menu_list_options.value=unusedIDs.join(",");
  menu_list.selectedItem=menu_list.firstChild;
  menu_list_options.selectedItem=menu_list_options.firstChild;

}
function getMenuListBoxValue(event){
  return menu_list.getAttribute("value");
}
function addItemToMenu(event){
  /* Get selected ele to move */
  if (!menu_list_options.selectedItem) return;
  var id=menu_list_options.selectedItem.value;
  if (id!="separator"){
    menu_list_options.removeChild(menu_list_options.selectedItem);
    menu_list_options.selectedItem=menu_list_options.firstChild;
  }
  menu_list.appendChild(createListItem(id));
  var val=menu_list.getAttribute("value");
  if (val && val.length!=0) val+=",";
  val+=id;
  menu_list.setAttribute("value",val);
  menu_list.selectedItem=menu_list.lastChild;
  document.getElementById("pDisplay").userChangedValue(menu_list);
}
function removeItemFromMenu(event){
  if (!menu_list.selectedItem) return;
  var id=menu_list.selectedItem.value;
  menu_list.removeChild(menu_list.selectedItem);
  menu_list.selectedItem=menu_list.lastChild;
  var ids=menu_list.getAttribute("value").split(",");
  var pos=ids.indexOf(id);
  ids.splice(pos,1);
  menu_list.setAttribute("value",ids.join(","));
  if (id!="separator")
    menu_list_options.appendChild(createListItem(id));
  document.getElementById("pDisplay").userChangedValue(menu_list);
}
function resetMenuDefaults(event){
  document.getElementById("pDisplay").preferenceForElement(menu_list).reset();
  initMenuConfig();
}
function moveUpInMenuList(event){
  var sel=menu_list.selectedItem;
  var idx=menu_list.selectedIndex;
  if (!sel || idx==0) return;
  var ids=menu_list.getAttribute("value").split(",");
  var tmp=ids[idx];
  ids[idx]=ids[idx-1];
  ids[idx-1]=tmp;
  menu_list.setAttribute("value",ids.join(","));
  menu_list.insertBefore(sel,sel.previousSibling);
  menu_list.selectedIndex=idx-1;
  menu_list.ensureIndexIsVisible(idx-1);
  document.getElementById("pDisplay").userChangedValue(menu_list);
}
function moveDownInMenuList(event){
  var sel=menu_list.selectedItem;
  var idx=menu_list.selectedIndex;
  if (!sel || idx==menu_list.childNodes.length-1) return;
  var ids=menu_list.getAttribute("value").split(",");
  var tmp=ids[idx];
  ids[idx]=ids[idx+1];
  ids[idx+1]=tmp;
  menu_list.setAttribute("value",ids.join(","));
  menu_list.insertBefore(sel,sel.nextSibling.nextSibling);
  menu_list.selectedIndex=idx+1;
  menu_list.ensureIndexIsVisible(idx+1);
  document.getElementById("pDisplay").userChangedValue(menu_list);
}
function createListItem(id){
  var ele=document.createElement("listitem");
  ele.id="menu_"+id;
  ele.value=id;
  ele.setAttribute("id","menu_id");
  try{
  ele.setAttribute("label",GMS.strbundle.GetStringFromName(id));
  }catch(e){dump("error creating "+id+"\n"+e+"\n")};
  return ele;
}
function initVisList(){
  if (GMS.mode!="simpy") return;
  document.getElementById("visGroup").hidden=false;
}

function toggleGoogleReader(){
  var checked=document.getElementById('grShow').checked;
  var txt=document.getElementById("grLabel");
  if (!checked)
    txt.value="";
  else
    txt.value="Google Reader";
  document.getElementById("pOther").preferenceForElement(txt).value=txt.value;
}
function getQSShortcut(event){
  return qsKeyCode;
}
function getKeyCodeText(keyCode){
  var event=Components.interfaces.nsIDOMKeyEvent;
  for (var p in event){
    if (p.toString().substring(0,7)=="DOM_VK_" && event[p]==keyCode){
      return p.toString().substring(7,8)+p.toString().substring(8).toLowerCase();
    }
  }
}
function changeQSShortcut(event){
  if (event.keyCode==13 || event.keyCode==27) return;
  chkQS.checked=false;
  qsKeyCode=event.keyCode;
  qsShortcut.value=getKeyCodeText(qsKeyCode);
  event.stopPropagation();
  document.getElementById("pOther").userChangedValue(event.target.parentNode);
}
function disableQSCMD(){
  if (chkQS.checked){
    qsShortcut.value='Disabled';
    qsKeyCode=-1;
  }else{
    if (qsShortcut.value=='Disabled'){
      if (GMS.qsKeyCode!=-1){
        var key=getKeyCodeText(GMS.qsKeyCode);
        qsShortcut.value=key;//.substring(3,4)+key.substring(4).toLowerCase();
        qsKeyCode=GMS.qsKeyCode;
      }
      else{
        qsShortcut.value='Home';
        qsKeyCode=36;
      }
    }
  }
  document.getElementById("pOther").userChangedValue(qsShortcut.parentNode);
}
function onShowFavPress()
{
  document.getElementById("validateFavicons").setAttribute('disabled',!document.getElementById("showFavicons").checked);
}
function saveLogin(event){
  if (document.documentElement.instantApply){
    var email=document.getElementById("txtEmail").value;
    var password=document.getElementById("txtPassword").value;
    GMS.savePassInfo(email,password);
  }
}
function onAccept(event){
  var carryon=true;
  if (carryon){
    var email=document.getElementById("txtEmail").value;
    var password=document.getElementById("txtPassword").value;
    if (email.length>0 && password.length>0)
      GMS.savePassInfo(email,password);
    if (GMS.mode=="simpy"){
      var list=document.getElementById("visList");
      var visibility=list.selectedIndex;
      prefs.setIntPref(".visibility",visibility);
      GMS.com.loadSimpyPrefs();
    }
    GMS.loadPrefs(); GMS.doCommand('quickrefresh');
  }
  return carryon;
}
function doCancel(event){
  var carryon=true;
  if (document.documentElement.instantApply){
    //dump("refresh\n");
    GMS.loadPrefs();
    if (GMS.mode=="simpy"){
      var list=document.getElementById("visList");
      var visibility=list.selectedIndex;
      prefs.setIntPref(".visibility",visibility);
      GMS.com.loadSimpyPrefs();
    }
    GMS.doCommand('quickrefresh');
  }
  return carryon;
}
function debug(msg){
  /*var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage(msg);
    /**/
}
