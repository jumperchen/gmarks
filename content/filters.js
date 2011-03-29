var filters;

function Filter(query, action, del) {
    this.query=query;
    this.action = action;
}

Filter.prototype.getDisplayQuery = function(){
	var disp=this.query;
	return disp;
}
Filter.prototype.getDisplayAction = function(){
	var disp=this.action;
	if (disp){
		var result=disp.match(/addLbls\((.+?)\)/);
		if (result){
			var lbls=result[1].split(",");
			if (lbls.length>1){
				disp=disp.replace('addLbls('+result[1]+')','Add Labels "'+lbls.join(",")+'"');
			}
			else{//One label
				disp=disp.replace('addLbls('+result[1]+')','Add Label "'+result[1]+'"');
			}
		}
	}
	else
		disp="No action";
	return disp;
}

function matchesField(word,field){
	if (word==true || word=='true') return true; else if (word==false || word=='false') return false;
	if (word.search(/^-./)==0)//not including...
		return -matchesField(word.substring(1),field);
	else if (word=='*') return true;
	else if (field.indexOf(word.toLowerCase())==-1) return false;
	return true;
}
/*
function matchesField(word,field){
	if (word==true) return true; else if (word==false) return false;
	else if (word.search(/^-./)==0){//not including...
		word=word.substring(1);
		if (word=="true")
			return false;
		else if (word=="false")
			return true;
		else if (field.indexOf(word.substring(1))!=-1)
			return false;
	}
	else{//including...
		if (word=="false")
			return false;

		else if (((word!="true") && field.indexOf(word)==-1)  )
			return false;
	}
	return true;
}*/

function getQueryMatch(query, field){
	if (field==null || field.length==0) return false;

	//Separate parentheses...
	var p1,p2,p3,p4,p5;
	var middleString;
	if ((p1=query.indexOf("("))!=-1 && (p2=query.indexOf(")")) > p1+1){
	    p3=p1;
		do{
			middleString=query.substring(p1+1,p2);
			p4=query.substring(p3+1).indexOf("(");
	        if (p4!=-1) p3+=p4;
			p5=query.substring(p2+1).indexOf(")");
			if (p5!=-1) p2+=p5+1;
		} while ( !(p4==-1 || p5==-1) );
		var value=getQueryMatch(middleString,field);
		query=query.substring(0,p1)+value+query.substring(middleString.length+p1+2);
	}
	query=query.replace(/^\s*|\s*$/g,"");
	var words=query.split(/\s/g);
	if (query.indexOf('"')!=-1){
		//Treat things in "quotes" as one word
		var quote;
		var side=0;
		var start;
		var pos;
		for (var i=0;i<words.length;i++){
			if (side==0){
				if ((pos=words[i].indexOf('"'))!=-1 && pos<words[i].length-1){
					side=1;
					start=i;
					if (pos==0)
						quote=words[i].substring(pos+1);
					else
						quote=words[i].substring(0,pos)+words[i].substring(pos+1);
				}
			}
			else{
				if ((pos=words[i].indexOf('"'))!=-1){
					quote+=" "+words[i].substring(0,pos);
					words.splice(start,i,quote);
					side=0;
				}
				else
					quote+=" "+words[i];
			}
		}
	}

	//Check for OR cases.
	for (var i=1;i<words.length-1;i++){
		if (words[i]=="OR"){
			///////////////////////////EDIT HERE//////////////////////////
			value=matchesField(words[i-1],field) || matchesField(words[i+1],field);
			words.splice(i-1,3,value);
			i--;
		}
	}

	//Check for inclusion.
	for (var i=0;i<words.length;i++){
		if (!matchesField(words[i],field)){
			return false;
		}
	}
	return true;
}
////query=getQueryMatch(middleString,field)+query.substring(middleString.length);
function doMatch(query,field){
	if ((query.match(/^\/(.+)\/$/))){
		var q=new RegExp(q[1],'i');
		if (field.match(q)){
			return true;
		}
	}
	else{
		query=query.replace('true','True');
		query=query.replace('false','False');
		field=field.toLowerCase();
		return getQueryMatch(query,field);
	}
}

