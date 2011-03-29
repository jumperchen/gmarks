var GMS=Components.classes["@mozilla.org/gmarks;1"]
                     .getService(Components.interfaces.nsIGMarksService).wrappedJSObject;
var strbundle;
var mode="create";
var bookmarkArray;
var isSignedIn;
var relatedBookmarks;
var progress;
var nestedChar;
function doOK()
{
	saveFilters();
	
	return true;
}

function doCancel()
{
	return true;
}

function doLoad(){
	setResizable(true);

	strbundle=document.getElementById("gmarksBundle");
	loadFilters();
	
	makeFilterGrid();
	//getBookmarksFeed(refreshSearchList,false);
	//request Bookmark list
	/*---Doesn't work if the sidebar is closed...something different
	Components.classes["@mozilla.org/observer-service;1"]
         .getService(Components.interfaces.nsIObserverService)
         .notifyObservers(null, "gmarks-sendBookmarks", "");
    */
}

function getInAny(query){
	query=query.replace(/inName\:\((.+)\)/,'');
	query=query.replace(/inURL\:\((.+)\)/,'');
	query=query.replace(/inLabels\:\((.+)\)/,'');
	query=query.replace(/inNotes\:\((.+)\)/,'');
	query=query.replace(/^\s*|\s*$/g,'');
	if (query.length>0) return query; else return null;
}

function doEdit(event){
	var idx=event.target.idx;
	//dump(idx+"/"+"\n")
	var query=filters[idx].query;
	//strInput=strInput.replace(/inName\:\((.+)\)/,"");
	
	var result;
	result=query.match(/inName\:\((.+?)\)/); var qName; if (result) qName=result[1]; else qName="";
	result=query.match(/inURL\:\((.+?)\)/); var qURL; if (result) qURL=result[1]; else qURL="";
	result=query.match(/inLabels\:\((.+?)\)/); var qLabels; if (result) qLabels=result[1]; else qLabels="";
	result=query.match(/inNotes\:\((.+?)\)/); var qNotes; if (result) qNotes=result[1]; else qNotes="";
	result=getInAny(query); var qAny; if (result) qAny=result; else qAny="";
	//result=query.match(/inAny\:\((.+)\)/); var qAny; if (result) qAny=result[1]; else qAny="";
	
	document.getElementById("nameBox").value=qName;
	document.getElementById("urlBox").value=qURL;
	document.getElementById("labelsBox").value=qLabels;
	document.getElementById("notesBox").value=qNotes;
	document.getElementById("anyBox").value=qAny;
	
	var action=filters[idx].action;
	
	result=action.match(/addLbls\((.+?)\)/); var aLbls; if (result) aLbls=result[1]; else aLbls="";
	//result=action.match(/toURL\((.+?)\)/); var aURL; if (result) aURL=result[1]; else aURL="";
	result=action.match(/toName\((.+?)\)/); var aName; if (result) aName=result[1]; else aName="";
	result=action.match(/toNotes\((.+?)\)/); var aNotes; if (result) aNotes=result[1]; else aNotes="";
	
	
	document.getElementById("cFilterAddLabelsBox").value=aLbls;
	//document.getElementById("cFilterURLBox").value=aURL;
	document.getElementById("cFilterNameBox").value=aName;
	document.getElementById("cFilterNotesBox").value=aNotes;
	
	document.getElementById("createEditFilterButton").label=strbundle.getString("editFilterButton");
	mode="edit-"+idx;

	refreshSearchList();
	document.getElementById("createEditTab").setAttribute('label',strbundle.getString("createTab"));
	document.getElementById("createAFilterTabs").selectedIndex=0;
	document.getElementById("tablist").selectedIndex=1;
	
	//alert("Edit idx: "+idx);
}

function doDelete(event){
	var idx=event.target.idx;
	
	filters.splice(idx,1);
	var rows=document.getElementById("filtersTabRows");
	var row=document.getElementById("filterrow_"+idx);
	var sep=document.getElementById("filtersep_"+idx);
	rows.removeChild(row);
	rows.removeChild(sep);
}

