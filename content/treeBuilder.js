var nestedChar;
var treeData=null;
var foundMinimal=false;
var bkmkCombos=false;
var unlabeledLbl=null;
var nestCount=0;
function Separator(){
  this.title=null;
  this.type=-1;
  this.freq=-1;
  this.level=0;
}
function GMarks_LabelData(label,children, bkmk){
  this.title=label;
  this.type=0
  this.open=false;
  this.date=0;
  this.freq=0;
  this.level=0;
  this.nestedChildren=0;
  this.fullTitle=label;
  if (bkmkCombos && bkmk){
    this.bkmk=bkmk;
    this.date=bkmk.date;
  }
  children=children!=null ? children: true;
  if (children)
    this.data=GMS.getBookmarksByLabel(label);
  else
    this.data=new Array();

  for (var i=0;i<this.data.length;i++){
    if (this.data[i].date>this.date) this.date=this.data[i].date;
    if (this.data[i].freq>this.freq) this.freq=this.data[i].freq;
  }
}

function BookmarkData(type,bkmk, level){
  this.type=type;
  this.level=level? level : type-1;
  this.bkmk=bkmk;
}
BookmarkData.prototype={
  get image(){
    return this.bkmk.image;
  },
  set image(img){
    this.bkmk.image=img;
  },
  get date(){
    return this.bkmk.date;
  },
  set date(newDate){
    this.bkmk.date=newDate;
  },
  get freq(){
    return this.bkmk.freq;
  },
  set freq(newfreq){
    this.bkmk.freq=newfreq;
  },
  get notes(){
    return this.bkmk.notes;
  },
  set notes(newNotes){
    this.bkmk.notes=newNotes;
  },
  get labels(){
    return this.bkmk.labels;
  },
  set labels(lbls){
    this.bkmk.labels=lbls;
  },
  get url(){
    return this.bkmk.url;
  },
  set url(newURL){
    this.bkmk.url=newURL;
  },
  get id(){
    return this.bkmk.id;
  },
  set id(newId){
    this.bkmk.id=newId;
  },
  get title(){
    return this.bkmk.title;
  },
  set title(newTitle){
    this.bkmk.title=newTitle;
  },
  get mode(){
    return this.bkmk.mode;
  },
  set mode(newMode){
    this.bkmk.mode=newMode;
  }
}
function getVisibleData(type,view){
  var treeData=getTreeData("",false,type);
  if (type=="complete"){
    if (!view) view=treeView;
    view.extras=0;
    if (GMS.recent.length>0 && GMS.showRecent){
      view.extras++;
      var recent=new GMarks_LabelData(GMS.strbundle.GetStringFromName("mostrecent"),false);
      for (var i=0;i<GMS.recent.length;i++){
        recent.data.push(new BookmarkData(2,GMS.recent[i]));
      }
      treeData.splice(view.extras-1,0,recent);
    }
    if (GMS.frequent.length>0 && GMS.showFreq){
      view.extras++;
      var frequent=new GMarks_LabelData(GMS.strbundle.GetStringFromName("mostused"),false);
      for (var i=0;i<GMS.frequent.length;i++){
        frequent.data.push(new BookmarkData(2,GMS.frequent[i]));
      }
      treeData.splice(view.extras-1,0,frequent);
    }
    if (view.extras>0){
      view.extras++;//For the separator
      treeData.splice(view.extras-1,0,new Separator());
    }
  }
  return treeData;
}

