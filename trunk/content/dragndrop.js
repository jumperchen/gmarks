var treeDrag=false;
var dragSelection=null;
var dragSource;
var gmarksDragObserver = {
  getSupportedFlavours : function () {
    
    var flavours = new FlavourSet();
    
    flavours.appendFlavour("text/x-moz-url");
    /*
    flavours.appendFlavour("text/uri-list");
    flavours.appendFlavour("text/unicode");
    flavours.appendFlavour("application/x-moz-file");
    flavours.appendFlavour("text/html");
    flavours.appendFlavour("text/x-moz-place");
    */
    flavours.appendFlavour("application/x-moz-tabbrowser-tab");
    flavours.appendFlavour("text/x-moz-text-internal");
    
    return flavours;
  },
  /*
  canDrop: function(evt, session){
    dump("can drop?\n");
    return true;
  },
  */
  onDragOver: function (evt,flavour,session){
    if (evt.dataTransfer){
      this.flavour = flavour.contentType;
      this.data = evt.dataTransfer.getData(this.flavour);
      
      if (this.flavour == "application/x-moz-tabbrowser-tab"){
        this.data = evt.dataTransfer.mozGetDataAt("application/x-moz-tabbrowser-tab", 0);
      }
    }
  },
  onDragExit: function (evt, session){},
  onDrop: function (evt,transferData,session){
    treeDrag=false;
    var flavour=transferData.flavour.contentType;
    var data=transferData.data;
    var tree=evt.currentTarget;
    var index=pops.getEventIndex(evt);
    this.handleDrop(data,flavour,index,tree);
  },


  treeDrop: function(index,tree){
    this.handleDrop(this.data,this.flavour,index,tree);
  },
  handleDrop: function(data,flavour,index,tree){
    try{
    var label="";
    var view=getTreeView(tree);
    var visibleData=view.data;
    
    if (index != -1 && index<visibleData.length){
      if (view.isContainer(index))
        label=visibleData[index].fullTitle;
      else{
        label=view.getParentLabel(index);
      }
    }
    if (label==GMS.unlabeled ||
        label==GMS.strbundle.GetStringFromName("mostrecent") ||
        label==GMS.strbundle.GetStringFromName("mostused")){
      label="";
    }
    var url=null;
    var title=null;
    if (flavour=="text/x-moz-url" || flavour=="text/x-moz-text-internal"){
      data=data.toString().split('\n');
      if (data.length==1) data.push(data[0]);
      url=data[0];
      title=data[1];
    } else if (flavour == "application/x-moz-tabbrowser-tab"){
      var browser = data.parentNode.parentNode.parentNode.parentNode.getBrowserForTab(data);
      url = browser.currentURI.spec;
      title = data.getAttribute("label");
    }
    var bmIndex;
    var bm;
    if (false && (bmIndex=GMS.isBookmarked(url))){
      //Add Label to Bookmark
      bm=GMS.getBookmark(bmIndex);
      if (label != "") GMS.addLabelToBookmark(bm,label,true);
    }
    else{
      //Create new bookmark
      var labels=new Array();
      if (label!="") labels.push(label);
      bm=GMS.createNewBookmark(0,url,title,labels,"");
      GMS.updateBookmark(bm,true);
      /* Create a bookmark action so it can be undone */
      GMS.generateBkmkAction("bookmark","add",bm);
      GMS.sendUpdateBookmark(bm);
    }
    }catch(e){
      dump("eeee: "+e+"\n");
    }
  },

  onDragStart: function (evt , transferData, action){
    var data,type;
    transferData.data=new TransferData();
    var tree=evt.currentTarget;
    var visibleData=getTreeView(tree).data;
    var index=tree.currentIndex;
    if (tree.view.isContainer(index)){
      //Its a label
      type="text/gmarks-label";
    }
    else{
      //Its a bookmark
      type="text/gmarks-bookmark";
    }
    transferData.data.addDataForFlavour(type,visibleData[index]);
    if (type=="text/gmarks-bookmark"){
      var url=visibleData[index].url; var title=visibleData[index].title;
      var urlString = url + "\n" + title;
      var htmlString = "<a href=\"" + url + "\">" + title + "</a>";

      transferData.data = new TransferData();
      transferData.data.addDataForFlavour("text/x-moz-url", urlString);
      transferData.data.addDataForFlavour("text/unicode", url);
      transferData.data.addDataForFlavour("text/uri-list", url);
      transferData.data.addDataForFlavour("text/plain", url);
      transferData.data.addDataForFlavour("text/html", htmlString);
    }
    //transferData.data.addDataForFlavour("text/unicode",plainText);

  },
  onTreeDragGesture: function (evt) {
    treeDrag=true;
    var row = { }, col = { }, child = { };
    evt.currentTarget.treeBoxObject.getCellAt(evt.pageX, evt.pageY, row, col, child);
    // Make sure we are not dragging the scroll bar
    if (!col.value) {return;}
      keyEvent=evt;
    var tree=evt.target.parentNode;
    dragSelection=tree.view.selection;
    dragSource=getTreeView(tree);

    // "real" drag
    nsDragAndDrop.startDrag(evt,gmarksDragObserver);
    evt.stopPropagation();
  }
};