function insertFilterToContainer(container, idx, append){
	var filter=filters[idx];
	
	var sep=document.createElement('separator');
	sep.setAttribute('class','groove');
	sep.id="filtersep_"+idx;
	
	var row=document.createElement("row");
	row.id="filterrow_"+idx;
	var vbox=document.createElement("vbox");
	var query=document.createElement("label");
	var action=document.createElement("label");
	
	query.setAttribute('value',strbundle.getString("filterDisplay.query")+" "+filter.getDisplayQuery());
	action.setAttribute('value',strbundle.getString("filterDisplay.action")+" "+filter.getDisplayAction());
	
	vbox.appendChild(query);
	vbox.appendChild(action);
	
	var commands=document.createElement("vbox");
	commands.setAttribute('class','commands');
	var edit=document.createElement("label");
	edit.setAttribute('value',strbundle.getString("editFilter"));
	edit.setAttribute('style','color: red;');
	edit.addEventListener('click', doEdit, false); 
	edit.idx=idx;
	var del=document.createElement("label");
	del.setAttribute('value',strbundle.getString("deleteFilter"));
	del.addEventListener('click', doDelete, false); 
	del.idx=idx;
	commands.appendChild(edit);
	commands.appendChild(del);
	
	row.appendChild(vbox);
	row.appendChild(commands);
	if (append){
		container.appendChild(row);
		container.appendChild(sep);
	}
	else{
		var toReplace=document.getElementById("filterrow_"+idx);;
		toReplace.parentNode.replaceChild(row,toReplace);	
	}
}

function makeFilterGrid(){
	var rows=document.getElementById("filtersTabRows");
	var sep=document.createElement('separator');
	sep.setAttribute('class','groove');
	rows.appendChild(sep);
	for (var i=0;i<filters.length;i++){
		insertFilterToContainer(rows,i,true);
	}

}
function getNewFilter(){
	var query="";
	
	var qName=document.getElementById("nameBox").value;
	var qUrl=document.getElementById("urlBox").value;
	var qLabels=document.getElementById("labelsBox").value;
	var qNotes=document.getElementById("notesBox").value;
	var qAny=document.getElementById("anyBox").value;
	
	if (qName.length>0) query+="inName:("+qName+") ";
	if (qUrl.length>0) query+="inURL:("+qUrl+") ";
	if (qLabels.length>0) query+="inLabels:("+qLabels+") ";
	if (qNotes.length>0) query+="inNotes:("+qNotes+") ";
	if (qAny.length>0) query+=qAny;
	
	var action="";
	var aLbls=document.getElementById("cFilterAddLabelsBox").value;
	//var aURL=document.getElementById("cFilterURLBox").value;
	var aName=document.getElementById("cFilterNameBox").value;
	var aNotes=document.getElementById("cFilterNotesBox").value;
	
	if (aLbls) action+='addLbls('+aLbls+') ';
	//if (aURL) action+='toURL('+aURL+') ';
	if (aName) action+='toName('+aName+') ';
	if (aNotes) action+='toNotes('+aNotes+') ';
	
	return new Filter(query,action);
}

function doCreateEditFilter(){
	var filter=getNewFilter();
	
	if (mode=="create"){
		filters.push(filter);
		var container=document.getElementById("filtersTabRows");
		insertFilterToContainer(container,filters.length-1,true);
	}
	else{
		var idx=mode.substring(5);
		filters[idx]=filter;
		var container=document.getElementById("filtersTabRows");
		insertFilterToContainer(container,idx,false);
	}	

	if (document.getElementById('applyToBkmks').checked==true && relatedBookmarks!=null && relatedBookmarks.length>0){
		progress=document.getElementById('filterProgress');
		progress.setAttribute('hidden','false');
		var del=document.getElementById('cFilterDelete').checked;
		if (del==true)
			removeBookmark(0);
		else if (document.getElementById('cFilterToNested').checked==true){
			var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("gmarks");
			nestedChar=prefs.getCharPref(".nestedChar");
			var ret=GMS.bookmarkArray.getLabelsData();
			toNested(0);
		}
		else
			updateBookmark(0,filter);
	}
	else
		resetCreateEditFilter();	
}

function updateComplete(){
	progress.setAttribute('hidden','true');
	resetCreateEditFilter();
	Components.classes["@mozilla.org/observer-service;1"]
         .getService(Components.interfaces.nsIObserverService)
         .notifyObservers(null, "gmarks-refresh", "");
}
function resetCreateEditFilter(){
	d('reset');
	document.getElementById('applyToBkmks').setAttribute('checked',"false");
	document.getElementById('cFilterDelete').setAttribute('checked',"false");
	document.getElementById('cFilterToNested').setAttribute('checked',"false");
	
	mode="create";
	document.getElementById("createAFilterTabs").selectedIndex=0;
	document.getElementById("tablist").selectedIndex=0;
	
	document.getElementById("createEditTab").setAttribute('label',strbundle.getString("createTab"));
	document.getElementById("createEditFilterButton").label=strbundle.getString("createFilterButton");
	
	//Clear Textboxes
	var parent=document.getElementById("createAFilterTabs");
	var txts=parent.getElementsByTagName("textbox");
	for (var i=0;i<txts.length;i++){
		txts[i].value="";
	}
}