function getTreeData(aLbl,minimal,type){
  var start=new Date();
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].
            getService(Components.interfaces.nsIPrefService).getBranch("gmarks.");
  nestedChar=prefs.getCharPref("nestedChar");
  bkmkCombos=prefs.getBoolPref("bkmkLabelCombos");

  var lbls=aLbl.split(/\s*,\s*/);
  var sepFolders=lbls.length!=1;
  treeData=new Array();
  for (var i=0;i<lbls.length;i++){
    var lbl=lbls[i];
    var curTreeData=getLabelsData(lbl,type);
    if (minimal && lbl.length>0){
      foundMinimal=false;
      curTreeData=getMinimalTree(lbl,curTreeData);
    }
    if (!curTreeData) curTreeData=new Array();
    if (GMS.sortBy=="date"){
      sortTreeByDate(curTreeData);
    }
    else if (GMS.sortBy=="freq"){
      sortTreeByFreq(curTreeData);
    }
    var end=new Date();
    var total=(end.getTime()-start.getTime());
    if (lbl==null || lbl.length==0){
      var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                   .getService(Components.interfaces.nsIConsoleService);
      var ext=GMS.mode=="google"?"GMarks":"Smarky";
      //consoleService.logStringMessage(ext+" - total time: "+total);
    }
    if (sepFolders){
      var treeLabel=new GMarks_LabelData(lbl,false);
      treeLabel.data=curTreeData;
      treeData.push(treeLabel);
    }
    else
      treeData=curTreeData;
  }
  if (!treeData) treeData=new Array();
  return treeData;
}
function sortTreeByDate(data){
  data.sort(function (x, y){
    if ((x.type!=null && x.type==0) && (y.type==null || y.type!=0)){
      return -1;
    }
    else if ((y.type!=null && y.type==0) && (x.type==null || x.type!=0)){
      return 1;
    }
    else if (x.date < y.date)
      return 1;
    else if (x.date > y.date)
      return -1;
    return 0;
  });
  for (var i=0;i<data.length;i++){
    var item=data[i];
    if (item.type!=null && item.type==0){
      sortTreeByDate(item.data);
    }
  }
}
function sortTreeByFreq(data){
  data.sort(function (x, y){
    if ((x.type!=null && x.type==0) && (y.type==null || y.type!=0)){
      return -1;
    }
    else if ((y.type!=null && y.type==0) && (x.type==null || x.type!=0)){
      return 1;
    }
    else if (x.freq < y.freq)
      return 1;
    else if (x.freq > y.freq)
      return -1;
    else{
      if (x.title.toUpperCase() > y.title.toUpperCase())
        return 1;
      else if (x.title.toUpperCase() < y.title.toUpperCase())
        return -1;
    }
    return 0;
  });
  for (var i=0;i<data.length;i++){
    var item=data[i];
    if (item.type!=null && item.type==0){
      sortTreeByFreq(item.data);
    }
  }
}
function getMinimalTree(lbl,ret){
  for (var i=0;i<ret.length && !foundMinimal;i++){
    if (ret[i].fullTitle==lbl){
      //treeData=ret[i].data;
      foundMinimal=true;
      return ret[i].data;
    }
    else if (ret[i].type==0){
      return getMinimalTree(lbl,ret[i].data);
    }
  }
}

function mergeNodes(lblmain,lblnew){
  if (lblnew.date > lblmain.date)
  {
    lblmain.date=lblnew.date;
  }
  if (lblnew.freq > lblmain.freq && lblnew.freq>0)
  {
    lblmain.freq=lblnew.freq;
  }
}

