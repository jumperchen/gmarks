var bkmkID,gArg=null;

//docTitle, theUrl,labels,notes,bookmarkArray.getLabels()
//title, url, labels, notes, newLabels, mode
function doLoad(){
	var bkmk=GMS.createNewBookmark();
	bkmk.title=window.arguments[0];
	bkmk.url=window.arguments[1];
	bkmk.labels=window.arguments[2];
	bkmk.notes=window.arguments[3];
	bkmk.id=window.arguments[4];
	bkmkID=bkmk.id;
	if (window.arguments[5]!=null)
		bkmk.mode=window.arguments[5];
	originalBkmk=bkmk;
	var grid=document.getElementById("gmarksgrid");
	var addedit=window.arguments[6]?0:1;
	gmarksAddEditLoad(grid);
	gmarksAddEditBookmark(grid,addedit,bkmk.url,
		bkmk.title,bkmk.labels,bkmk.notes,bkmk.mode);
}

function doOK()
{
	if (!cancelExit){
		return gmarksSaveBookmark(bkmkID);
	}
	else{
		cancelExit=false;
		return false;
	}
}

function doCancel()
{
	return true;
}