function refreshSearchList(){
	//clear list
	relatedBookmarks=new Array();
	var list=document.getElementById("resultList");
	for (var c=list.childNodes.length-1;c>=0;c--){
		list.removeChild(list.childNodes[c]);	
	}
	
	if (document.getElementById("mainTabsList").selectedItem.id=="createEditTab"){
		
		var filter=getNewFilter();
		if (filter.query.length>0){
			for (var i=0;i<GMS.bookmarkArray.length;i++){
				if (filter.matches(GMS.bookmarkArray[i]))
					addListItem(list,i);	
			}	
		}
	}
}

function addListItem(list,i){
	//d('ADD LIST ITEM');
	var bkmk=GMS.bookmarkArray[i];
	relatedBookmarks.push(bkmk);
	
	var item=document.createElement('listitem');
	item.setAttribute('label',bkmk.title);
	item.setAttribute('tooltip','listTooltip');
	item.setAttribute('value',relatedBookmarks.length-1);
	list.appendChild(item);
}

function initTooltip(event){
	var node=document.tooltipNode;
	var t=document.getElementById('listTooltip');
	var lbls=t.getElementsByTagName('label');
	d(node.tagName);
	var idx=node.value;
	idx:Type='Integer';
	//d(idx);
	//d(typeof idx);
	//d(relatedBookmarks.length);
	lbls[0].value=strbundle.getString('title')+' '+relatedBookmarks[idx].title;
	lbls[1].value=strbundle.getString('url')+' '+relatedBookmarks[idx].url;
	lbls[2].value=strbundle.getString('labels')+' '+relatedBookmarks[idx].labels;
	lbls[3].value=strbundle.getString('notes')+' '+relatedBookmarks[idx].notes;
}

function removeBookmark(i) {    	
	if (i==relatedBookmarks.length) {updateComplete(); return;}
	progress.setAttribute('value',((i+1)/relatedBookmarks.length)*100+'%');
    var req = GMS.com.getRemoveRequest();
	req.send(GMS.com.getRemoveData(relatedBookmarks[i]));
	req.onreadystatechange = function(ev) {
        if(req.readyState == 4) {
            var status = -1;
            try {status = req.status;}catch(e) {}
            if(status == 200 || status==302) {
                removeBookmark(i+1);
            }
        }
	}
 
}

function updateBookmark(i,filter){
	if (i==relatedBookmarks.length) {updateComplete(); return;} 
	progress.setAttribute('value',((i+1)/relatedBookmarks.length)*100+'%');
	
	relatedBookmarks[i]=filter.applyFilter(relatedBookmarks[i]);
	var bm=relatedBookmarks[i];
	if (bm.labels==null) bm.labels=new Array();
	else if (typeof bm.labels == 'string')
		bm.labels = bm.labels.split(',');
	if (bm.newLabels && bm.newLabels.length>0)
		bm.labels=bm.labels.concat(bm.newLabels);

	var req = GMS.com.getSendRequest();
	req.send(GMS.com.getSendData(bm));
	req.onreadystatechange = function(ev) {
        if(req.readyState == 4) {
            var status = -1;
            try {status = req.status;}catch(e) {}
            if(status == 200 || status==302) {
                updateBookmark(i+1,filter);
            }
        }
	}
}
function toNested(i){
	if (i==relatedBookmarks.length) {updateComplete(); return;} 
	progress.setAttribute('value',((i+1)/relatedBookmarks.length)*100+'%');
	
	var bm=relatedBookmarks[i];
	if (bm.labels==null) bm.labels=new Array();
	else if (typeof bm.labels == 'string')
		bm.labels = bm.labels.split(',');
	if (bm.newLabels && bm.newLabels.length>0)
		bm.labels=bm.labels.concat(bm.newLabels);

	var req = GMS.com.getSendRequest();
	req.send(GMS.com.getSendData(bm));
	req.onreadystatechange = function(ev) {
        if(req.readyState == 4) {
            var status = -1;
            try {status = req.status;}catch(e) {}
            if(status == 200 || status==302) {
                toNested(i+1);
            }
        }
	}
}

//-------------------------------------------------
function d(s){
	//dump(s+'\n');
}