function getLabelsData(parentlbl,type) {
  var i, j;
  var ret = new Array();
  var combo=bkmkCombos && parentlbl.length==0 && type=="complete";
  nestCount=0;
  var tmpLbl=(GMS.unlabeled.length==0?((type=="labels" || type=="details")?"Unlabeled":""):GMS.unlabeled);
  if (!(((parentlbl.length==0 && tmpLbl.length>0) || (parentlbl.length!=0 && tmpLbl==parentlbl)))){
    tmpLbl=null;
  }
  for (i=0; i < GMS.bookmarkArray.length; i++) {
    for (j=0; j < GMS.bookmarkArray[i].labels.length; j++){
      var lbl=GMS.bookmarkArray[i].labels[j];
      if (canAdd(lbl,parentlbl,type,ret)){
        addORUpdateLabel(ret,lbl,GMS.bookmarkArray[i],combo);
      }
    }
    if (GMS.bookmarkArray[i].labels.length==0){
      if (tmpLbl){
        unlabeldLbl=addORUpdateLabel(ret,tmpLbl,GMS.bookmarkArray[i]);
      }
      else if (parentlbl.length==0 && GMS.unlabeled.length==0 && type!="labels"){
        ret.splice(ret.length,0,new BookmarkData(1,GMS.bookmarkArray[i]))
      }
    }
  }
  return ret;
}
function addORUpdateLabel(arr, label, bkmk, combo, previous,level) {
  if (level==null) level=0;
  var index;
  var pos=label.indexOf(nestedChar);
  var front;
  var fullLabel;
  if(pos>-1){
    front=label.substring(0,pos);
    label=label.substring(pos+nestedChar.length);
    index=locateLabel({title: front, type: 0},arr);
  }
  else{
    front=label;
    index = locateLabel({title: label, type: 0},arr);
  }
  var lbldata;
  if (level==0)
    fullLabel=front;
  else
    fullLabel=previous+nestedChar+front;
  if (index>=0){//Update?
    lbldata=arr[index];
  }
  else if (index<0){//Add
    index=-(index+1);

    lbldata=new GMarks_LabelData(fullLabel,false);
    lbldata.level=level;
    if (pos>-1)
      lbldata.title=front
    else
      lbldata.title=label;
    arr.splice(index,0,lbldata);
  }
  if (pos<=0){
    if (bkmk){
      if (combo && bkmk.title==lbldata.title)
        lbldata.bkmk=bkmk;
      else
        lbldata.data.push(bkmk);
      mergeNodes(lbldata,bkmk);
    }
  }
  else{
    var child=addORUpdateLabel(lbldata.data,label, bkmk, combo,fullLabel,level+1);
    mergeNodes(lbldata,child);
  }
  return lbldata;
}
function isHidden(label1, mainLbl){
  if (label1==mainLbl) return false;
  if (mainLbl.length>0 && mainLbl+nestedChar==label1.substring(0,mainLbl.length+nestedChar.length))
    return false;
  if (GMS.hidden.length>0){
    if (GMS.hidden.indexOf(label1)>-1)
      return true;
    for (var i=0;i<GMS.hidden.length;i++){
      if (GMS.hidden[i].length>0)
        if (GMS.hidden[i]+nestedChar==label1.substring(0,GMS.hidden[i].length+nestedChar.length) &&
            true)
          return true;
    }
  }
  return false;
}
function canAdd(lbl, parentlbl, type, currentlbls){
  if (lbl==null) return false;
  if (!(parentlbl.length==0 || (parentlbl==lbl
      || parentlbl+nestedChar==lbl.substring(0,parentlbl.length+nestedChar.length)))){
    return false;
  }
  //if (hasLabelData(currentlbls,lbl)) return false;
  if (isHidden(lbl,parentlbl)) return false
  return true;
}

function locateLabel(value, a) {
  var low = 0;
  var high = a.length-1;
  if (high==-1) return -1;
  var mid=0;
  var midVal;
  var pos=value.title.indexOf(nestedChar);
  var shortval=null;
  var shortmid=null;
  var compare=0;
  var vType=value.type;
  value=value.title.toLowerCase();
  if (pos>0){
    shortval=value.substring(0,pos);
  }
  while (low <= high) {
    mid = Math.floor(low + ((high - low) / 2));
    midVal=a[mid].title
    pos=midVal.indexOf(nestedChar);
    midVal=midVal.toLowerCase();
    if (pos>0){
      shortmid=midVal.substring(0,pos);
    }
    else shortmid=null;
    compare=compareLabels(value, shortval, midVal, shortmid, vType, a[mid].type);
        if (compare<0)
          high = mid - 1
        else if (compare>0)
          low = mid + 1
      else{
          return mid;
      }
    }
    if (compare<0)
      return -mid-1;
  else
    return -mid-2;
}
function compareLabels(value, shortval, midvalue, shortmid, vType, mType){
  var compare=0;
  if (vType==mType){
    var tVal=shortval==null?value:shortval;
    var tMid=shortmid==null?midvalue:shortmid;
    if (tVal<tMid)
      compare=-1;
    else if (tVal>tMid)
      compare=1;
    if (compare==0 && (tMid!=null || tVal!=null)){
      if (value<midvalue)
        compare=-1;
      else if (value>midvalue)
        compare=1;
    }
  }
  else{
    if (vType==null || vType>0)
      return 1;
    else if (mType==null || mType>0)
      return -1;
  }
  return compare;
}