function doLabelMatch(query,field){
	if (typeof field=='string')
		field=field.split(',');
	if (query.toLowerCase()==GMS.unlabeled.toLowerCase() && field.length==0)
		return true;
	for (var i=0;i<field.length;i++){
		if (doMatch(query,field[i]))
			return true;
	}
	return false;
}

Filter.prototype.matches = function(bkmk){
	var matched=true;
	var q=this.query;
	if (q.length==0) return false;

	var qName=q.match(/inName\:\((.+?)\)/);
	if (qName) {q=q.replace("inName:("+qName[1]+")", ''); if (doMatch(qName[1], bkmk.title)==false) return false;}

	var qURL=q.match(/inURL\:\((.+?)\)/);
	if (qURL) {q=q.replace("inURL:("+qURL[1]+")", ''); if (doMatch(qURL[1], bkmk.url)==false) return false;}

	var qLabels=q.match(/inLabels\:\((.+?)\)/);
	if (qLabels) {q=q.replace("inLabels:("+qLabels[1]+")",''); if (doLabelMatch(qLabels[1], bkmk.labels)==false) return false;}

	var qNotes=q.match(/inNotes\:\((.+?)\)/);
	if (qNotes) {q=q.replace("inNotes:("+qNotes[1]+")",''); if (doMatch(qNotes[1], bkmk.notes)==false) return false;}

	q=q.replace(/^\s*|\s*$/g,"");
	if (q.length>0) {
		var combinedBM="";
		for (var prop in bkmk){
			if (prop != 'date' && prop!='image'){
				combinedBM+=bkmk[prop]+" ";
			}
		}
		matched=doMatch(q,combinedBM);
	}

	return matched;
}
/* What should it do?
 * ------------------
 * phrase = something in () ie: (this and that) ...treated as a word.
 * phrase2 = something in "" ie: "this and that" ...treated as a word
 * remove = -, ie -word, if its found, it will be removed. also works on -(phrase).
 * replace = -<n,x> n=word to replace, x=word to replace with.
 * begin with ++ to add to the end of the field
 * anything else is just added to the end
 */
function combineString(words,chr1,chr2,hide){
	//Treat things in "quotes" as one word
	hide=hide == null ? 1 : hide;
	var quote;
	var side=0;
	var start;
	var pos1,pos2;
	for (var i=0;i<words.length;i++){
		pos1=-1;
		if (side==0){
			if ((pos1=words[i].indexOf(chr1))!=-1 && pos1<words[i].length-1){
				side=1;
				start=i;
				if (pos1==0)
					quote=words[i].substring(pos1+hide);//+1
				else
					quote=words[i].substring(0,pos1+1-hide)+words[i].substring(pos1+1);
			}
		}
		if (side==1){
			if (pos1==-1) pos2=words[i].indexOf(chr2); else pos2=words[i].substring(pos1+1).indexOf(chr2);
			if (pos2!=-1){
				if (pos1!=-1){//found in the same word
					quote=words[i].substring(0,pos1+1-hide)+words[i].substring(pos1+1,pos2+1-hide);
					words.splice(start,1,quote);
				}
				else{
					quote+=" "+words[i].substring(0,pos2+1-hide);
					words.splice(start,i,quote);
				}
				side=0;
			}
			else
				if (pos1==-1) quote+=" "+words[i];
		}
	}
        return words;
}

