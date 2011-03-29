var searchBox;
var lastKeyPress=0;

var treeView;
var lblsTreeView;
//Vars for editable organize window
var editField;
var editRow;
var editCol;
var editOriginalValue;
var cellOffset;
//------
var keyEvent;
/*
 * type=labels or details if its a tree in the organize window(double tree)
 * type=complete if its in the sidebar(single tree)
 * parent is the parent label, generally used on the details type when a label is clicked
 */
function GMarksTreeView(type,parent){
  this.type=type;
  if (parent && parent.length>0){
    this.parentLbl=parent;
    this.data=getTreeData(parent,true,type);
  }
  else
    this.data=getVisibleData(type,this);
  if (type=="complete"){
    this.restoreContainers();
  }
}
GMarksTreeView.prototype = {
  rowsOpen: 0,
  lastOpened: -1,
  loading: false,
  //column, order
  sortinfo: ["name",0],
  parentLbl: null,
  treeBox: null,
  selection: null,
  get selectedData(){
    var selected=new Array();
    var start = {}, end = {};
    var numRanges = this.selection.getRangeCount();
    for (var t = 0; t < numRanges; t++){
      this.selection.getRangeAt(t,start,end);
      for (var idx = start.value; idx <= end.value; idx++){
        //var item=dragSource.data[idx];
        /* Check if parent is already selected */
        var pIdx=idx,addItem=!this.isSeparator(pIdx);
        while(pIdx>-1 && addItem){
         pIdx = this.getParentIndex(pIdx);
         if (pIdx>-1){
          if (selected.indexOf(this.data[pIdx])>-1){
            pIdx=-1;
            addItem=false;
          }
         }
        }
        if (addItem)
          selected.push(idx);
      }
    }
    return selected;
  },
  editRow: -1,
  editCol: -1,
  editOriginalValue: -1,
  editCell: {row: -1, col: null},
  extras: 0,/*the count of Most Used, Most Recent, separators, etc */

  setTree: function(treeBox)         {
    //dump("setTree: "+treeBox+"|"+this.treeBox+"\n")
    //if (treeBox == null && this.treeBox != null){
    //  this.lastRow = this.treeBox.getLastVisibleRow();
    //  dump("set tree close last row: "+this.lastRow+"\n");
    //} else if (this.treeBox == null && treeBox != null){
    //  lastRow = treeBox.getLastVisibleRow();
    //  dump("set tree open last row: "+lastRow+"|"+this.lastRow+"\n");
    //  if (this.lastRow && this.lastRow > lastRow)
    //    treeBox.scrollByLines(this.lastRow - lastRow);
    //}
    this.treeBox = treeBox;
  },
  getTreeBox: function()             { return this.treeBox; },
  getTree: function()                { return this.treeBox?this.treeBox.treeBody.parentNode:null;},
  isEditingCell: function(row,column){
    var editing=false;
    var tree=this.getTree();
    /* FF3 Editing */
    if (tree != null)
      editing=tree.inputField!=null && tree.inputField.hidden==false;
    if (editing && this.editCell.row==-1 && this.editCell.col==null){
      this.editCell.row=row; this.editCell.col=column;
    }
    else if (this.editCell.row!=row || this.editCell.col!=column)
      editing=false;
    /* FF2 version - editing */
    if (!editing && editField)
      editing=(editField!=null && !editField.hidden) && row==editRow && column==editCol;
    return editing;
  },
  getCellText: function(idx, column) {
    var editing=this.isEditingCell(idx,column);
    if (editing && !editField.hidden){
    if ((this.getTree() && this.getTree().getAttribute("editing")=="true") || !this.data[idx])
      return "";
    }
    switch (column.id){
      case "mainCol":
      case "nameCol":
        var title=this.data[idx].title;
        //Total Bookmarks+Labels in the current label
        //not including sub-bookmarks & labels

      if (GMS.showCount && this.isContainer(idx) &&
          this.data[idx].data.length>0){
          if (!editing)
          title+=' ('+this.data[idx].data.length+')';
      }
      return title;
      break;
    case "urlCol":
      if (!this.isContainer(idx)){
        return this.data[idx].url;
      }
      else
        return "";
      break;
    case "notesCol":
      if (!this.isContainer(idx)){
        if (this.data[idx].notes)
          return this.data[idx].notes;
        else
          return "";
      }
      else
        return "";
      break;
    case "labelsCol":
      if (!this.isContainer(idx)){
        return this.data[idx].labels;
      }
      else
        return "";
      break;
    case "dateCol":
      var date=new Date();
      var tDate=this.data[idx].date;
      date=new Date(tDate.valueOf());;
      var strDate=(date.getMonth()+1)+"/"+date.getDate()+"/"+date.getFullYear();
      return strDate;
      break;
    case "visitedCol":
      return "";
      if (!this.isContainer(idx)){
        return this.data[idx].frew;
      }
      else
        return "";
      break;
    case "lastVisitedCol":
      return ""
      break;
    default:
      return "";
    }
    return "";
  },
  /*
   * Used for editing cells...gmarkDetails is the only one with editable cells
   */
  setCellText: function(idx,column,value){
    //dump("setCellText("+idx+", "+column.id+" - "+value+"\n");
    //tree=document.getElementById("gmarkDetails");
    var refresh=false;
    this.editCell.row=-1; this.editCell.col=null;
    var obj1=this.data[idx], obj2=new Array();
    var actionType="bookmark",action="properties";
      switch (column.id){
        case "mainCol":
      case "nameCol":
        if (this.isContainer(idx)){
          actionType=null;
          var newlbl=this.data[idx].fullTitle;
          var pos=newlbl.lastIndexOf(this.data[idx].title);
          if (pos>-1)
            newlbl=newlbl.substring(0,pos)+value;
            renameLabel(this.data[idx],newlbl,true,null);
        }else
          obj2.push({type: "title",title: this.data[idx].title});
        this.data[idx].title=value;
        break;
      case "urlCol":
        if (!this.isContainer(idx) && this.data[idx].url!=value){
          obj2.push({type: "url",url: this.data[idx].url});
          this.data[idx].url=value;
          this.data[idx].id=0;
        }
        break;
      case "notesCol":
        if (!this.isContainer(idx)){
          obj2.push({type: "notes",notes: this.data[idx].notes});
          this.data[idx].notes=value;
        }
        break;
      case "labelsCol":
        if (!this.isContainer(idx)){
          obj2.push({type: "labels",labels: this.data[idx].labels.toString()});
          this.data[idx].labels=value.split(/\s*,\s*/);
          refresh=true;
        }
        break;
      default:
        actionType=null;
      }
      //dump("actionType: "+actionType+" | "+obj2.length+"\n");
    /* Create a bookmark action so it can be undone */
    if (actionType && obj2.length>0){
      if (refresh)
        GMS.updateBookmark(this.data[idx],true);
      else
        GMS.updateRecent(this.data[idx]);
      GMS.sendUpdateBookmark(this.data[idx]);
      GMS.generateBkmkAction(actionType,action, obj1,obj2);
    }
  },
  setCellValue: function(idx,column,value){
    //dump("setCellValue: "+value+"\n");
  },
  performAction: function(action){
    //dump("pa: "+action+"\n");
  },
  performActionOnCell: function(action,idx,column){
    //dump("paoc: "+action+" - "+idx+" - "+column+"\n");
  },
  isContainer: function(idx)         {
    if (this.data && idx<this.data.length && idx>=0 && this.data[idx].type!=null)
       if (this.data[idx].type==0) return true;
    return false;
  },
  isContainerOpen: function(idx)     { if (this.isContainer(idx)) return this.data[idx].open; else return false;},
  isContainerEmpty: function(idx)    { return false; },
  isSeparator: function(idx)         {
    return this.data && idx<this.data.length && this.data[idx] && this.data[idx].type==-1;
  },
  isSorted: function()               { return false; },
  isEditable: function(idx, column)  {
    if (this.isContainer(idx)){
      return column.id=="nameCol";
    }
    switch (column.id){
    case "nameCol":
    case "urlCol":
    case "notesCol":
    case "labelsCol":
      return true;
      break;
    default:
      return false;
      break;
    }
    return false;
  },
  getParentIndex: function(idx) {
    if (this.data && idx>=this.data.length || this.getLevel(idx)==0) return -1;
    var curLevel=this.getLevel(idx);
    for (var t = idx - 1; t >= 0 ; t--) {
        if (this.isContainer(t) && this.getLevel(t)<curLevel) return t;
    }
    return -1;
  },
  getParentLabel: function(idx){
    var parent=this.getParentIndex(idx);
    if (parent>-1){
      return this.data[parent].fullTitle;
    }
    else{
      if (this.parentLbl==null)
        return "";
      else
        return this.parentLbl;
    }
  },
  getLevel: function(idx) {
    if (this.isSeparator(idx)) return 0;
    if (idx>-1 && this.data && idx<this.data.length){
      var level = this.data[idx].level;
      if (this.type=="details" && typeof level!='undefined')
        level--;
      else if (typeof level=='undefined')
        level=0;
      return level;
    }
    else{
      return -1;
    }
  },
  hasNextSibling: function(idx, after) {
    var thisLevel = this.getLevel(idx);
    for (var t = idx + 1; t < this.data.length; t++) {
      if (!this.isSeparator(t)){
        var nextLevel = this.getLevel(t)
        if (nextLevel == thisLevel) return true;
        else if (nextLevel < thisLevel) return false;
      }
    }
    return false;
  },
  closeContainer: function(idx){
    this.rowsOpen--;
    this.data[idx].open = false;//Not open

    var thisLevel = this.getLevel(idx);
    var deletecount = 0;
    for (var t = idx + 1; t < this.data.length; t++) {
      if (this.getLevel(t) > thisLevel) {
      if (this.data[t].type==0) this.data[t].open=false;
      deletecount++;
      }
    else break;
    }
    if (deletecount) {
      this.data.splice(idx + 1, deletecount);
    }
    return deletecount;
  },
  openContainer: function(idx){
    this.data[idx].open = true;
    if (this.data[idx].level==0) this.rowsOpen++;

  var toinsert = this.data[idx].data;
  var lvl=this.data[idx].level+1;
  if (toinsert || true){
      for (var i = 0; i < toinsert.length; i++) {
      if (toinsert[i].type!=null && toinsert[i].type==0)
        this.data.splice(idx + i + 1, 0, toinsert[i]);
      else{
          if (this.type!="labels")
            this.data.splice(idx + i + 1, 0,  new BookmarkData(2,toinsert[i],lvl));
          else
            return i;
      }
      }
      return toinsert.length;
  }
  else
    return 0;
  },
  expand: function(idx,fromPopup){
    var start=idx;
    var length=0;
    var level=this.data[idx].level;
    if (!this.isContainerOpen(idx))
      length+=this.openContainer(idx);
    idx++;
    while(idx<this.data.length && this.data[idx].level>level){
      if (this.isContainer(idx)){
        if (!this.isContainerOpen(idx))
          length+=this.openContainer(idx);
      }
      idx++;
    }
    this.treeBox.rowCountChanged(start + 1, length);
    if (fromPopup){
    var lastRow=this.treeBox.getLastVisibleRow();
    if (idx>lastRow){
      //dump("scroll down!\n");
      this.treeBox.scrollByLines(idx-lastRow);
    }
    }
    return length;
  },
  toggleOpenState: function(idx) {
    if (!this.isContainer(idx)) return;

    if (this.data[idx].open) {
       //We close it
        var deletecount=this.closeContainer(idx);
        if (deletecount)
          this.treeBox.rowCountChanged(idx + 1, -deletecount);
    }
    else {
      var length=this.openContainer(idx);
      this.treeBox.rowCountChanged(idx + 1, length);
      var firstRow=this.treeBox.getFirstVisibleRow();
      var lastRow=this.treeBox.getLastVisibleRow();
      if (idx+1+length>lastRow){
        if (length+1>lastRow-firstRow)
          length=lastRow-firstRow-1;
        this.treeBox.scrollByLines((idx+1+length)-lastRow);
      }
    }
    this.selection.select(idx);
  },
  openAll: function(change){
    if (change!=false)
      this.treeBox.beginUpdateBatch();
    for (var i=0;i<this.data.length;i++){
    if (this.isContainer(i) && !this.isContainerOpen(i)){
      this.openContainer(i);
    }
  }
  if (change!=false)
    this.treeBox.endUpdateBatch();
  },
  closeAll: function(change){
    if (change!=false)
      this.treeBox.beginUpdateBatch();
    for (var i=0;i<this.data.length;i++){
      if (this.isContainerOpen(i)){
        this.closeContainer(i);
      }
    }
    if (change!=false)
      this.treeBox.endUpdateBatch();
  },
  toggleAll: function(){
    this.treeBox.beginUpdateBatch();
    if (this.rowsOpen==0){
      //Open all rows
      this.openAll(false);
    }
    else{
      //Close all rows
      this.closeAll(false);
    }
    this.treeBox.endUpdateBatch();
  },
  getImageSrc: function(idx, column) {
    if (this.isSeparator(idx)) return null;
    if (!(typeof GMS == "undefined")){
      if (!GMS.showIcons || !GMS.showFavs) return null;
      var bkmk;
      if (this.isContainer(idx)){
        if (this.data[idx].bkmk==null){
          return null;
        }
        else{
          bkmk=this.data[idx].bkmk;
        }
      }
      else if (this.data){
        bkmk=this.data[idx];
      }
      if (column.id=="mainCol" || column.id=="nameCol")
        if (bkmk)
          return bkmk.image;
    }
    return null;
  },
  getProgressMode : function(idx,column) {},
  getCellValue: function(idx, column) {},
  cycleHeader: function(col, elem) {},
  selectionChanged: function() {},
  cycleCell: function(idx, column) {},
  //performAction: function(action) {},
  //performActionOnCell: function(action, index, column) {},
  getRowProperties: function(idx, column, prop) {},
  getCellProperties: function(idx, column, prop) {
    if ((column.id=="mainCol" || column.id=="nameCol") && !this.isSeparator(idx) && this.data
        && !(typeof Components == "undefined")){
      var aserv=Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
      if (GMS.showIcons==true){
        prop.AppendElement(aserv.getAtom("showIcon"));
        if (GMS.readerLabel==this.data[idx].fullTitle)
          prop.AppendElement(aserv.getAtom("starredInReader"));
      }
      if (this.type=="labels" && this.data[idx].type==0){
        if (this.data[idx].data[0].type!=0){
          prop.AppendElement(aserv.getAtom("hideTwisty"));
        }
      }
    }
  },
  getColumnProperties: function(column, element, prop) {},

  canDrop : function(idx, orient) {
    return true;
  },
  drop : function(index, orient) {
    if ( !treeDrag) {
      if (gmarksDragObserver.data){
        gmarksDragObserver.treeDrop(index,this.getTree());
      }
      return;
    }
    try{
    var label="";/* Label dropped onto or under */
    var inside=false;
    if(index>-1 && index<this.data.length){
      if (this.isContainer(index))
        label=this.data[index].fullTitle;
      else if (this.data[index].type==2){
        var parent=this.getParentIndex(index);
        if (parent != -1)
          label=this.data[parent].fullTitle;
      else
        label=this.getParentLabel(index);
      inside=true;
      }
    }
    if (label==GMS.strbundle.GetStringFromName("mostrecent") ||
        label==GMS.strbundle.GetStringFromName("mostused")){
      label="";
    }
    //dump("drag to label: "+label+"\n");
    var selection=dragSource.selection;
    var selected=dragSource.selectedData;
    //Add Label to Bookmark(s)
    /* Move to root */
    var actionLength_Start=GMS.actionHist.length;
    if (label==null || label=="" || label==this.parentLbl){
      //dump("delete label drag and drop\n");
      var offset=0;
      for (var i=0;i<selected.length;i++){
        var dragIndex=selected[i]+offset,startRows=this.rowCount;
        if (dragSource.isContainer(dragIndex)){
          var parent=dragSource.getParentLabel(dragIndex);
          if (parent!=this.parentLbl && parent!=""){
            var newTitle=dragSource.data[dragIndex].title;
            GMS.onRenameLabel(dragSource.data[dragIndex].fullTitle,dragSource.data[dragIndex].title);
          }
        }
        else if (!dragSource.isSeparator(dragIndex)){
          var bm=new Array();
          bm.push(dragSource.data[dragIndex]);
          var children=new Array();
            for (var i=0;i<bm.length;i++){
              for (var n=0;n<bm[i].labels.length;n++){
                children.push({bkmk:bm[i],label: bm[i].labels[n]});
                GMS.removeLabelFromBookmark(bm[i],bm[i].labels[n],false);
                GMS.actionHist.pop();
              }
            }
            /* Create a bookmark action so it can be undone */
          this.generateBkmkAction("label","delete",children);
        }
        offset+=this.rowCount-startRows;
      }
    }
    /* Move data, don't copy */
    else if (keyEvent==null || keyEvent.ctrlKey==false){
      //dump("move don't copy\n");
      var offset=0;
      for (var i=0;i<selected.length;i++){
        var dragIndex=selected[i]+offset,startRows=this.rowCount;
        var oldLabel="";
        if (dragSource.isContainer(dragIndex)){
          oldLabel=dragSource.data[dragIndex].fullTitle;
        }
        else
          oldLabel=dragSource.getParentLabel(dragIndex);
        if (oldLabel!=label){
          if (dragSource.isContainer(dragIndex)){
            if (oldLabel!=null && oldLabel!="")
              if (inside)
                GMS.onRenameLabel(oldLabel,label+GMS.nestedChar+dragSource.data[dragIndex].title,false);
              else
                GMS.onRenameLabel(oldLabel,label,false);
          }
          else{
            var bm=new Array();
            bm.push(dragSource.data[dragIndex]);
            addLabelFromDaD(bm,label,false);
            if (oldLabel!="" && oldLabel!=null){
              GMS.removeLabelFromBookmark(dragSource.data[dragIndex],oldLabel,false);
              GMS.actionHist.pop();
            }
          }
        }
        offset+=this.rowCount-startRows;
      }
    }
    /* Copy */
    else{
      var offset=0;
      for (var i=0;i<selected.length;i++){
        var dragIndex=selected[i]+offset,startRows=this.rowCount;
        var bm=new Array();
        if (dragSource.isContainer(dragIndex)){
          bm=dragSource.data[dragIndex].data;
          if (inside)
            addLabelFromDaD(bm,label+GMS.nestedChar+dragSource.data[dragIndex].title,false);
          else
            addLabelFromDaD(bm,label,false);
        }
        else{
          bm.push(dragSource.data[dragIndex]);
          addLabelFromDaD(bm,label,false);
        }
        offset+=this.rowCount-startRows;
      }
      keyEvent=null;
    }
    var actionLength_End=GMS.actionHist.length;
    var actionLength_Diff=actionLength_End-actionLength_Start;
    var dndActions=GMS.actionHist.slice(actionLength_Start,actionLength_Diff);
    GMS.generateBkmkAction("all","complex action",dndActions);

    GMS.doCommand("quickrefresh");
    /* Update tree selection */
    if (dragSource==this){
      dragSource.selection.clearSelection();
    }
    }catch(e){dump(e+"\n");}
  },
  
  //Custom stuff
  getURL: function(idx){return this.data[idx].url;},
  getBookmark: function(idx){
    return this.data[idx];
  },
  restoreContainers: function(lbls,toSelect){
    if (!lbls){
      var savedPref = prefs.getCharPref(".labels");
      lbls = savedPref.split(/\s*,\s*/);
    }
    this.rowsOpen=0;
    for (var i=0;i<this.data.length;i++){
      if (this.data[i].type!=null && this.data[i].type==0){
        if (toSelect && this.data[i].title == toSelect){
          this.selection.select(i);
          toSelect = null;
        }
        var idx=lbls.indexOf(this.data[i].fullTitle);
        if (idx>-1){
          this.openContainer(i);
          lbls.splice(idx,1);
        }
      }
    }
  },
  getOpened: function(){
    var lbls=new Array();
    for (var i=0;i<this.data.length;i++){
      if (this.isContainerOpen(i)){
        lbls.push(this.data[i].fullTitle);
      }
    }
    return lbls;
  },
  saveOpened: function(){
    prefs.setCharPref(".labels",this.getOpened().join(","));
  },
  //Only called in the organize window
  sortBy: function(type){
    this.treeBox.beginUpdateBatch();
    var openedLbls=this.getOpened();
    this.closeAll(false);
    if (this.sortinfo[0]==type){
      this.sortinfo[1]=this.sortinfo[1]==0?1:0;
      if (this.sortinfo[1]==1)
        document.getElementById(this.sortinfo[0]+"Col").setAttribute(
          "sortDirection","descending");
      else if (this.sortinfo[1]==0)
        document.getElementById(this.sortinfo[0]+"Col").setAttribute(
          "sortDirection","ascending");
    }
    else{
      document.getElementById(this.sortinfo[0]+"Col").setAttribute("sortActive","false");
      document.getElementById(this.sortinfo[0]+"Col").setAttribute(
          "sortDirection","neutral");
      this.sortinfo[0]=type;
      document.getElementById(this.sortinfo[0]+"Col").setAttribute("sortActive","true");
      document.getElementById(this.sortinfo[0]+"Col").setAttribute(
          "sortDirection","ascending");
      this.sortinfo[1]=0;
    }
    this._sortBy(treeView.data,type,this.sortinfo[1]);
    this.restoreContainers(openedLbls);

    this.treeBox.endUpdateBatch();
  },
  //the actual sort
  _sortBy: function(aData,type,order){
    var n;
    for (var i=0;i<aData.length;i++){
      var obj=aData[i];
      if (obj.type!=null && obj.type==0){
          this._sortBy(obj.data,type);
        }
    }
    switch(type){
      case "name":
        var lastX
        aData.sort(function (x, y){
          if ((x.type!=null && x.type==0) && (y.type==null || y.type!=0)){//X=Folder, Y==Bookmark
            return -1;
          }
          else if ((y.type!=null && y.type==0) && (x.type==null || x.type!=0)){//X==Bookmark, Y==Folder
            return 1;
          }
          var compare=0;
          if (x.title.toLowerCase() < y.title.toLowerCase())
            compare=-1;
          else if (x.title.toLowerCase() > y.title.toLowerCase())
            compare=1;
          return order==1?-compare:compare;
        });
        break;
      case "url":
        aData.sort(function (x, y){
          if ((x.type!=null && x.type==0) && (y.type==null || y.type!=0)){//x=label y=bookmark
            return -1;
          }
          else if ((y.type==null || y.type==0) && (x.type!=null && x.type!=0)){
            return 1;
          }
          else if ((y.type!=null && y.type==0) && (x.type!=null && x.type==0)){
            var compare=0;
            if (x.title.toLowerCase() > y.title.toLowerCase())
            compare=-1;
          else if (x.title.toLowerCase() < y.title.toLowerCase())
            compare=1;
          return order==0?-compare:compare;
          }
          else{
            var compare=0;
            if (x.url < y.url)
            compare=1;
          else if (x.url > y.url)
            compare=-1;
          return order==0?-compare:compare;
          }
        });
        break;
      case "date":
        aData.sort(function (x, y){
          //Folder vs Bookmark
          if ((x.type!=null && x.type==0) && (y.type==null || y.type!=0)){//x=label y=bookmark
            return -1;
          }
          //Bookmark vs Folder
          else if ((x.type==null || x.type!=0) && (y.type!=null && y.type==0)){
            return 1;
          }
          else{
            var compare=0;
            if (x.date > y.date)
            compare=-1;
          else if (x.date < y.date)
            compare=1;
          return order==0?compare:-compare;
          }
        });
        break;
      case "notes":
        aData.sort(function (x, y){
          if ((x.type!=null && x.type==0) && (y.type==null || y.type!=0)){//x=label y=bookmark
            return -1;
          }
          else if ((y.type!=null && y.type==0) && (x.type==null || x.type!=0)){
            return 1;
          }
          else if ((y.type!=null && y.type==0) && (x.type!=null && x.type==0)){
            var compare=0;
            if (x.title.toLowerCase() < y.title.toLowerCase())
            compare=1;
          else if (x.title.toLowerCase() > y.title.toLowerCase())
            compare=-1;
          compare=order==0?-compare:compare;
          return compare;
          }
          else if (((x.notes!=null && x.notes.length>0)) &&
            (y.notes==null || y.notes.length==0)){
            return order==0?-1:1;
          }
          else if (((y.notes!=null && y.notes.length>0)) &&
            (x.notes==null || x.notes.length==0)){
            return order==1?-1:1;
          }
          else if (x.notes==y.notes){
            return 0;
          }
          else{
            var compare=0;
            if (x.notes.toLowerCase() < y.notes.toLowerCase())
            compare=1;
          else if (x.notes.toLowerCase() > y.notes.toLowerCase())
            compare=-1;
          return order==0?-compare:compare;
          }
        });
        break;
      }
  },
  get rowCount()                     { return this.loading?0:this.data.length;}
};
function expand(event){
  var tree=document.popupNode;
  if (tree.tagName!="tree") tree = tree.parentNode;
  getTreeView(tree).expand(pops.getLabelIndex(),true);
}

