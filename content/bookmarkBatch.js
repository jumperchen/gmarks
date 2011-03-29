/*
 *Import/Export/Delete code
 */
var importing=false;
var ffBkmks;
var meter;
function updateBookmark(index){
	if (index==ffBkmks.length) {importComplete(); return;}
	var percent=Math.floor(((index+1)/ffBkmks.length)*100);
	meter.value=percent;
	meterlabel.value=(index+1)+" / "+ffBkmks.length+" ("+percent+"%)";
	var bm=ffBkmks[index];

	var req=GMS.com.getSendRequest();
	req.send(GMS.com.getSendData(bm));
	req.onreadystatechange = function(ev) {
		if(req.readyState == 4) {
			var status = -1;
			try {status = req.status;}catch(e) {}
			if(status == 200 || status==302) {
				updateBookmark(index+1);
			}
		}
	}
}
function importFromFirefox(){
    if (!GMS.checkSignedCookie()) {alert(strbundle.getString("signinFirst")); return;}
    var aretheysure=confirm(strbundle.getString("confirmImport"));
    if (!aretheysure) return;
	importing=true;
	document.getElementById("organize-statusbar").hidden=false;
	document.getElementById("status-label").value=strbundle.getString("status-importing")+" ";//"Importing: ";
	meter=document.getElementById('status-progress');
	meter.value="0";
	meterlabel=document.getElementById('progress-label');
	meterlabel.value="";
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefService).getBranch("gmarks.");
	nestedChar=prefs.getCharPref("nestedChar");
	ffBkmks=new Array();
	//if (Components.classes["@mozilla.org/passwordmanager;1"]){
	if (!Components.classes["@mozilla.org/fuel/application;1"]){
	//if (!Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]){
		importFF2();
	}
	else{
		importFF3();
	}
	updateBookmark(0);
}
function importFF2(){
	var RDF,BMDS,BMSVC,gNC_NS,gBmProperties;
	RDF = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
   	BMDS  = RDF.GetDataSource("rdf:bookmarks");
   	BMSVC = BMDS.QueryInterface(Components.interfaces.nsIBookmarksService);
    var NC = "http://home.netscape.com/NC-rdf#";

	var AllBookmarksResources = BMDS.GetAllResources();
	var root="NC:BookmarksRoot";
	var tmpSortBy=GMS.sortBy;
	GMS.sortBy='title';
	while (AllBookmarksResources.hasMoreElements()){
		var res = AllBookmarksResources.getNext();
		var name = getProperty(res, NC+"Name",RDF,BMDS);
		var url = getProperty(res, NC+"URL",RDF,BMDS);
		var description = getProperty(res, NC+"Description",RDF,BMDS);
		var type = resolveType(res, RDF, BMDS);

		if (type!="Bookmark") continue;
		var label="";
		var isFolder=true;
		var resParent= BMSVC.getParent(res);
		var parent="";
		if(resParent instanceof Components.interfaces.nsIRDFResource)
        	parent=resParent.QueryInterface(Components.interfaces.nsIRDFResource).Value;
		while(resParent && parent!=root){
			var parentName = getProperty(resParent, NC+"Name", RDF,BMDS);
			var parentType = resolveType(resParent,RDF,BMDS);
			if (parentType!="Folder"){
				isFolder=false;
				break;
			}
			if (label=="")
				label=parentName;
			else
				label=parentName+nestedChar+label;
			resParent= BMSVC.getParent(resParent);
			parent="";
			if(resParent instanceof Components.interfaces.nsIRDFResource)
				parent=resParent.QueryInterface(Components.interfaces.nsIRDFResource).Value;
		}
		if (!isFolder) continue;
		addImportBookmark(url,name,label,description);
	}
	GMS.sortBy=tmpSortBy;
}
function importFF3(root,label){
	var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
                      .getService(Components.interfaces.nsINavBookmarksService);
	var lsvc = Components.classes["@mozilla.org/browser/livemark-service;2"]
						.getService(Components.interfaces.nsILivemarkService);

	if (!root){
		var roots = Application.bookmarks;
    root = roots.children?roots:{children: [roots.menu,roots.toolbar,roots.unfiled]};
	}
	label=label?label:"";
	root.children.forEach(function(bkmk,i,bookmarks){
		if (bkmk.type=="bookmark"){
			var desc="";
			try{desc=bkmk.description}catch(e){}
      var taggingSvc = Components.classes["@mozilla.org/browser/tagging-service;1"]
                           .getService(Components.interfaces.nsITaggingService);
      var tags = taggingSvc.getTagsForURI(bkmk.uri,{});
      tags = tags.concat(label.split(/\s*,\s*/))
			addImportBookmark(bkmk.uri.spec,bkmk.title,tags,desc);
		}
		else if (bkmk.type=="folder" && !lsvc.isLivemark(bkmk.id)){
			var title="";
			if (bkmk.id != bmsvc.bookmarksMenuFolder){
				if (label!="")
					title = label+nestedChar+bkmk.title;
				else
					title = bkmk.title;
			} else {
				title = ""
			}
			importFF3(bkmk,title);
		}
	});
}
function addImportBookmark(url,name,label,description){
	if (label==GMS.unlabeled) label="";
	var bm=GMS.createNewBookmark(0,url,name,label!=""?[label]:[],description);
	var idx=GMS.getBookmarkIndex(bm,ffBkmks);
	if (idx>0 && idx<ffBkmks.length && ffBkmks[idx].url==url){//Already exists...
		var hasLabel=false;
		for (var i=0;i<ffBkmks[idx].labels.length && label!="";i++){
			if (ffBkmks[idx].labels[i]==label){
				hasLabel=true;
				break;
			}
		}
		if (hasLabel==false && label!=""){
			ffBkmks[idx].labels.push(label);
		}
	}
	else if (idx<0){
		idx=-(idx+1);
		ffBkmks.splice(idx,0,bm);
	}
}
function importComplete(){
	importing=false;
	document.getElementById("organize-statusbar").hidden=true;
	//meter.setAttribute('hidden','true');
	//document.getElementById('importProgress').setAttribute('hidden','true');
	//document.getElementById("importButton").setAttribute("hidden","false");
	GMS.getBookmarksFeed('refresh',true);
	alert(strbundle.getString("importComplete"));
}
/////////////////////////////////////////////////////////////////////////////
// returns the literal targeted by the URI aArcURI for a resource or uri
function getProperty(aInput, aArcURI, RDF,BMDS)
{
	var node;
	var arc  = RDF.GetResource(aArcURI);
	if (typeof(aInput) == "string") {
		aInput = RDF.GetResource(aInput);
	}

	node = BMDS.GetTarget(aInput, arc, true);

	try {
		return node.QueryInterface(Components.interfaces.nsIRDFResource).Value;
	}
	catch (e) {
		return node? node.QueryInterface(Components.interfaces.nsIRDFLiteral).Value : "";
	}
}
////////////////////////////////////////////////////////////////////////////
// Determine the rdf:type property for the given resource.
function resolveType(aResource,RDF,BMDS)
{
	var type = getProperty(aResource,"http://www.w3.org/1999/02/22-rdf-syntax-ns#type",RDF,BMDS);
	if (type != "")
		type = type.split("#")[1];

	if (type=="")
		type="Immutable";
	return type;
}