function doLabelAction(action,bkmk){
	bkmk.newLabels=bkmk.newLabels ? bkmk.newLabels : new Array();
	var tLbls=action.split(/,\s*/);
	for (var i=0;i<tLbls.length;i++){
		var lbl=tLbls[i];
		if (lbl.substring(0,1)=="-"){
			lbl=lbl.substring(1);
			for (var j=0;j<bkmk.labels.length;j++){
				if (lbl==bkmk.labels[j]){
					bkmk.labels.splice(j,1);
					//break;
					j=bkmk.labels.length;
				}
			}
			for (var j=0;j<bkmk.newLabels.length;j++){
				if (lbl==bkmk.newLabels[j]){
					bkmk.newLabels.splice(j,1);
					j=bkmk.newLabels.length;
				}
			}
		}
		else{
			var hasLabel=false;

			for (var j=0;j<bkmk.labels.length;j++){
				if (lbl==bkmk.labels[j]){
					hasLabel=true;
					j=bkmk.labels.length;
				}
			}
			for (var j=0;j<bkmk.newLabels.length && !hasLabel;j++){
				if (lbl==bkmk.newLabels[j]){
					hasLabel=true;
					j=bkmk.newLabels.length;
				}
			}
			if (!hasLabel) bkmk.newLabels.push(lbl);

		}
	}
	return bkmk;
}
/* What should it do?
 * ------------------
 * phrase = something in () ie: (this and that) ...treated as a word.
 * phrase2 = something in "" ie: "this and that" ...treated as a word
 * remove = -, ie -word, if its found, it will be removed. also works on -(phrase).
 * replace = -<n,x> n=word to replace, x=word to replace with.
 * begin with ++ to add to the begining of the field
 * anything else is just added to the end
 */

function doAction(action,field){
	var a=action;//a=action...less typing
	if (field.length>0)
		if (action.substring(0,2)=='++')
			field=action.substring(2)+" "+field;
		else
			field+=" "+action;
	else
		field=action;
	return field;
}

 /*
var a="ha ha -<this,blah da> ghgash"; var words=a.split(/\s+/g); print(words); words=combineString(words,'<','>',0); print(words);*/
/*
if (aLbls) action+='addLbls('+aLbls+') ';
if (aURL) action+='toURL('+aURL+') ';
if (aName) action+='toName('+aName+') ';
if (aNotes) action+='toNotes('+aNotes+') ';
 */

Filter.prototype.applyFilter = function(bkmk){
	var a=this.action;
	var aLbls=a.match(/addLbls\((.+?)\)/);
	if (aLbls){
		bkmk=doLabelAction(aLbls[1],bkmk);//Labels are differnet then all the other ones;
		a=a.replace("addLbls("+aLbls[1]+")", '');
	}

	var aURL=a.match(/toURL\((.+?)\)/);
	if (aURL){
		bkmk.url=doAction(aURL[1],bkmk.url);
		a=a.replace("toURL("+aURL[1]+")", '');
	}

	var aName=a.match(/toName\((.+?)\)/);
	if (aName){
		bkmk.title=doAction(aName[1],bkmk.title);
		a=a.replace("toName("+aName[1]+")",'');
	}

	var aNotes=a.match(/toNotes\((.+?)\)/);
	if (aNotes){
		bkmk.notes=doAction(aNotes[1],bkmk.notes);
		a=a.replace("toNotes("+aNotes[1]+")",'');
	}
	return bkmk;
}

function loadFilters(){
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("gmarks.filters.");

	filters=new Array();
	//                          filterList
	if (prefs.prefHasUserValue("filterList")){
		var filterString = prefs.getCharPref("filterList");
		var filterList=filterString.split(".NEXT.");

		for (var i=0;i<filterList.length;i++){
			if (filterList[i].length>5){
				var curFilterA=filterList[i].split(".SEP.");
				filters.push(new Filter(curFilterA[0],curFilterA[1]));
			}
		}
	}
}

function saveFilters(){
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                            getService(Components.interfaces.nsIPrefService).getBranch("gmarks.filters.");

	var filterString="";
	for (var i=0;i<filters.length;i++){
		if (filters[i].query!=null && filters[i].action!=null){
			filterString+=filters[i].query+".SEP."+filters[i].action;
			if (i!=filters.length-1)
				filterString+=".NEXT.";
		}
	}
	prefs.setCharPref("filterList",filterString);
}