//Gets the tree view with my added methods & vars, the standard tree view interface doesn't expose all methods
function getTreeView(tree){
  if (typeof tree == 'string'){
    if (tree=="complete" || tree=="details")
      return treeView;
    else
      return lblsTreeView;
  }
  else{
    var treeId=tree.getAttribute('id');
    if (treeId=="gmarkList" || treeId=="gmarkDetails")
      return treeView;
    else
      return lblsTreeView;
  }
}
//Detects a right click on a mac too...
function isRightClick(event){
  if (event.button==2)
    return true;
  if (navigator.appVersion.indexOf("Mac")!=-1){
    if (event.ctrlKey==true && event.button==0)
      return true;
  }
  return false;
}
function gmTreeContextShowing(event){
  var tree=document.popupNode;
  if (tree.tagName!="tree") tree=tree.parentNode;
  var row = {}, col = {}, obj = {};
  var view=getTreeView(tree);
  var visibleData=view.data;
  var popup=event.target;
  var selectedIndexes=view.selectedData;
  if (selectedIndexes.length==0) return false;
  var selected = [];
  selectedIndexes.forEach(function(sel,idx){
    selected.push(visibleData[sel]);
    selected[idx].parent = view.getParentLabel(sel);
  });
  return gmContextShowing(popup,selected);
}
function gmMouseMoved(event){
  this.lastX = event.clientX;
  this.lastY = event.clientY;
}
function gmTreeTooltipShowing(event){
  var tree=document.tooltipNode;
  if (tree.tagName!="tree") tree=tree.parentNode;
  var row = {}, col = {}, obj = {};
  tree.treeBoxObject.getCellAt(this.lastX, this.lastY, row, col, obj);
  var view=getTreeView(tree);
  var titleField = document.getElementById("gm-tooltip-title");
  var notesField = document.getElementById("gm-tooltip-notes");

  if (row.value>-1 && row.value < view.data.length && !view.isSeparator(row.value)){
    //while(titleField.lastChild) titleField.removeChild(titleField.lastChild);
    //titleField.appendChild(document.createTextNode(view.data[row.value].title))
    //while(notesField.lastChild) notesField.removeChild(notesField.lastChild);
    titleField.setAttribute("value",view.data[row.value].title);
    if (view.data[row.value].notes){
      notesField.hidden = false;
      //notesField.appendChild(document.createTextNode(view.data[row.value].notes));
      notesField.setAttribute("value",view.data[row.value].notes);
    }
    else
      notesField.hidden = true;
    return true;
  }
  return false;
}