function exportFromGoogle(){
	if (!GMS.checkSignedCookie()) {alert(strbundle.getString("signinFirst")); return;}
	exportBookmarks();
}
/*
 * <DT><A HREF="url" ADD_DATE="1141505816" LAST_VISIT="1141505816" ICON="" LAST_CHARSET="" TAGS="delicious style tags">Title</A>
 * <DD>Description
 */

function exportBookmarks (){
	try {
	  var kFilePickerContractID = "@mozilla.org/filepicker;1";
	  var kFilePickerIID = Components.interfaces.nsIFilePicker;
	  var kFilePicker = Components.classes[kFilePickerContractID].createInstance(kFilePickerIID);

	  var kTitle = strbundle.getString("exportTitle");
	  kFilePicker.init(window, kTitle, kFilePickerIID["modeSave"]);
	  kFilePicker.appendFilters(kFilePickerIID.filterHTML | kFilePickerIID.filterAll);
	  kFilePicker.defaultString = "bookmarks.html";
	  var fileName;
	  if (kFilePicker.show() != kFilePickerIID.returnCancel) {
		fileName = kFilePicker.file.path;
		if (!fileName) return;
	  }
	  else return;

	  var file = Components.classes["@mozilla.org/file/local;1"]
						   .createInstance(Components.interfaces.nsILocalFile);
	  if (!file)
		return;
	  file.initWithPath(fileName);
	  if (!file.exists()) {
		file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);
	  }
	}
	catch (e) {
	  return;
	}
	var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
		.createInstance( Components.interfaces.nsIFileOutputStream );
	var charset = "UTF-8";
	outputStream.init( file, 0x02 | 0x08 | 0x20, 420, 0 );
	var output = doFolderExport();//document.getElementById('blog').value;

	var cos = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
		.createInstance(Components.interfaces.nsIConverterOutputStream);
	cos.init(outputStream, charset, 4096, "?".charCodeAt(0));
	cos.writeString(output);
	cos.flush();
	cos.close();
	outputStream.close();
}
function doFolderExport(){
	var body=
		'<!DOCTYPE NETSCAPE-Bookmark-file-1>\r\n'+
		'<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\r\n'+
		'<!-- This is an automatically generated file.'+
		'It will be read and overwritten.'+
		'Do Not Edit! -->\r\n'+
		'<TITLE>Bookmarks</TITLE>\r\n'+
		'<H1>Bookmarks</H1>\r\n'+
		'<DL><p>\r\n';

	//Put into a folder like structure...
	var treeData=getVisibleData();
	body+=writeData(treeData,0);
	//dump("write data calls: "+calls);
	body+="</p></DL>";

	//document.getElementById('exportProgress').setAttribute('hidden','true');
	//document.getElementById("exportButton").setAttribute("hidden","false");

	return body;
}

function writeData(treeData,tab){
	var body="";
	//calls++;
	for (var i=0;i<treeData.length;i++){
		if (treeData[i].type==0){//Its a label/folder}
			body+=getTab(tab)+'<DT><H3 LAST_MODIFIED="'+treeData[i].date.getTime()+'">'+treeData[i].title+"</H3>\r\n";
			body+=getTab(tab)+"<DL><p>\r\n";
			body+=writeData(treeData[i].data,tab+1);
			body+=getTab(tab)+"</p></DL><p>\r\n";
		}
		else{
			var bkmk=treeData[i];
			var title=bkmk.title.replace('"','&quot;').replace("'",'&#39;');
			var icon="";
			var pos=bkmk.notes.indexOf("data:image");
			if (pos>-1){
				icon=bkmk.notes.substring(pos);
				if (pos>0) bkmk.notes=bkmk.notes.substring(0,pos);
			}
			body+=getTab(tab)+'<DT><A HREF="'+bkmk.url+'" ADD_DATE="'+bkmk.date.getTime()+'" LAST_VISIT="'+bkmk.date.getTime()+'" ICON="'+icon+'" LAST_CHARSET="">'+
					title+"</A>\r\n";
			if (bkmk.notes!=null && bkmk.notes.length>0){
				body+=getTab(tab)+"<DD>"+bkmk.notes+"\r\n";
			}
		}
	}
	return body;
}

function getTab(tab){
	var s="";
	for (var i=0;i<tab;i++){
		s+="    ";
	}
	return s;
}

function doTagsExport(){
	//dump("doTagsExport\n");
	var body='document.writeln("'+
		'<!DOCTYPE NETSCAPE-Bookmark-file-1>'+
		"<META HTTP-EQUIV='Content-Type' CONTENT='text/html; charset=UTF-8'>"+
		'<!-- This is an automatically generated file.'+
		'It will be read and overwritten.'+
		'Do Not Edit! -->'+
		'<TITLE>Bookmarks</TITLE>'+
		'<H1>Bookmarks</H1>'+
		'<DL><p>");';


	for (var i=0;i<GMS.bookmarkArray.length;i++){
		var bkmk=GMS.bookmarkArray[i];
		body+="document.writeln('"+'<DT><A HREF="'+bkmk.url.replace("'",'"')+'" ADD_DATE="'+bkmk.date+'" LAST_VISIT="'+bkmk.date+'" ICON="" LAST_CHARSET="" TAGS="'+bkmk.labels.toString().replace("'",'"')+'">'+bkmk.title.replace("'",'"')+"</A>');";
		if (bkmk.notes!=null && bkmk.notes.length>0){
			body+="document.writeln('<DD>"+bkmk.notes.replace("'",'"')+"');";
		}
	}
	body+="document.write('</DL></p>');";
	body+="document.close();";

	document.getElementById('exportProgress').setAttribute('hidden','true');
	document.getElementById("exportButton").setAttribute("hidden","false");

	var sOption="toolbar=yes,location=no,directories=yes,menubar=yes,scrollbars=yes";
	var w=window.open('javascript: '+body,"",sOption);
}

function deleteFromGoogle(){
	if (!GMS.checkSignedCookie()) {alert(strbundle.getString("signinFirst")); return;}
	if (!confirm(strbundle.getString("confirmDelete"))) return;
	document.getElementById("organize-statusbar").hidden=false;
	document.getElementById("status-label").value=strbundle.getString("status-deleting")+" ";
	meter=document.getElementById('status-progress');
	meter.value="0%";
	meterlabel=document.getElementById('progress-label');
	meterlabel.value="";

	doDelete();
}

function doDelete(index){
	if (!index){
		index=0;
	}
	if (index==GMS.bookmarkArray.length) {deleteComplete(); return;}
	//dump("index="+index);
	var percent=Math.floor(((index+1)/GMS.bookmarkArray.length)*100);
	meter.value=percent;
	meterlabel.value=(index+1)+" / "+GMS.bookmarkArray.length+" ("+percent+"%)";
	var req = GMS.com.getRemoveRequest();
	req.send(GMS.com.getRemoveData(GMS.bookmarkArray[index]));
	req.onreadystatechange = function(ev) {
        if(req.readyState == 4) {
            var status = -1;
            try {status = req.status;}catch(e) {}
            if(status == 200 || status==302) {
                doDelete(index+1);
            }
            else{
            	deleteComplete()
			}
        }
	}
}

function deleteComplete(){
	deleting=false;
	document.getElementById("organize-statusbar").hidden=true;
	GMS.getBookmarksFeed('refresh',true);
	alert(strbundle.getString("deleteComplete"));

	GMS.doCommand("refresh");
}
function editFilters(){
	window.open("chrome://gmarks/content/editFilters.xul","","chrome,centerscreen,resizable");
}
function debug(msg){
	/*var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
    		.getService(Components.interfaces.nsIConsoleService);
  	consoleService.logStringMessage(msg);
  	/**/
}