function gmContextShowing(popup, selected){
  var mrecent=GMS.strbundle.GetStringFromName("mostrecent");
  var mfreq=GMS.strbundle.GetStringFromName("mostused");
  var hideBkmks=false;
  var hideLabels=false;
  var hideRemoveLabel=false;
  var hideBkmkModifiers=false;
  var hideRenameAndDelete=false;
  var items=popup.getElementsByTagName("menuitem");
  var separators=popup.getElementsByTagName("menuseparator");
  selected.forEach(function(bkmk,idx,arr){
    if (bkmk.type!=0){//Bookmark
      //The Google Reader label is a fake label, so we can't remove it
      //As are the Most Recent and Most Used
      var pLabel = bkmk.parent;
      if (bkmk.labels.indexOf(GMS.readerLabel)>-1 ||
          pLabel==mrecent || pLabel==mfreq){
        hideRemoveLabel=true;
      }
      if (bkmk.labels.indexOf(GMS.readerLabel)!=-1){
        hideBkmkModifiers=true;
      }
      hideLabels=true;
    }
    else{//Label/Folder/Tag...whatever you want to call it
      var title=bkmk.fullTitle;
      if (title==GMS.unlabeled || title==GMS.readerLabel ||
          title==mrecent || title==mfreq){
        hideRenameAndDelete=true;
      }
      hideBkmks=true;
    }
  },this);
  //dump("hide bkmks: "+hideBkmks+"|"+hideLabels+"\n");
  for (var i=items.length-1;i>=0;i--){
    if (items[i].id.substring(0,3)=="lbl"){//labels
      if (hideLabels)
        items[i].hidden=true;
      else{
        var name=items[i].id.substring(3);
        if (hideRenameAndDelete && (
            name=="rename"||
            name=="del" ||
            name=="delbkmk"))
          items[i].hidden=true
        else
          items[i].hidden=false;
      }
    }
    else{//bkmks
      if (hideBkmks && !hideLabels)
        items[i].hidden=true;
      else{
        var name=items[i].id.substring(4);
        if (hideRemoveLabel && name=="removelbl")
          items[i].hidden=true;
        else if (hideBkmks && (
            name=="fav" ||
            name=="rename" ||
            name=="update" ||
            name=="newlbl" ||
            name=="removelbl" ||
            name=="edit" ||
            name=="open"
            )){
          items[i].hidden=true;
        }
        else if (hideBkmkModifiers && (
            name=="fav" ||
            name=="rename" ||
            name=="update" ||
            name=="newlbl" ||
            name=="del"))
          items[i].hidden=true;
        else
          items[i].hidden=false;
      }
    }
  }
  separators[0].hidden=(hideBkmkModifiers || hideRenameAndDelete);
  separators[1].hidden=(hideBkmks && hideLabels);
  return true;
}
/*
 Open bookmarks, switch tree views, & end organize edit
*/
function mouseClick(event){
  var tree=event.target.parentNode;
  if (tree){
    var row = {}, col = {}, obj = {};
    var view=getTreeView(tree);
    tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, obj);
    var visibleData=view.data;
    if (!view.isSeparator(row.value)){
      //For inline editing in the organize window
      if (view.type=="details" && editField.hidden==false){
        if (obj.value!="text" || editRow!=row.value || editCol!=col.value){
          fieldChange();
        }
        else{
          return;
        }
      }
      if (row.value>=0 && row.value<visibleData.length){
        if (obj.value){
          var sel;
          //if (!row.value || row.value<0)//(obj.value.toString()!='twisty')/*The selection isn't updated when middle clicked*/
          //  sel=tree.currentIndex;
          //else
            sel=row.value;
          //view.selection.select(sel);
          if (!tree.view.isContainer(sel)){//Bookmark
              if (!isRightClick(event)){//if (event.button<2){
                //Open the bookmark if its from the sidebar...
                if (tree.getAttribute("id")=="gmarkList"){
                  openBookmark(view.getURL(sel),event);
                }
            }
          }
          else{//Label/Folder/Tag...whatever you want to call it
            var where=whereToOpenLink(event);
            if (where=="tab" || where=="tabshifted" || where=="window")//Middle click
              openInTabs(event);
            else if (event.button==0){
              if (tree.getAttribute("id")=="gmarkList"){
                if (view.data[sel].bkmk!=null)
                  if (obj.value.toString()!='twisty'){
                    openBookmark(view.data[sel].bkmk.url,event);
                  }
              }
              /*
               * label tree only(organize window)
               * Changes the details tree based on the newly selected label
               */
              switchView(tree);
            }
          }
        }
      }
    }
  }
}
function switchView(tree){
  if (tree.getAttribute("id")=="gmarkLabels"){
    fieldChange();
    treeView.treeBox.beginUpdateBatch();
    treeView.parentLbl=lblsTreeView.data[tree.currentIndex].fullTitle;
    treeView.data=getTreeData(treeView.parentLbl,true,treeView.type);
    treeView.treeBox.endUpdateBatch();
    treeView.openAll();
  }
}
function doubleClick(event){
  var tree=event.target.parentNode;
  var treeBox = tree.treeBoxObject;
  var row = {};
  var col = {};
  var obj = {};
  treeBox.getCellAt(event.clientX,event.clientY,row,col,obj);
  if (!tree.editingColumn && row.value!=-1 && col.value!=null &&
      getTreeView(event.target.parentNode).isEditable(row.value,col.value))
    setEditModeditMode(row.value,col.value,true);
}
function setEditMode(row,column,val){
  if (val){
    if (row < 0) return;

    if (editRow >= 0) assignValueToCell(editField.value,true);
    editField.hidden=false;
    editRow=row; editCol=column;
    var treeBox = treeView.treeBox;
    var tree=treeBox.treeBody.parentNode;
    var outx = {}, outy = {}, outwidth = {}, outheight = {};
    var coords = treeBox.getCoordsForCellItem(row, column, "text",
                                    outx, outy, outwidth, outheight);
    var style = window.getComputedStyle(editField, "");
    var topadj = parseInt(style.borderTopWidth) + parseInt(style.paddingTop);
    offset=tree.columns["nameCol"].element.boxObject.height;
    //outheight.value=26;
    outy.value+=offset;//30;
    editField.top = outy.value - topadj;

    var left = outx.value;
    editField.left = left;
    editField.height = outheight.value + topadj +
             parseInt(style.borderBottomWidth) +
             parseInt(style.paddingBottom);

    coords = treeBox.getCoordsForCellItem(row, column, "cell",
                                      outx, outy, outwidth, outheight);
    editField.width = outwidth.value - (left - outx.value);
    editField.value = tree.view.getCellText(row, column);
    editField.addEventListener("keydown", fieldKeyDown, false);
    editField.addEventListener("blur", fieldChange, true);
    editOriginalValue = editField.value;
    var selectText = function selectText() {
        editField.select();
        editField.inputField.focus();
    }
    setTimeout(selectText, 0);
    tree.setAttribute("editing","true");
  }
  else {
    //dump("setEditMode - REMOVE\n");
    var treeBox = treeView.treeBox;
    var tree=treeBox.treeBody.parentNode;
    tree.removeAttribute("editing");

    editField.hidden=true;
    editField.removeEventListener("keydown", fieldKeyDown, false);
    editField.removeEventListener("blur", fieldChange, true);
    editField.blur();
    treeView.selection.select(editRow);
    editRow=-1; editCol = null;
  }
}
function assignValueToCell(value, acceptMode){
  if (editRow == -1 || editField.hidden) return;
  if (value!=null){
    var update=value!=editOriginalValue && acceptMode;
    if (update){
      treeView.setCellText(editRow,editCol,value);
    }
  }
  if (value==null || acceptMode){
    setEditMode(0,0,false);//"normal"
  }
}
function fieldKeyDown(event){
    if (event.keyCode == 13){
      assignValueToCell(editField.value,true);
    }
    if (event.keyCode == 27){
      assignValueToCell(null,false);
    }
    event.stopPropagation();
}
function fieldChange(event){
    assignValueToCell(editField.value,true);
}
function keyPress(event){
  //dump("keypress: "+event.keyCode+"\n");
  var tree=event.target;
  if (tree.editingColumn!=null) return;
  var sel=tree.currentIndex;
  var view=getTreeView(tree);
  var visibleData=view.data;
  if (sel<0 || sel>visibleData.length) return;
  var container=view.isContainer(sel);
  var keys=Components.interfaces.nsIDOMKeyEvent;
  //dump("enter: "+keys.DOM_VK_RETURN+"\n");
  switch (event.keyCode){
    case keys.DOM_VK_RETURN:
    case keys.DOM_VK_ENTER:
      //dump("enter key press\n");
      if (!container){
        openBookmarks(event);
        //openBookmark(getTreeView(tree).getURL(sel),event);
      }
      break;
    case keys.DOM_VK_DELETE:
      removeBookmarks(event);
      break;
    case keys.DOM_VK_LEFT:
    case keys.DOM_VK_UP:
    case keys.DOM_VK_RIGHT:
    case keys.DOM_VK_DOWN:
      setTimeout(function(){switchView(tree);},10);
      break;
    default:
      //dump(event.keyCode+"\n");

  }

}
function openBookmarks(event){
  var bookmarkPrefs=Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("extensions.tabmix.");
  var bkmkNewTab;
  try{
    bkmkNewTab=bookmarkPrefs.getBoolPref("opentabfor.bookmarks");
  }
  catch(e){bkmkNewTab=false;}
  bkmkNewTab=bkmkNewTab || prefs.getBoolPref('.openinnewtab');
  var where=bkmkNewTab?("tab"+event.shiftKey?"shifted":""):whereToOpenLink(event);
  openBookmarksIn(event,where);
}
function openBookmarksIn(event,where){
  var tree;
  if (event.target.tagName=="tree")
    tree=event.target;
  else if (event.target.parentNode.tagName=="tree")
    tree=event.target.parentNode;
  else{
    tree=document.popupNode;
    if (tree.tagName!="tree")
      tree = tree.parentNode;
  }
  var view=getTreeView(tree);
  var selected=view.selectedData;
  var actionLength_Start=GMS.actionHist.length;
  var offset=0;
  if (where=="current" && selected.length>1)
    where="tab";
  var data=selected.map(function(idx,index,arr){
    return view.data[idx];
  });
  var mainWindow = null, browser = null;
  var replace =  (data.length>0 || ("type" in data[0] && data[0].type==0)) && prefs.getBoolPref(".loadLabelAndReplace");
  var canReplace = false;
  if (replace){
    data.forEach(function(item,idx,arr){
      if ("type" in item && item.type==0)
        canReplace = true;
    });
  }
  replace = replace && canReplace;
  
  if (replace && where != "window"){
    /*
     This needs to work for both the sidebar and the organize window
     First try is for the sidebar, opener is for the organize window.
    */
    mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow)
    if (!(mainWindow && "getBrowser" in mainWindow)){
      mainWindow = opener;
    }
    if (mainWindow && "getBrowser" in mainWindow){
      browser = mainWindow.getBrowser();
      var childNodes = browser.tabContainer.childNodes;
      for (var i = childNodes.length - 1; i >= 0; --i) {
        browser.removeTab(childNodes[i]);
      }
    }
  }
  openBookmarkItems(data,view,where);
  if (replace && browser){
    browser.removeTab(browser.tabContainer.childNodes[0]);
  }
}
function openBookmarkItems(data,view,where){
  if (data.length>1 && where=="tab") where = "tabshifted";
  data.forEach(function(item,idx,arr){
    if ("type" in item && item.type==0)//isContainer
      openBookmarkItems(item.data,view,"tabshifted");
    else
      openUILinkIn(item.url,where);
  },this);
}
function openBookmark(url,event){
  var bookmarkPrefs=Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("extensions.tabmix.");
  var bkmkNewTab;
  try{
    bkmkNewTab=bookmarkPrefs.getBoolPref("opentabfor.bookmarks");
  }
  catch(e){bkmkNewTab=false;}
  bkmkNewTab=bkmkNewTab || prefs.getBoolPref('.openinnewtab');
  if (!bkmkNewTab)
    openUILink(url,event,false,true);
  else{
    if (event.shiftKey==true)
      openUILinkIn(url,"tabshifted");
    else
      openUILinkIn(url,"tab");
  }
}
function openInTabs(event){
  openBookmarksIn(event,"tab"+(event.shiftKey?"shifted":""));
}
function removeLabelFromBookmark(){
  var tree=document.popupNode;
  if (tree.tagName!="tree") tree = tree.parentNode;
  var visibleData=getTreeView(tree).data;
  var index=pops.getBookmarkIndex();
  var label=getTreeView(tree).getParentLabel(index);//visibleData[parent].fullTitle
  //dump("remove "+label+" label from bookmark\n");
  if(label!=null && label.length>0)
    GMS.removeLabelFromBookmark(visibleData[index],label,true);
}
function renameLabel(label, newLabel,refresh,event,children){
  var first=!label?true:false;
  if (!children) children=new Array();
  if (!label){
    var tree=document.popupNode;
    if (tree.tagName!="tree") tree = tree.parentNode;
    var visibleData=getTreeView(tree).data;
    label=visibleData[pops.getLabelIndex(event)];
  }
  newLabel = newLabel ? newLabel : prompt(strbundle.getString("renameLabel"),label.fullTitle);
  if (!newLabel || newLabel=="") return;

  var data=label.data;

  for (var i=0;i<data.length;i++){
    if (data[i].type==0){
      if (i==data.length-1 && refresh==null) refresh=true;
      renameLabel(data[i],newLabel+nestedChar+data[i].title,refresh==true,event,children);
    }
    else if (data[i].type==null){
      children.push({bkmk: data[i], oldlbl: label.fullTitle, newlbl: newLabel});
    }
  }
  if (refresh==null) refresh=true;
  GMS.onRenameLabel(label.fullTitle,newLabel,refresh==true);
  GMS.actionHist.pop();
  if (first){
    /* Create a bookmark action so it can be undone */
    GMS.generateBkmkAction("label","rename", children);
  }
}
function removeLabel(label, refresh,event,children,first){
  first=first==true||!label?true:false;
  if (!children) children=new Array();
  if (!label){
    var tree=document.popupNode;
    if (tree.tagName!="tree") tree = tree.parentNode;
    var visibleData=getTreeView(tree).data;
    label=visibleData[pops.getLabelIndex(event)];
    if (GMS.confirmDelete && !confirm(strbundle.getString("removeLabel")
        +" \""+label.fullTitle+"\"?"))
      return;
  }

  var data=label.data;
  var removed=false;
  for (var i=0;i<data.length;i++){
    if (data[i].type==0){
      if (i==data.length-1 && refresh==null) refresh=true;
      removeLabel(data[i],refresh==true);
    }
    else if (data[i].type==null){
      children.push({bkmk: data[i],label: label.fullTitle});
    }
  }
  if (refresh==null) refresh=true;
  GMS.onRemoveLabel(label.fullTitle,refresh,false);
  GMS.actionHist.pop()
  if (first){
    /* Create a bookmark action so it can be undone */
    GMS.generateBkmkAction("label","delete", children);
  }
}
function removeLabelAndBookmarks(label, refresh,event,children){
  if (!label){
    var tree=document.popupNode;
    if (tree.tagName!="tree") tree = tree.parentNode;
    var visibleData=getTreeView(tree).data;
    label=visibleData[pops.getLabelIndex(event)];
    if (GMS.confirmDelete && !confirm(strbundle.getString("removeLabel")
        +" \""+label.fullTitle+"\"?"))
      return;
  }
  var data=label.data;
  removeData(data,refresh,children, true);
}
function removeBookmarks(event){
  var tree=event.target.tagName=="tree"?event.target:document.popupNode.tagName=="tree"?document.popupNode:document.popupNode.parentNode;
  var view=getTreeView(tree);
  var selected=view.selectedData;
  var actionLength_Start=GMS.actionHist.length;
  var offset=0;
  for (var i=0;i<selected.length;i++){
    var sel=selected[i]+offset,startRows=view.rowCount;
    //dump("remove: "+view.data[sel].title+"\n");
    container=view.isContainer(sel);
    if (!container){
      GMS.onRemoveBookmark(view.data[sel],i==selected.length-1,i==0);
    }
    else{
      removeLabel(view.data[sel],i==selected.length-1?null:false,null,null,true);
    }
    offset+=view.rowCount-startRows;
  }
  var actionLength_End=GMS.actionHist.length;
  var actions=GMS.actionHist.slice(actionLength_Start,actionLength_End);
  GMS.generateBkmkAction("all","complex action",actions);
  view.selection.clearSelection();
}
function removeData(data,refresh,children,aIsFirst){
  if (!children) children=new Array();
  var first = aIsFirst || children.length==0;
  for (var i=0;i<data.length;i++){
    if (data[i].type==0){//Label
      if (i==data.length-1 && refresh==null) refresh=true;
      removeData(data[i].data,refresh==true,children);
    }
    else if (data[i].type==null){
      if (i==data.length-1){
        if (refresh==null) refresh=true;
      }
      else if (refresh==true) refresh=null;
      children.push(data[i]);
      GMS.onRemoveBookmark(data[i],refresh==true,false);
      GMS.actionHist.pop();
    }
  }
  if (first){
    /* Create a bookmark action so it can be undone */
    GMS.generateBkmkAction("label","deletebkmks", children);
  }
}
//Adds a label to a group of bookmarks via drag & drag
function addLabelFromDaD(bkmks, lbl,refresh,children){
  var first=refresh==null?true:false;
  if (!children) children=new Array();
  for (var i=0;i<bkmks.length;i++){
    if (bkmks[i].type==0){
      if (i==bkmks.length-1 && refresh==null) refresh=true;
      addLabelFromDaD(bkmks[i].data,lbl,refresh==true,children);
    }
    else{
      if (refresh==null) refresh=true;
      //dump("GMS.addLabel: "+lbl+" | "+bkmks[i].url+"\n");
      children.push(bkmks[i]);
      GMS.addLabelToBookmark(bkmks[i],lbl,i==bkmks.length-1 && refresh==true);
      GMS.actionHist.pop();/* Remove single history */
    }
  }
  if (first){
    /* Create a bookmark action so it can be undone */
    GMS.generateBkmkAction("label","add", children,lbl);
  }
}

var pops={
  getIndex: function(x,y,tree){
    var row = {}, col = {}, obj = {};
    tree.treeBoxObject.getCellAt(x, y, row, col, obj);

    return row.value;
  },
  getEventIndex:  function(event){
    return this.getIndex(event.clientX,event.clientY,event.target.parentNode);
  },
  getPopupIndex: function(id,event){
    var popup=document.getElementById(id);
    var x=popup.boxObject.x;
    var y=popup.boxObject.y;

    var tree=document.popupNode;
    if (tree.tagName!="tree") tree = tree.parentNode;
    var visibleData=getTreeView(tree).data;

    var index=this.getIndex(x,y,tree);
    if (index!=null && index>=0 && index<=visibleData.length)
      index=tree.currentIndex;
    else
      index=-1;

    return index;
  },
  getBookmarkIndex: function(event){
    return this.getPopupIndex("gm-contextPopup",event);
  },
  getLabelIndex: function(event){
    return this.getPopupIndex("gm-contextPopup",event);
  },
  getID: function(event){
    var tree=document.popupNode;
    if (tree.tagName!="tree") tree = tree.parentNode;
    var visibleData=getTreeView(tree).data;
    return visibleData[this.getBookmarkIndex(event)].id;
  },
  getURL: function(target){
    var tree=document.popupNode;
    if (tree.tagName!="tree") tree = tree.parentNode;
    ///dump("tree: "+target.tagName+" - "+tree.tagName+" - "+document.popupNode.tagName+"\n");
    var visibleData=getTreeView(tree).data;
    var idx=this.getBookmarkIndex();
    //dump("URL: " + visibleData[idx].url+" - "+idx+"\n");
    return visibleData[idx].url;
  },
  getLabels: function(event){//For bookmarks
    var tree=document.popupNode;
    if (tree.tagName!="tree") tree = tree.parentNode;
    var visibleData=getTreeView(tree).data;
    return visibleData[this.getBookmarkIndex(event)].url;
  },
  getNotes: function(event){
    var tree=document.popupNode;
    if (tree.tagName!="tree") tree = tree.parentNode;
    var visibleData=getTreeView(tree).data;
    return visibleData[this.getIBookmarkndex(event)].notes;
  },
  getBookmark: function(event){
    var tree=document.popupNode;
    if (tree.tagName!="tree") tree = tree.parentNode;
    var visibleData=getTreeView(tree).data;
    var vis=visibleData[pops.getBookmarkIndex()];
    var bm=GMS.createNewBookmark(vis.id,vis.url,vis.title,vis.labels,vis.notes);
    bm.mode=vis.mode;
    //dump("getBookmark: "+bm+"\n"+bm.url+'|'+bm.title+"|"+bm.id+"\n");
    return bm;
  },

  //For...lables....(the containers)...
  getLabel: function(event){
    var tree=document.popupNode;
    if (tree.tagName!="tree") tree = tree.parentNode;
    var visibleData=getTreeView(tree).data;
    var lbl=visibleData[this.getLabelIndex(event)].fullTitle;
    if (lbl==GMS.unlabeled) lbl="";
    return lbl;
  }
}

function doSearch(){
  var search=searchBox.value;
  if (search.length==0){
    //Normal view
    if (treeView){
      treeView.treeBox.beginUpdateBatch();
      if (treeView.type=="complete"){
        treeView.data=getVisibleData("complete",treeView);
      }
      else{
        treeView.data=getTreeData(treeView.parentLbl,true,treeView.type);
      }
      treeView.restoreContainers();
      treeView.treeBox.endUpdateBatch();
    }
  }
  else {
    treeView.saveOpened();
    GMS.getSiteSearch(search,"quickrefresh",true);
  }

}

function updateNotes(){
  if (searchBox.value.length==0)
    treeView.data=updateChildNotes(treeView.data);
  else{
    for (var i=0;i<GMS.searchArray.length;i++){
      treeView.data[i].notes=GMS.searchArray[i].notes;
      if (GMS.searchArray[i].notes.length>0){
        var bkmk=GMS.searchArray[i];
      }
    }
    treeView.treeBox.invalidate();
  }
}

function updateChildNotes(vData){
  for (var v=0;v<vData.length;v++){
    if (vData[v].type > 0 || vData[v].type==null){
      var index=GMS.isBookmarked(vData[v].url);
      vData[v].notes=GMS.bookmarkArray[index].notes;
    }
    else if (vData[v].type==0)
      vData[v].data=updateChildNotes(vData[v].data);
  }
  return vData;
}

function treeInit() {
  var tree = document.getElementById("gmarkList");
  if (tree){
    tree.setAttribute("hidden","false");
    treeView=new GMarksTreeView("complete");
    tree.view = treeView;
    tree.selType="single";
  }
}
function doSidebarUnload(){
  if (gmarksObserver!=null) gmarksObserver.unregister();
  if (treeView!=null)
    treeView.saveOpened();
}
function doOrganizeUnload(){
  if (gmarksObserver!=null) gmarksObserver.unregister();
}

function doSidebarLoad(){
  GMS=Components.classes["@mozilla.org/gmarks;1"]
    .getService(Components.interfaces.nsIGMarksService).wrappedJSObject;
  strbundle=document.getElementById("gmarksBundle");
  document.getElementById('addGMark').setAttribute('hidden',!prefs.getBoolPref('.showAddBookmark'));

  searchBox=document.getElementById('txtSearch');
  searchBox.focus();
  gmarksObserver=new GmarksObserverControl();
  //GMS.isSignedIn=GMS.checkSignedCookie();
  if (GMS.bookmarkArray.length>0)
    GM.onLoad();
  else if (!GMS.isSignedIn){
    var container=document.getElementById("signedOffContainer");
    container.setAttribute("hidden","false");
    var pass=GMS.getPassInfo();
    if (pass){
      document.getElementById("txtEmail").value=pass.user;
      document.getElementById("txtPassword").value=pass.password;
    }
    document.getElementById("autosignin").checked=prefs.getBoolPref(".signin");
    document.getElementById("gmarkList").setAttribute('hidden','true');
  }
  else{
    if (GMS.loading){
      document.getElementById("loadingContainer").setAttribute("hidden","false");
      if (treeView){
        treeView.treeBox.beginUpdateBatch();
        treeView.loading=true;
        treeView.treeBox.endUpdateBatch();
      }
    }
  }
  
}
function doOrganizeLoad(){
  GMS=Components.classes["@mozilla.org/gmarks;1"]
                     .getService(Components.interfaces.nsIGMarksService).wrappedJSObject;
  strbundle=document.getElementById("gmarksBundle");
  searchBox=document.getElementById('txtSearch');
  searchBox.focus();
  if (!gmarksObserver)
    gmarksObserver=new GmarksObserverControl();
  //dump("created organize observer\n");
  GMS.isSignedIn=GMS.checkSignedCookie();
  if (GMS.bookmarkArray.length>0){
    var treeLabels = document.getElementById("gmarkLabels");
    lblsTreeView=new GMarksTreeView("labels");
    treeLabels.view = lblsTreeView;
    treeLabels.selType="multiple";
    lblsTreeView.selection.select(0);
    var treeDetails = document.getElementById("gmarkDetails");
    if (lblsTreeView.data.length>0)
      treeView=new GMarksTreeView("details",lblsTreeView.data[0].fullTitle);
    else
      treeView=new GMarksTreeView("details","");
    treeDetails.view = treeView;
    treeView.openAll();
    treeDetails.selType="multiple";
    editField=document.getElementById("editableTxt");
    if (treeLabels.getAttribute("width")<100)
      treeLabels.setAttribute("height",100);
    document.getElementById("nameCol").setAttribute(
            "sortDirection","ascending");
    //dump("count: "+treeView.rowCount+"\n");
  }
}

function debug(msg){
  //var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
    //    .getService(Components.interfaces.nsIConsoleService);
    //consoleService.logStringMessage(msg);
}
